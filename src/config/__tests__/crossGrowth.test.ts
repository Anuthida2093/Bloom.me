// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { crossGrowthMultiplier, crossPenalty } from '../crossGrowth'
import type { QuestCategory, QuestLogEntry } from '../../types'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 9, 22, 12)
const log = (category: QuestCategory, daysAgo: number) => ({
  id: `${category}-${daysAgo}`, status: 'COMPLETED', userId: 'u', questId: 'q', logDate: null,
  quest: { code: 'q', category }, completedAt: new Date(now - daysAgo * DAY).toISOString(),
}) as QuestLogEntry

describe('crossGrowth (ทั้ง 3 ด้านมีผลต่อกันเล็กน้อย)', () => {
  it('ไม่ลดภายใน 4 วัน · ขาด 5-9 วันลด 5% · 10 วันขึ้นไปลด 10% · ผู้เล่นใหม่ไม่ลด', () => {
    expect(crossPenalty(null)).toBe(0)
    expect(crossPenalty(4)).toBe(0)
    expect(crossPenalty(5)).toBe(0.05)
    expect(crossPenalty(9)).toBe(0.05)
    expect(crossPenalty(10)).toBe(0.1)
    expect(crossPenalty(60)).toBe(0.1)
  })

  it('จับคู่เป็นวง: สุขภาพ→ความรู้, ความรู้→จิตใจ, จิตใจ→สุขภาพ', () => {
    const logs = [log('HEALTH', 12), log('KNOWLEDGE', 6), log('EMOTION', 1)]
    expect(crossGrowthMultiplier('KNOWLEDGE', logs, now)).toBeCloseTo(0.9) // ขาดสุขภาพ 12 วัน
    expect(crossGrowthMultiplier('EMOTION', logs, now)).toBeCloseTo(0.95) // ขาดความรู้ 6 วัน
    expect(crossGrowthMultiplier('HEALTH', logs, now)).toBe(1) // ทำจิตใจเมื่อวาน
  })
})

describe('isSeriousMode (มีผลเฉพาะโหมดจริงจัง)', () => {
  it('โหมดปกติ (ค่าเริ่มต้น/ไม่เคยตั้งค่า) = ไม่จริงจัง · เปิดโหมดความเข้มงวด = จริงจัง', async () => {
    const { isSeriousMode } = await import('../crossGrowth')
    window.localStorage.removeItem('bloom:settings')
    expect(isSeriousMode()).toBe(false)
    window.localStorage.setItem('bloom:settings', JSON.stringify({ strictMode: false }))
    expect(isSeriousMode()).toBe(false)
    window.localStorage.setItem('bloom:settings', JSON.stringify({ strictMode: true }))
    expect(isSeriousMode()).toBe(true)
    window.localStorage.removeItem('bloom:settings')
  })
})
