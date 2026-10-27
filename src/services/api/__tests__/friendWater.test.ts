// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('friendWater โหมด mock', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'mock')
    window.localStorage.clear()
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); window.localStorage.clear() })

  it('รดน้ำได้วันละครั้งต่อเพื่อน รดซ้ำ → 409 ALREADY_WATERED · เพื่อนคนอื่นยังรดได้', async () => {
    const api = await import('../friendWater.api')
    const before = await api.getFriendWater('p1')
    expect(before.wateredToday).toBe(false)
    const first = await api.waterFriend('p1')
    expect(first.summary.wateredToday).toBe(true)
    expect(first.summary.myTotal).toBe(1)
    await expect(api.waterFriend('p1')).rejects.toMatchObject({ status: 409 })
    expect((await api.waterFriend('p2')).summary.myTotal).toBe(1)
  })

  it('ครบ 100 วัน → ได้การ์ดแลกซื้อเข้ากระเป๋า 1 ใบ', async () => {
    const db = await import('../../mock/mockDb')
    const { bangkokDateString } = await import('../../../utils/progression')
    // ประวัติ 99 วันครบคู่ก่อนหน้าวันนี้ + เพื่อนรดวันนี้แล้ว → เรารดวันนี้ = วันที่ 100
    db.updateDb((d) => {
      const p = db.emptyProgression('2026-01-01')
      const mine: Record<string, string> = {}, theirs: Record<string, string> = {}
      for (let i = 0; i <= 99; i++) {
        const day = bangkokDateString(new Date(Date.now() - i * 86_400_000))
        if (i > 0) mine[day] = new Date(Date.now() - i * 86_400_000).toISOString()
        theirs[day] = new Date(Date.now() - i * 86_400_000 - 60_000).toISOString()
      }
      p.friendWater = { p3: { mine, theirs, rewarded: [] } }
      d.progression = p
    })
    const api = await import('../friendWater.api')
    const res = await api.waterFriend('p3')
    expect(res.summary.streak).toBe(100)
    expect(res.rewardCardItemCode).toBeTruthy()
    const cards = db.getDb().progression!.exchangeCards
    expect(Object.values(cards).reduce((a, b) => a + b, 0)).toBe(1)
  })

  it('ยังไม่ติดตามเรากลับ → รดให้ได้ แต่เพื่อนไม่รดกลับ ไม่นับวัน และไม่ขึ้นใน "วันนี้ใครรดน้ำให้เรา"', async () => {
    const db = await import('../../mock/mockDb')
    db.updateDb((d) => { d.activity = d.activity.filter((a) => !(a.type === 'NEW_FOLLOWER' && a.actorId === 'p9')) })
    const api = await import('../friendWater.api')
    const res = await api.waterFriend('p9')
    expect(res.summary.wateredToday).toBe(true)
    expect(res.summary.friendWateredToday).toBe(false)
    expect(res.summary.streak).toBe(0)
    expect((await api.getWateredMeToday()).some((e) => e.friendId === 'p9')).toBe(false)
  })
})
