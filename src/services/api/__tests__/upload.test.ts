// @vitest-environment jsdom
/*============================================================================*\
  upload.test.ts — อัปโหลดรูปจริงผ่าน signed URL (โหมด live) แทนการส่ง data URL
  ────────────────────────────────────────────────────────────────────────────
  stub fetch แทน backend + Supabase Storage — จับทุกคำขอแล้วตรวจลำดับ/path/body
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Call = { method: string; url: string; body: unknown; headers: Record<string, string> }
let calls: Call[] = []
/** คืน { status, json } — ไม่คืน = 200 {} */
let responder: (call: Call) => { status?: number; json?: unknown } | undefined = () => undefined

const USER = { id: 'u1', username: 'mint', email: 'm@x.io', level: 2, exp: 150, coins: 30, streak: 1, knowledgeStack: 60, emotionStack: 0, healthStack: 0, mbtiType: 'INTJ', currentRiskLevel: 'LOW', theme: 'SYSTEM', avatarUrl: null }
const PHOTO_A = 'data:image/jpeg;base64,' + btoa('photo-a')
const PHOTO_B = 'data:image/jpeg;base64,' + btoa('photo-b')
const SIGNED = 'https://storage.test/upload/sign/'

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const raw = init.body
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw
    const call: Call = { method: init.method ?? 'GET', url, body, headers: (init.headers ?? {}) as Record<string, string> }
    calls.push(call)
    const res = responder(call) ?? {}
    const status = res.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(res.json ?? {}), { status })
  }))
}

/** backend: ออก signed URL ต่อรูป · storage: PUT ผ่าน · ที่เหลือคืนผู้ใช้/log */
function defaultResponder(call: Call): { status?: number; json?: unknown } | undefined {
  const m = /\/quests\/logs\/([^/]+)\/photo-upload-url$/.exec(call.url)
  if (m) {
    const n = calls.filter((c) => c.url.endsWith('/photo-upload-url')).length
    return { json: { signedUrl: `${SIGNED}${m[1]}/${n}.jpg?token=t`, path: `quest-photos/u1/${m[1]}/${n}.jpg` } }
  }
  if (call.url.startsWith(SIGNED)) return { json: { Key: 'ok' } }
  if (call.url === '/api/users/me/avatar-upload-url') {
    return { json: { signedUrl: `${SIGNED}avatar.png?token=t`, path: 'avatars/u1/a.png', publicUrl: 'https://cdn.test/avatars/u1/a.png' } }
  }
  if (call.url === '/api/users/me' && call.method === 'PATCH') return { json: { ...USER, ...(call.body as object) } }
  if (call.url === '/api/users/me') return { json: USER }
  if (call.url === '/api/quest-logs/complete') {
    return { json: { log: { id: 'l1', status: 'COMPLETED', quest: { code: 'phys-hydration-drop', category: 'HEALTH' } }, user: USER } }
  }
  return undefined
}

describe('อัปโหลดรูป — โหมด live', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubEnv('VITE_API_BASE_URL', '/api')
    calls = []
    responder = defaultResponder
    stubFetch()
    window.localStorage.setItem('bloom:auth-token', 'tkn')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('เควสน้ำพุ (2 รูป): ขอ signed URL ด้วย logId เดียวกัน → PUT image/jpeg → complete ส่ง photoPaths ไม่มี data URL', async () => {
    const upload = await import('../upload.api')
    const quest = await import('../quest.api')
    const photoPayload = await upload.prepareQuestPhotos('phys-hydration-drop', [PHOTO_A, PHOTO_B])
    await quest.completeQuest({ questCode: 'phys-hydration-drop', payload: { status: 'COMPLETED', steps: 1, ...photoPayload } })

    const signCalls = calls.filter((c) => c.url.endsWith('/photo-upload-url'))
    expect(signCalls).toHaveLength(2)
    expect(signCalls.every((c) => c.method === 'POST' && (c.body as { fileExt: string }).fileExt === 'jpg')).toBe(true)
    const logIds = new Set(signCalls.map((c) => /\/quests\/logs\/([^/]+)\//.exec(c.url)![1]))
    expect(logIds.size).toBe(1)
    expect([...logIds][0]).toMatch(/^[0-9a-f-]{36}$/)

    const puts = calls.filter((c) => c.url.startsWith(SIGNED))
    expect(puts).toHaveLength(2)
    expect(puts.every((c) => c.method === 'PUT' && c.headers['Content-Type'] === 'image/jpeg' && c.body instanceof Blob)).toBe(true)
    expect(await (puts[0].body as Blob).text()).toBe('photo-a')

    const complete = calls.find((c) => c.url === '/api/quest-logs/complete')!
    const sent = (complete.body as { payload: Record<string, unknown> }).payload
    expect(sent.photoPaths).toEqual([expect.stringMatching(/1\.jpg$/), expect.stringMatching(/2\.jpg$/)])
    expect(JSON.stringify(complete.body)).not.toContain('data:')
    // อัปโหลดเสร็จก่อนเรียก complete
    expect(calls.indexOf(complete)).toBeGreaterThan(calls.indexOf(puts[1]))
  })

  it('PUT แบบ raw ไม่ผ่าน → ลองส่งซ้ำแบบ FormData (cacheControl + ไฟล์) แบบ supabase-js', async () => {
    responder = (c) => {
      if (c.url.startsWith(SIGNED) && !(c.body instanceof FormData)) return { status: 400, json: { error: 'bad' } }
      return defaultResponder(c)
    }
    const upload = await import('../upload.api')
    const res = await upload.prepareQuestPhotos('phys-sunlit-root', [PHOTO_A])
    expect(res.photoPaths).toHaveLength(1)
    const puts = calls.filter((c) => c.url.startsWith(SIGNED))
    expect(puts).toHaveLength(2)
    const form = puts[1].body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('cacheControl')).toBe('3600')
    expect(form.get('')).toBeInstanceOf(Blob)
  })

  it('อัปโหลดล้มเหลว → throw ข้อความภาษาไทย และไม่มีการเรียก complete', async () => {
    responder = (c) => (c.url.startsWith(SIGNED) ? { status: 500 } : defaultResponder(c))
    const upload = await import('../upload.api')
    await expect(upload.prepareQuestPhotos('phys-sunlit-root', [PHOTO_A])).rejects.toMatchObject({ userMessage: expect.stringContaining('อัปโหลดรูปไม่สำเร็จ') })
    expect(calls.some((c) => c.url === '/api/quest-logs/complete')).toBe(false)
  })

  it('จำนวนรูปไม่ตรง requiresPhotos → ไม่อัปโหลด · complete ที่ไม่มี photoPaths ครบ → ไม่ยิงเลย', async () => {
    const upload = await import('../upload.api')
    const quest = await import('../quest.api')
    await expect(upload.prepareQuestPhotos('phys-hydration-drop', [PHOTO_A])).rejects.toMatchObject({ status: 400 })
    await expect(quest.completeQuest({ questCode: 'phys-balanced-nutrients', payload: { photoPaths: [PHOTO_A] } })).rejects.toMatchObject({ status: 400 })
    await expect(quest.completeQuest({ questCode: 'phys-hydration-drop', payload: { photoPaths: ['p1'] } })).rejects.toMatchObject({ status: 400 })
    expect(calls).toHaveLength(0)
  })

  it('เควสที่ไม่ต้องใช้รูป → ไม่อัปโหลดอะไร', async () => {
    const upload = await import('../upload.api')
    expect(await upload.prepareQuestPhotos('phys-green-vision', [])).toEqual({})
    expect(calls).toHaveLength(0)
  })

  it('รูปโปรไฟล์: POST avatar-upload-url { fileExt } → PUT ไฟล์ → PATCH /users/me { avatarUrl: publicUrl }', async () => {
    const userApi = await import('../user.api')
    const file = new Blob(['img'], { type: 'image/png' })
    const user = await userApi.uploadAvatar(file)
    const sign = calls.find((c) => c.url === '/api/users/me/avatar-upload-url')!
    expect(sign.method).toBe('POST')
    expect(sign.body).toEqual({ fileExt: 'png' })
    const put = calls.find((c) => c.url.startsWith(SIGNED))!
    expect(put.method).toBe('PUT')
    expect(put.headers['Content-Type']).toBe('image/png')
    const patch = calls.find((c) => c.url === '/api/users/me' && c.method === 'PATCH')!
    expect(patch.body).toEqual({ avatarUrl: 'https://cdn.test/avatars/u1/a.png' })
    expect(calls.indexOf(patch)).toBeGreaterThan(calls.indexOf(put))
    expect(user.avatarUrl).toBe('https://cdn.test/avatars/u1/a.png')
  })

  it('รูปโปรไฟล์อัปโหลดไม่ผ่าน → throw และไม่ PATCH', async () => {
    responder = (c) => (c.url.startsWith(SIGNED) ? { status: 403 } : defaultResponder(c))
    const userApi = await import('../user.api')
    await expect(userApi.uploadAvatar(new Blob(['img'], { type: 'image/jpeg' }))).rejects.toMatchObject({ userMessage: expect.stringContaining('รูปโปรไฟล์') })
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false)
  })
})

describe('อัปโหลดรูป — โหมด mock ทำงานเหมือนเดิม', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'mock')
    calls = []
    responder = defaultResponder
    stubFetch()
    window.localStorage.clear()
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); window.localStorage.clear() })

  it('ไม่อัปโหลด ไม่เพิ่ม photoPaths และส่งเควสรูปถ่ายได้ตามปกติ', async () => {
    const upload = await import('../upload.api')
    const quest = await import('../quest.api')
    expect(await upload.prepareQuestPhotos('phys-hydration-drop', [PHOTO_A, PHOTO_B])).toEqual({})
    const res = await quest.completeQuest({ questCode: 'phys-hydration-drop', payload: { status: 'COMPLETED', steps: 1 } })
    expect(res.log.status).toBe('COMPLETED')
    expect(calls).toHaveLength(0)
  })
})

describe('dataUrlToBlob', () => {
  it('แปลง base64 data URL เป็น Blob ตาม type ที่กำหนด', async () => {
    const { dataUrlToBlob } = await import('../upload.api')
    const blob = dataUrlToBlob('data:image/png;base64,' + btoa('xyz'), 'image/jpeg')
    expect(blob.type).toBe('image/jpeg')
    expect(await blob.text()).toBe('xyz')
  })
})
