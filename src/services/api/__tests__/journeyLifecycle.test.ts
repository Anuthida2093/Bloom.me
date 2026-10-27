// @vitest-environment jsdom
/*============================================================================*\
  journeyLifecycle.test.ts — ทริป "ก้าวเพื่อสุขภาพ" ตั้งแต่จบจนรับรางวัล (โหมด mock)
  - ทริปที่หมดเวลาตอนปิดแอปต้องยังเปิดหน้าสรุปได้ (เดิม getActiveJourney คืน null → รางวัลหายเงียบ)
  - รับรางวัลแล้วต้องไม่โผล่ซ้ำ
  - "เปลี่ยนจุดหมาย" ต้องปิดทริปเดิม เริ่มทริปใหม่ได้
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ROUTE = ['flower-garden', 'bamboo-forest', 'mountain-range']

describe('journey lifecycle โหมด mock', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'mock')
    window.localStorage.clear()
  })
  afterEach(() => { vi.unstubAllEnvs(); window.localStorage.clear() })

  async function setup(deadlineOffsetMs: number, steps = 1_000) {
    const db = await import('../../mock/mockDb')
    db.updateDb((d) => {
      d.user = { ...d.user, bmi: 21 }
      d.activeJourney = {
        id: 'j1', userId: d.user.id, destinationMapId: 'mountain-range', routeMapIds: ROUTE,
        progressOnCurrentMapSteps: steps, startedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
        deadlineAt: new Date(Date.now() + deadlineOffsetMs).toISOString(), status: 'IN_PROGRESS',
      }
    })
    return { db, api: await import('../journey.api') }
  }

  it('หมดเวลาระหว่างปิดแอป → คืนทริปสถานะ TIME_UP ให้โชว์หน้าสรุป (ไม่ใช่ null)', async () => {
    const { api } = await setup(-60_000)
    const journey = await api.getActiveJourney()
    expect(journey?.status).toBe('TIME_UP')
    // เปิดซ้ำก่อนกดรับ ยังต้องเห็นหน้าสรุปเหมือนเดิม
    expect((await api.getActiveJourney())?.status).toBe('TIME_UP')
  })

  it('กดรับรางวัลแล้ว (clearPendingJourneyClaim) → ไม่โผล่หน้าสรุปซ้ำ', async () => {
    const { api } = await setup(-60_000)
    await api.getActiveJourney()
    api.clearPendingJourneyClaim()
    expect(await api.getActiveJourney()).toBeNull()
  })

  it('เดินครบเป้าในครั้งเดียว → addSteps จำทริปที่จบไว้รอรับรางวัล', async () => {
    const { api } = await setup(864e5, 23_000)
    const updated = await api.addSteps('j1', 1_000) // เกินเป้าทริปรายวัน (BMI 21 → 8,000 ก้าว)
    expect(updated.status).not.toBe('IN_PROGRESS')
    expect((await api.getActiveJourney())?.id).toBe('j1')
  })

  it('เปลี่ยนจุดหมาย (abandonJourney) → ทริปเดิมปิด เริ่มทริปใหม่ได้', async () => {
    const { db, api } = await setup(864e5)
    await api.abandonJourney('j1')
    expect(db.getDb().activeJourney?.status).toBe('TIME_UP')
    expect(await api.getActiveJourney()).toBeNull()
    const next = await api.startJourney('lotus-pond')
    expect(next.status).toBe('IN_PROGRESS')
    // ทริปรายวัน: แผนที่เดียว หมดเขตสิ้นวันนี้
    expect(next.routeMapIds).toEqual(['lotus-pond'])
    expect(new Date(next.deadlineAt).toDateString()).toBe(new Date().toDateString())
  })
})
