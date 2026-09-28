// @vitest-environment jsdom
/*============================================================================*\
  liveContract.test.ts — ตรวจว่าโหมด live ยิง path/body ตรงกับ backend จริง (repo bloom-me-project
  branch feature-update: src/routes/*.ts + src/validation/*.schema.ts) และแปลง response ถูก
  ────────────────────────────────────────────────────────────────────────────
  stub fetch แทนเซิร์ฟเวอร์ — จับคำขอที่ยิงออกไปแล้วตอบด้วยรูปแบบ response ของ controller จริง
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Call = { method: string; url: string; body: unknown }
let calls: Call[] = []
let responder: (call: Call) => unknown = () => ({})

const USER = { id: 'u1', username: 'mint', email: 'm@x.io', level: 2, exp: 150, coins: 30, streak: 1, knowledgeStack: 60, emotionStack: 0, healthStack: 0, mbtiType: 'INTJ', currentRiskLevel: 'LOW', theme: 'SYSTEM' }

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_API_MODE', 'live')
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const call = { method: init.method ?? 'GET', url, body: init.body ? JSON.parse(init.body as string) : undefined }
    calls.push(call)
    const data = responder(call)
    const status = (data as { __status?: number })?.__status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(data), { status })
  }))
  window.localStorage.setItem('bloom:auth-token', 'tkn')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('โหมด live ตรงกับสัญญา backend', () => {
  it('อารมณ์: GET /mood/me (แบ่งหน้า) และ POST /mood ไม่ส่ง note ที่เป็น null', async () => {
    responder = (c) => (c.method === 'GET' ? { data: [{ id: 'm1', mood: 'CALM' }], pagination: {} } : { id: 'm2' })
    const mood = await import('../mood.api')
    expect(await mood.getMoodEntries()).toEqual([{ id: 'm1', mood: 'CALM' }])
    await mood.createMoodEntry({ category: 'NEUTRAL', mood: 'CALM', note: null, colorCode: 'GREEN' })
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /api/mood/me?pageSize=100', 'POST /api/mood'])
    expect(calls[1].body).toEqual({ category: 'NEUTRAL', mood: 'CALM', colorCode: 'GREEN' })
  })

  it('ประวัติเควส: GET /quests/logs/me แล้วคืนเฉพาะ data', async () => {
    responder = () => ({ data: [{ id: 'l1', status: 'COMPLETED', userId: 'u1', questId: 'q1', quest: { code: 'deep-root' }, logDate: '2026-09-27', completedAt: 'x' }], pagination: {} })
    const quest = await import('../quest.api')
    const logs = await quest.getQuestLogs()
    expect(calls[0].url).toBe('/api/quests/logs/me?pageSize=100')
    expect(logs[0].quest?.code).toBe('deep-root')
  })

  it('ร้านค้า: ซื้อ POST /shop/:id/purchase, สวม PATCH /shop/inventory/:userItemId/equip {isEquipped}', async () => {
    let equipped = false
    responder = (c) => {
      if (c.url === '/api/shop/inventory/me') return [{ id: 'ui1', userId: 'u1', shopItemId: 's1', isEquipped: equipped, purchasedAt: 'x' }]
      if (c.url.endsWith('/purchase')) return { userItem: { id: 'ui1', userId: 'u1', shopItemId: 's1', isEquipped: false, purchasedAt: 'x' }, user: { id: 'u1', coins: 10 } }
      if (c.url.endsWith('/equip')) { equipped = true; return {} }
      if (c.url === '/api/users/me') return USER
      return {}
    }
    const shop = await import('../shop.api')
    const bought = await shop.buyItem('s1', 20)
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/shop/s1/purchase' })
    expect(bought.item.id).toBe('ui1')
    expect(bought.user.username).toBe('mint') // เติมโปรไฟล์เต็มจาก GET /users/me
    calls = []
    const inv = await shop.toggleEquip('s1')
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ url: '/api/shop/inventory/ui1/equip', body: { isEquipped: true } })
    expect(inv[0].isEquipped).toBe(true)
  })

  it('โพสต์: คอมเมนต์ส่ง {content}, ไลก์ประกอบจากฟีด, ฟีดแปลง author → authorName', async () => {
    responder = (c) => {
      if (c.url === '/api/users/me') return USER
      if (c.url === '/api/posts?scope=all') return [{ id: 'p1', userId: 'u2', author: { username: 'ploy' }, content: 'hi', isAnonymous: false, likeCount: 3, commentCount: 1, likedByMe: false, createdAt: 'x' }]
      if (c.url.endsWith('/like')) return { liked: true, likeCount: 4 }
      if (c.method === 'POST' && c.url.endsWith('/comments')) return { id: 'c2', userId: 'u1', content: 'yo', createdAt: 'x' }
      if (c.url === '/api/posts/p1/comments') return [{ id: 'c1', userId: 'u2', content: 'first', createdAt: 'x', author: { username: 'ploy' } }]
      if (c.url === '/api/posts/p1/likes') return [{ userId: 'u3', username: 'fah', avatarUrl: null }]
      return {}
    }
    const post = await import('../post.api')
    const feed = await post.getFeedPosts()
    expect(feed[0]).toMatchObject({ authorName: 'ploy', likeCount: 3, likedByMe: false })
    expect(feed[0].comments[0]).toMatchObject({ content: 'first', authorName: 'ploy' })
    expect(feed[0].likedBy).toEqual([{ userId: 'u3', username: 'fah' }])
    const liked = await post.toggleLikePost('p1')
    expect(liked).toMatchObject({ likedByMe: true, likeCount: 4 })
    const commented = await post.addComment({ postId: 'p1', text: 'yo' })
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/comments'))?.body).toEqual({ content: 'yo' })
    expect(commented.comments[0]).toMatchObject({ content: 'first' })
  })

  it('โปรไฟล์: PATCH /users/me ส่งเฉพาะคีย์ที่ backend รับ (รวม gender/isProfilePrivate) ไม่ส่ง null', async () => {
    responder = (c) => (c.method === 'PATCH' ? { ...USER, bio: 'hello', gender: 'MALE', isProfilePrivate: true } : USER)
    const user = await import('../user.api')
    const next = await user.updateProfile({ bio: 'hello', height: null, gender: 'MALE', isProfilePrivate: true, email: 'no@x.io' })
    const patch = calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toEqual({ bio: 'hello', gender: 'MALE', isProfilePrivate: true })
    expect(next).toMatchObject({ bio: 'hello', gender: 'MALE', isProfilePrivate: true })
  })

  it('ลบบัญชี: DELETE /users/me ส่ง {password} พร้อม token และล้าง token หลังลบสำเร็จ', async () => {
    responder = () => ({ __status: 204 })
    const user = await import('../user.api')
    await expect(user.deleteAccount()).rejects.toMatchObject({ status: 400 })
    await user.deleteAccount('secret')
    const del = calls.find((c) => c.method === 'DELETE')
    expect(del).toMatchObject({ url: '/api/users/me', body: { password: 'secret' } })
    const init = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.at(-1)?.[1]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tkn')
    expect(window.localStorage.getItem('bloom:auth-token')).toBeNull()
  })

  it('social: follow คืนรายชื่อที่ติดตามจาก GET /social/following, activity แปลง actor/postExcerpt', async () => {
    responder = (c) => {
      if (c.url === '/api/social/following') return ['u9']
      if (c.url === '/api/social/activity') return [{ id: 'a1', type: 'LIKE_POST', postId: 'p1', createdAt: 'x', actor: { id: 'u9', username: 'ploy' }, postExcerpt: 'hi' }]
      return { following: true }
    }
    const social = await import('../social.api')
    expect(await social.toggleFollow('u9')).toEqual(['u9'])
    expect((await social.getActivityFeed())[0]).toMatchObject({ actorId: 'u9', actorName: 'ploy', excerpt: 'hi' })
  })

  it('ตารางจัดอันดับ: GET /users/leaderboard?type= ตามหมวด', async () => {
    responder = () => [
      { rank: 1, id: 'u1', username: 'mint', mbtiType: 'INTJ', level: 3, exp: 250, knowledgeStack: 1, emotionStack: 2, healthStack: 3, streak: 0 },
      { rank: 2, id: 'u2', username: 'old', mbtiType: null, level: 1, exp: 10, knowledgeStack: 0, emotionStack: 0, healthStack: 0, streak: 0 },
    ]
    const lb = await import('../leaderboard.api')
    const players = await lb.getLeaderboard('knowledgeStack')
    expect(calls[0].url).toBe('/api/users/leaderboard?type=knowledge')
    expect(players[0].mbtiType).toBe('INTJ')
    expect(players[1].mbtiType).toBe('INFP') // ยังไม่ตั้ง MBTI → ธีมค่าเริ่มต้น
  })

  it('รดน้ำ: POST /tree/water, รดซ้ำวันเดียวกัน (409) คืน null ไม่ถือเป็น error', async () => {
    responder = () => ({ __status: 409, error: { code: 'ALREADY_WATERED_TODAY' } })
    const mental = await import('../mental.api')
    expect(await mental.waterTree()).toBeNull()
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/tree/water' })
  })

  it('รหัสผ่าน + แชร์โพสต์: ยิง endpoint ใหม่ของ backend ด้วย body ที่ถูกต้อง', async () => {
    responder = () => ({ success: true })
    const user = await import('../user.api')
    const social = await import('../social.api')
    await user.changePassword({ currentPassword: 'a', newPassword: 'NewPassword1' })
    await user.requestPasswordReset('m@x.io')
    await user.resetPassword({ token: 't', newPassword: 'NewPassword1' })
    await social.sharePostToFriend('p1', 'u2')
    expect(calls.map((c) => [c.url, c.body])).toEqual([
      ['/api/auth/change-password', { currentPassword: 'a', newPassword: 'NewPassword1' }],
      ['/api/auth/request-password-reset', { email: 'm@x.io' }],
      ['/api/auth/reset-password', { token: 't', newPassword: 'NewPassword1' }],
      ['/api/social/share-post/p1', { friendUserId: 'u2' }],
    ])
  })

  it('ทริปเดินก้าว: POST /journeys ส่งเส้นทาง 3 ด่าน (ด่านสุดท้าย = ปลายทาง), เพิ่มก้าวผ่าน PATCH steps', async () => {
    const active = { id: 'j1', userId: 'u1', destinationMapId: 'm3', routeMapIds: ['a', 'b', 'm3'], progressOnCurrentMapSteps: 0, startedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 3 * 86400000).toISOString(), status: 'IN_PROGRESS' }
    responder = (c) => {
      if (c.url === '/api/users/me') return { ...USER, bmi: 22 }
      if (c.method === 'POST') return active
      if (c.url === '/api/journeys/active') return active
      return { ...active, progressOnCurrentMapSteps: 500 }
    }
    const journey = await import('../journey.api')
    await journey.startJourney('m3')
    const start = calls.find((c) => c.method === 'POST' && c.url === '/api/journeys')
    const body = start?.body as { destinationMapId: string; routeMapIds: string[] }
    expect(body.destinationMapId).toBe('m3')
    expect(body.routeMapIds).toHaveLength(3)
    expect(body.routeMapIds[2]).toBe('m3')
    const stepped = await journey.addSteps('j1', 500)
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ url: '/api/journeys/j1/steps', body: { steps: 500 } })
    expect(stepped.progressOnCurrentMapSteps).toBe(500)
  })
})
