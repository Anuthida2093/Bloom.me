// @vitest-environment jsdom
/*============================================================================*\
  stepSettlement.test.ts — ปิดรอบเควสก้าวของเมื่อวานตอนเปิดแอปครั้งถัดไป (โหมด mock)
  - ใช้ก้าวล่าสุดที่บันทึกไว้ รับรางวัลด้วยสูตรเดิม log ลงวันทริป (ไม่กินโควตาวันนี้)
  - ถึงเป้า → เปิดหีบของวันนั้นให้ · เก็บผลสรุปไว้แจ้งเตือนตอนเช้า · ไม่ปิดรอบซ้ำ
  - ทริปของวันนี้ / หน้าเควสเปิดอยู่ → ไม่ปิดรอบแทนผู้เล่น
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const DAY = 86_400_000
const bkkDate = (msAgo: number) => new Date(Date.now() + 7 * 3_600_000 - msAgo).toISOString().slice(0, 10)

describe('stepSettlement — โหมด mock', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'mock')
    window.localStorage.clear()
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); window.localStorage.clear() })

  async function setup(startedMsAgo: number, steps: number, deadlineOffsetMs = -60_000) {
    const db = await import('../mock/mockDb')
    db.updateDb((d) => {
      d.user = { ...d.user, id: 'u1', bmi: 21, coins: 0 }
      d.activeJourney = {
        id: 'j1', userId: 'u1', destinationMapId: 'lotus-pond', routeMapIds: ['lotus-pond'],
        progressOnCurrentMapSteps: steps, startedAt: new Date(Date.now() - startedMsAgo).toISOString(),
        deadlineAt: new Date(Date.now() + deadlineOffsetMs).toISOString(), status: 'IN_PROGRESS',
      }
    })
    const settlement = await import('../stepSettlement')
    const addWaterDrops = vi.fn()
    const settle = () => settlement.settlePreviousStepDay({ userId: 'u1', bmi: 21, addWaterDrops })
    return { db, settlement, settle, addWaterDrops, journey: await import('../api/journey.api') }
  }

  it('ทริปเมื่อวานถึงเป้า → รับรางวัล log ลงวันทริป + เปิดหีบ + หยดน้ำ + ผลสรุปไว้แจ้งเตือน และไม่ปิดซ้ำ', async () => {
    const { db, settlement, settle, addWaterDrops, journey } = await setup(DAY, 8_000)
    const yesterday = bkkDate(DAY)
    const record = await settle()

    expect(record).toMatchObject({ date: yesterday, goalMet: true, steps: 8_000 })
    expect(record?.chest).toBeTruthy()
    const log = db.getDb().questLogs.find((l) => l.quest?.code === 'phys-vitality-steps')
    expect(log).toMatchObject({ logDate: yesterday, status: 'COMPLETED' })
    expect(db.getDb().progression?.stepDays[yesterday]?.chest).toBeTruthy()
    expect(addWaterDrops).toHaveBeenCalledWith(record?.waterDrops)
    expect(settlement.readStepSettlements('u1')[0].date).toBe(yesterday)
    expect(await journey.getActiveJourney()).toBeNull()

    expect(await settle()).toBeNull()
    expect(db.getDb().questLogs.filter((l) => l.quest?.code === 'phys-vitality-steps')).toHaveLength(1)
  })

  it('ทริปเมื่อวานไม่ถึงเป้า → รับรางวัลตามก้าวจริง ไม่มีหีบ', async () => {
    const { db, settle } = await setup(DAY, 3_000)
    const record = await settle()
    expect(record).toMatchObject({ goalMet: false, chest: null })
    expect(db.getDb().user.coins).toBeGreaterThan(0)
  })

  it('ทริปของวันนี้ที่จบแล้ว → ไม่ปิดรอบแทน (ผู้เล่นเปิดหีบ/กดรับเอง)', async () => {
    const { db, settle } = await setup(60_000, 8_000, DAY)
    await (await import('../api/journey.api')).getActiveJourney() // ถึงเป้า → จบ รอรับ
    expect(await settle()).toBeNull()
    expect(db.getDb().questLogs).toHaveLength(0)
  })

  it('หน้าเควสก้าวเปิดอยู่ → ไม่ปิดรอบแทน', async () => {
    const { db, settlement, settle } = await setup(DAY, 8_000)
    const release = settlement.holdStepSettlement()
    expect(await settle()).toBeNull()
    expect(db.getDb().questLogs).toHaveLength(0)
    release()
    expect(await settle()).not.toBeNull()
  })
})
