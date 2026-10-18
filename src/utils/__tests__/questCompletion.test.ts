import { describe, expect, it } from 'vitest'
import type { QuestLogEntry } from '../../types'
import { KNOWLEDGE_DAILY } from '../../config/questCatalog'
import { isQuestDoneNow, learningRoundState } from '../questCompletion'

const NOW = new Date('2026-10-06T15:00:00')

function log(code: string, at: Date): QuestLogEntry {
  return {
    id: `${code}-${at.getTime()}`, status: 'COMPLETED', userId: 'u', questId: code,
    quest: { id: code, code, category: 'KNOWLEDGE' }, completedAt: at.toISOString(),
  } as QuestLogEntry
}

const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000)

describe('isQuestDoneNow', () => {
  it('เควสรายวันที่ทำเมื่อวาน → วันนี้ยังไม่นับว่าทำ (รีเซ็ตข้ามวัน)', () => {
    const yesterday = new Date(NOW.getTime() - 24 * 3600_000)
    expect(isQuestDoneNow([log('know-active-focus', yesterday)], 'know-active-focus', NOW)).toBe(false)
    expect(isQuestDoneNow([log('know-active-focus', minutesAgo(5))], 'know-active-focus', NOW)).toBe(true)
  })

  it('เควสไม่รายวัน (ทำครั้งเดียว) → เคยทำก็นับ', () => {
    const lastMonth = new Date(NOW.getTime() - 30 * 24 * 3600_000)
    expect(isQuestDoneNow([log('phys-soil-restoration', lastMonth)], 'phys-soil-restoration', NOW)).toBe(true)
  })

  it('หมวดการเรียนรู้ทำครบทุกด่านในวันเดียว → เริ่มรอบใหม่จากด่านแรก', () => {
    const logs = KNOWLEDGE_DAILY.map((q, i) => log(q.code, minutesAgo(60 - i)))
    expect(learningRoundState(logs, NOW).roundsDone).toBe(1)
    for (const q of KNOWLEDGE_DAILY) expect(isQuestDoneNow(logs, q.code, NOW)).toBe(false)
    // เล่นด่านแรกรอบสองแล้ว → ด่านแรกนับว่าทำแล้ว ด่านอื่นยังไม่
    const round2 = [...logs, log(KNOWLEDGE_DAILY[0].code, minutesAgo(1))]
    expect(isQuestDoneNow(round2, KNOWLEDGE_DAILY[0].code, NOW)).toBe(true)
    expect(isQuestDoneNow(round2, KNOWLEDGE_DAILY[1].code, NOW)).toBe(false)
  })
})
