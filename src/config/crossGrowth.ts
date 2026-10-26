import type { QuestCategory, QuestLogEntry } from '../types'

/*============================================================================*\
  crossGrowth — ทั้ง 3 ด้านมีผลต่อกันเล็กน้อย (กันไม่ให้ทำด้านเดียวจนขาดสมดุล)
  ────────────────────────────────────────────────────────────────────────────
  ขาดเควสหมวดหนึ่ง → อีกหมวดได้คะแนน stack (การโตของต้นไม้) น้อยลงนิดหน่อย เป็นวง:
    ขาดสุขภาพกาย (HEALTH)  → คะแนนความรู้ (KNOWLEDGE) ลดลง  (ร่างกายล้า เรียนได้น้อยลง)
    ขาดความรู้ (KNOWLEDGE) → คะแนนจิตใจ (EMOTION) ลดลง
    ขาดจิตใจ (EMOTION)     → คะแนนสุขภาพกาย (HEALTH) ลดลง  (เครียดแล้วกระทบร่างกาย)
  เกณฑ์วันเดียวกับ State Axis บทที่ 2: ภายใน 4 วัน = ไม่ลด · ขาด 5-9 วัน (เหี่ยว) = ลด 5%
  · ขาด 10 วันขึ้นไป (ทรุดโทรม) = ลด 10% (สูงสุด) — ลดเฉพาะคะแนนที่จะได้ใหม่ ไม่หักของที่สะสมไว้
  EXP/เหรียญได้เต็มเสมอ · ยังไม่เคยทำหมวดนั้นเลย (ผู้เล่นใหม่) = ไม่ลด
  [แก้ตามที่ระบุ] มีผลเฉพาะ "โหมดจริงจัง" (ตั้งค่า → โหมดความเข้มงวด เปิด) — โหมดปกติไม่ลดเลย
  [backend จริง] ต้องคำนวณแบบเดียวกันฝั่งเซิร์ฟเวอร์ — ดู docs/DB_CHANGES.md ข้อ 10
\*============================================================================*/

/** หมวดเป้าหมาย ← หมวดที่ถ้าขาดแล้วทำให้หมวดเป้าหมายได้คะแนนน้อยลง */
export const CROSS_GROWTH_SOURCE: Record<QuestCategory, QuestCategory> = {
  KNOWLEDGE: 'HEALTH',
  EMOTION: 'KNOWLEDGE',
  HEALTH: 'EMOTION',
}

/** ขาดเควสเกินจำนวนวันนี้ = เริ่มลด (เหี่ยว) */
export const CROSS_WILTING_DAYS = 5
/** ขาดเควสถึงจำนวนวันนี้ = ลดเต็มที่ (ทรุดโทรม) */
export const CROSS_DYING_DAYS = 10
export const CROSS_WILTING_PENALTY = 0.05
export const CROSS_DYING_PENALTY = 0.1

/** สัดส่วนที่ถูกลดตามจำนวนวันที่ขาดเควสหมวดต้นทาง: 0 / 0.05 / 0.1 */
export function crossPenalty(daysSinceSourceQuest: number | null): number {
  if (daysSinceSourceQuest === null || daysSinceSourceQuest < CROSS_WILTING_DAYS) return 0
  return daysSinceSourceQuest >= CROSS_DYING_DAYS ? CROSS_DYING_PENALTY : CROSS_WILTING_PENALTY
}

/** โหมดจริงจังเปิดอยู่ไหม — อ่านค่าตั้งค่าที่ UIContext เก็บไว้ในเครื่อง (bloom:settings) ใช้ฝั่ง mock เท่านั้น
 *  [backend จริง] เซิร์ฟเวอร์ต้องรู้โหมดของผู้ใช้เอง — ดู docs/DB_CHANGES.md ข้อ 10 */
export function isSeriousMode(): boolean {
  try {
    const raw = window.localStorage.getItem('bloom:settings')
    return raw ? (JSON.parse(raw) as { strictMode?: boolean }).strictMode === true : false
  } catch {
    return false
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** จำนวนวันเต็มตั้งแต่ทำเควสหมวดนี้สำเร็จล่าสุด — null = ยังไม่เคย */
export function daysSinceLastQuestOf(category: QuestCategory, logs: QuestLogEntry[], now = Date.now()): number | null {
  let latest: number | undefined
  for (const log of logs) {
    if (log.quest?.category !== category || log.status !== 'COMPLETED' || !log.completedAt) continue
    const t = new Date(log.completedAt).getTime()
    if (latest === undefined || t > latest) latest = t
  }
  return latest === undefined ? null : Math.floor((now - latest) / DAY_MS)
}

/** ตัวคูณคะแนน stack ของเควสหมวดนี้ (0.9-1) จากประวัติเควสของหมวดต้นทาง */
export function crossGrowthMultiplier(category: QuestCategory, logs: QuestLogEntry[], now = Date.now()): number {
  return 1 - crossPenalty(daysSinceLastQuestOf(CROSS_GROWTH_SOURCE[category], logs, now))
}
