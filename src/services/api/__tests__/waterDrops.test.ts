// @vitest-environment jsdom
/*============================================================================*\
  waterDrops.test.ts — โหมด live: หยดน้ำมาจาก User.waterDrops ของเซิร์ฟเวอร์เท่านั้น
  (ไม่อ่าน/เขียนค่าในเครื่อง ไม่ส่งยอดหยดน้ำขึ้นไปใน PATCH /users/me)
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Call = { method: string; url: string; body: unknown }
let calls: Call[] = []

const USER = { id: 'u1', username: 'mint', email: 'm@x.io', level: 2, exp: 150, coins: 30, streak: 1, knowledgeStack: 0, emotionStack: 0, healthStack: 0, mbtiType: 'INTJ', currentRiskLevel: 'LOW', theme: 'SYSTEM', waterDrops: 12 }

describe('หยดน้ำ — โหมด live', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubEnv('VITE_API_BASE_URL', '/api')
    calls = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ method: init.method ?? 'GET', url, body })
      const data = init.method === 'PATCH' ? { ...USER, ...body } : USER
      return new Response(JSON.stringify(data), { status: 200 })
    }))
    window.localStorage.setItem('bloom:auth-token', 'tkn')
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); window.localStorage.clear() })

  it('toUserData อ่าน waterDrops จากเซิร์ฟเวอร์ ไม่ใช้ค่าเก่าที่ค้างในเครื่อง', async () => {
    window.localStorage.setItem('bloom:user-extras:u1', JSON.stringify({ waterDrops: 999 }))
    const { toUserData } = await import('../adapters')
    expect(toUserData({ id: 'u1', waterDrops: 7 }).waterDrops).toBe(7)
  })

  it('response ไม่มี waterDrops (select ย่อยตอนให้รางวัล) → ใช้ค่าเดิมในแคช', async () => {
    const { toUserData } = await import('../adapters')
    const prev = toUserData({ id: 'u1', waterDrops: 5 })
    expect(toUserData({ id: 'u1', coins: 40 }, prev).waterDrops).toBe(5)
  })

  it('GET /users/me → waterDrops ตามเซิร์ฟเวอร์', async () => {
    const userApi = await import('../user.api')
    expect((await userApi.getMe()).waterDrops).toBe(12)
  })

  it('updateProfile ไม่ส่ง waterDrops ขึ้นเซิร์ฟเวอร์ และไม่เก็บในเครื่อง — ยอดตามที่เซิร์ฟเวอร์คืน', async () => {
    const userApi = await import('../user.api')
    const user = await userApi.updateProfile({ username: 'mint2', waterDrops: 500 })
    const patch = calls.find((c) => c.method === 'PATCH')!
    expect(patch.body).toEqual({ username: 'mint2' })
    expect(user.waterDrops).toBe(12)
    expect(window.localStorage.getItem('bloom:user-extras:u1') ?? '').not.toContain('waterDrops')
  })

  it('patch มีแต่ waterDrops → ไม่ยิง PATCH เลย', async () => {
    const userApi = await import('../user.api')
    await userApi.updateProfile({ waterDrops: 500 })
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false)
  })
})
