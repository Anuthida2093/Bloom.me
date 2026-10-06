import type { QuestLogEntry } from '../types'
import { KNOWLEDGE_DAILY, findQuestByCode } from '../config/questCatalog'

/*============================================================================*\
  questCompletion.ts — "เควสนี้ถือว่าทำแล้วตอนนี้ไหม" ที่เดียวทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  [แก้บั๊ก] เดิม QuestSection เช็คแค่ "เคยสำเร็จสักครั้งไหม" — เควสรายวัน (isDaily) จึงไม่เคยรีเซ็ต
  ข้ามวัน ทำเมื่อวานแล้ววันนี้ยังขึ้นว่าสำเร็จ ตอนนี้:
    - เควสรายวัน → นับเฉพาะที่สำเร็จ "วันนี้"
    - เควสไม่รายวัน (เควสเสริมแบบครั้งเดียว) → เคยสำเร็จก็นับ
    - เควสรายวันหมวดการเรียนรู้ → นับเป็น "รอบ": ทำครบทุกด่านในวันเดียว = จบรอบ กลับมาเล่น
      ด่านแรกใหม่ได้ (ด่านทั้งหมดเปิดเป็นรอบใหม่ นกฮูกกลับจุดเริ่ม)
\*============================================================================*/

const LEARNING_DAILY_CODES = KNOWLEDGE_DAILY.map((q) => q.code)

function isToday(iso: string | null | undefined, now: Date): boolean {
  return !!iso && new Date(iso).toDateString() === now.toDateString()
}

function completedLogs(logs: QuestLogEntry[], code: string): QuestLogEntry[] {
  return logs.filter((l) => l.quest?.code === code && l.status === 'COMPLETED' && !!l.completedAt)
}

/** รอบการเรียนรู้ของวันนี้: จำนวนรอบที่ทำครบแล้ว + เวลาที่รอบล่าสุดจบ (null = ยังไม่ครบสักรอบ) */
export function learningRoundState(logs: QuestLogEntry[], now: Date = new Date()): { roundsDone: number; roundStartedAt: string | null } {
  const today = logs
    .filter((l) => l.status === 'COMPLETED' && LEARNING_DAILY_CODES.includes(l.quest?.code ?? '') && isToday(l.completedAt, now))
    .sort((a, b) => (a.completedAt as string).localeCompare(b.completedAt as string))
  let seen = new Set<string>()
  let roundsDone = 0
  let roundStartedAt: string | null = null
  for (const l of today) {
    seen.add(l.quest?.code as string)
    if (seen.size === LEARNING_DAILY_CODES.length) {
      roundsDone += 1
      roundStartedAt = l.completedAt as string
      seen = new Set()
    }
  }
  return { roundsDone, roundStartedAt }
}

/** ทำเควสนี้แล้วสำหรับ "ตอนนี้" หรือยัง (ดูกติกาด้านบน) */
export function isQuestDoneNow(logs: QuestLogEntry[], code: string, now: Date = new Date()): boolean {
  const def = findQuestByCode(code)
  const done = completedLogs(logs, code)
  if (!def?.isDaily) return done.length > 0
  const todays = done.filter((l) => isToday(l.completedAt, now))
  if (!LEARNING_DAILY_CODES.includes(code)) return todays.length > 0
  const { roundStartedAt } = learningRoundState(logs, now)
  return todays.some((l) => !roundStartedAt || (l.completedAt as string) > roundStartedAt)
}
