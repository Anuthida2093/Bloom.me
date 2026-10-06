// @vitest-environment jsdom
/*============================================================================*\
  progression.test.ts — ปลดล็อกระบบการ์ดแลกซื้อ (เดินถึงเป้าสะสม 21 วัน) / การ์ดสุ่มตกจากเควสประจำวัน /
  แลกซื้อของพิเศษ / หน้าเว็บไม่ได้รับตัวนับวัน (โหมด mock)
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** วันที่ไทยย้อนหลัง n วัน (ตรงกับ localDateKey ที่ตัดรอบเวลาไทย) */
function dateDaysAgo(n: number): string {
  return new Date(Date.now() + 7 * 3_600_000 - n * 86_400_000).toISOString().slice(0, 10)
}

describe('progression — โหมด mock', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'mock')
    window.localStorage.clear()
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); window.localStorage.clear() })

  async function setup(goalDaysBeforeToday: number) {
    const db = await import('../../mock/mockDb')
    db.updateDb((d) => {
      d.user = { ...d.user, coins: 5_000 }
      const p = db.emptyProgression(dateDaysAgo(60))
      for (let i = 1; i <= goalDaysBeforeToday; i++) p.stepDays[dateDaysAgo(i)] = { steps: 9_000, goal: 8_000, goalMet: true }
      d.progression = p
    })
    return { db, api: await import('../progression.api'), quest: await import('../quest.api') }
  }

  it('หน้าเว็บไม่ได้รับตัวนับวันสะสม/สถานะปลดล็อก', async () => {
    const { api } = await setup(25)
    const summary = await api.getProgression()
    expect(Object.keys(summary).sort()).toEqual(['doubleRewardToday', 'exchangeCards', 'goalStreakDays'])
  })

  it('บันทึกก้าวรายวันพร้อมแผนที่ — ประวัติเปิดดูแผนที่ของวันนั้นได้ และเก็บก้าวค่ามากสุด', async () => {
    const { api } = await setup(0)
    const today = api.localDateKey()
    await api.recordStepDay(today, 9_000, 8_000, { mapId: 'lotus-pond', journeyId: 'j1' })
    await api.recordStepDay(today, 3_000, 8_000)
    const [day] = await api.getStepHistory()
    expect(day).toMatchObject({ date: today, steps: 9_000, goalMet: true, mapId: 'lotus-pond', journeyId: 'j1' })
  })

  it('ยังไม่ครบ 21 วัน → ทำเควสประจำวันไม่มีวันได้การ์ด', async () => {
    const { quest } = await setup(19)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const res = await quest.completeQuest({ questCode: 'know-active-focus' })
    expect(res.exchangeCard).toBeNull()
  })

  it('ครบ 21 วัน → ปลดล็อกถาวร แล้วการ์ดสุ่มตกจากเควสประจำวัน (ไม่ต้องรออีก 21 วัน)', async () => {
    const { db, api, quest } = await setup(20)
    await api.recordStepDay(api.localDateKey(), 8_000, 8_000) // วันที่ 21
    expect(db.getDb().progression?.cardsUnlockedAt).toBeTruthy()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const res = await quest.completeQuest({ questCode: 'know-active-focus' })
    expect(res.exchangeCard).toBeTruthy()
    expect((await api.getProgression()).exchangeCards[res.exchangeCard as string]).toBe(1)
  })

  it('กดข้ามตัวจับเวลา → ไม่ได้การ์ด', async () => {
    const { db, quest } = await setup(0)
    db.updateDb((d) => { d.progression!.cardsUnlockedAt = new Date().toISOString() })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const res = await quest.completeQuest({ questCode: 'know-deep-root', payload: { skipped: true } })
    expect(res.exchangeCard).toBeNull()
  })

  it('แลกซื้อ: การ์ดไม่พอ → 400 INSUFFICIENT_CARDS พร้อมจำนวนที่ขาด ไม่หักเหรียญ', async () => {
    const { db, api } = await setup(0)
    db.updateDb((d) => { d.progression!.exchangeCards['fire-dragon'] = 2 }) // ต้องใช้ 5
    await expect(api.exchangeItem('fire-dragon', 2_500)).rejects.toMatchObject({
      status: 400, detail: { error: { code: 'INSUFFICIENT_CARDS', missing: 3 } },
    })
    expect(db.getDb().user.coins).toBe(5_000)
  })

  it('แลกซื้อสำเร็จ: หักเหรียญ + การ์ด แล้วได้ของเข้าคลัง', async () => {
    const { db, api } = await setup(0)
    db.updateDb((d) => { d.progression!.exchangeCards['fire-dragon'] = 6 })
    await api.exchangeItem('fire-dragon', 2_500)
    const after = db.getDb()
    expect(after.user.coins).toBe(2_500)
    expect(after.progression!.exchangeCards['fire-dragon']).toBe(1)
    expect(after.inventory.some((i) => i.shopItemId === 'fire-dragon')).toBe(true)
  })

  it('หยั่งรากลึกครบ 3 รอบก่อนปลดล็อก → ได้เหรียญโบนัส (ไม่มีการ์ด) และสุ่มครั้งเดียวต่อ rollKey', async () => {
    const { api } = await setup(0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = await api.claimDeepRootBonus('deep-root:test:0')
    const b = await api.claimDeepRootBonus('deep-root:test:0')
    expect(a).toEqual({ cardItemCode: null, coins: 60 })
    expect(b).toEqual(a)
  })

  it('หีบสมบัติ: วันที่ไม่ถึงเป้า → 400 GOAL_NOT_MET (ไม่มีหีบ)', async () => {
    const { api } = await setup(0)
    const today = api.localDateKey()
    await api.recordStepDay(today, 3_000, 8_000)
    await expect(api.openStepChest(today)).rejects.toMatchObject({ status: 400, detail: { error: { code: 'GOAL_NOT_MET' } } })
  })

  it('หีบสมบัติ: 1 ใบต่อวัน เปิดซ้ำได้ผลเดิม ไม่ได้รางวัลซ้ำ + ประวัติเห็นผลหีบ', async () => {
    const { db, api } = await setup(0)
    const today = api.localDateKey()
    await api.recordStepDay(today, 9_000, 8_000)
    vi.spyOn(Math, 'random').mockReturnValue(0) // ยังไม่ปลดล็อกการ์ด → ช่องแรกที่เหลือ = เหรียญโบนัส ค่าต่ำสุด
    const first = await api.openStepChest(today)
    const coinsAfter = db.getDb().user.coins
    const again = await api.openStepChest(today)
    expect(first).toEqual({ reward: { kind: 'BONUS_COINS', amount: 20, cardItemCode: null }, alreadyOpened: false })
    expect(coinsAfter).toBe(5_020)
    expect(again).toEqual({ reward: first.reward, alreadyOpened: true })
    expect(db.getDb().user.coins).toBe(5_020)
    expect((await api.getStepHistory())[0].chest).toEqual(first.reward)
    // บันทึกก้าวเพิ่มหลังเปิดหีบ → ผลหีบไม่หาย
    await api.recordStepDay(today, 10_000, 8_000)
    expect((await api.getStepHistory())[0].chest).toEqual(first.reward)
  })

  it('หีบสมบัติ: การ์ดแลกซื้อออกได้หลังปลดล็อกเท่านั้น แล้วเข้ากระเป๋าการ์ด', async () => {
    const { db, api } = await setup(0)
    const today = api.localDateKey()
    db.updateDb((d) => { d.progression!.cardsUnlockedAt = new Date().toISOString() })
    await api.recordStepDay(today, 9_000, 8_000)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { reward } = await api.openStepChest(today)
    expect(reward.kind).toBe('EXCHANGE_CARD')
    expect((await api.getProgression()).exchangeCards[reward.cardItemCode as string]).toBe(1)
  })
})
