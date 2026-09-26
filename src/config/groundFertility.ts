import type { QuestLogEntry } from '../types'

/*============================================================================*\
  groundFertility — ความอุดมสมบูรณ์ของพื้นหญ้าใต้ต้นไม้ (ผูกกับเควสหมวดสุขภาพกาย HEALTH)
  ────────────────────────────────────────────────────────────────────────────
  ไม่ได้ทำเควสสุขภาพติดต่อกันหลายวัน → หญ้าค่อยๆ เหี่ยว (เหลือง) → แห้ง (น้ำตาล) → ดินร้าง
  ใช้ร่วมกัน 2 ที่:
  - หน้าจอ: drawTree2D.ts วาดสีหญ้า/ดินตาม groundDryness (ไล่ต่อเนื่องทีละวัน ไม่กระโดดเป็นขั้น)
  - เกม: quest.api.ts (mock) ลดคะแนนความรู้ที่ได้ต่อเควสตาม knowledgeGrowthMultiplier
    → ดินไม่อุดมสมบูรณ์ ต้นไม้ (ลำต้น = knowledgeStack) โตช้าลง
    [backend จริง] ต้องคำนวณแบบเดียวกันฝั่งเซิร์ฟเวอร์ — ดู docs/DB_CHANGES.md ข้อ 10
\*============================================================================*/

/** ไม่ได้ทำเควสสุขภาพไม่เกินจำนวนวันนี้ = หญ้ายังเขียวสดเต็มที่ */
export const GRASS_FRESH_DAYS = 3
/** ไม่ได้ทำเควสสุขภาพครบจำนวนวันนี้ = ดินร้างเต็มที่ */
export const BARREN_DAYS = 14
/** ต้นไม้บนดินร้างเต็มที่ได้คะแนนความรู้เหลือสัดส่วนนี้ต่อเควส */
export const BARREN_GROWTH_MULTIPLIER = 0.5

export type GroundStage = 'lush' | 'wilting' | 'dry' | 'barren'

/** 0 = หญ้าเขียวสด → 1 = ดินร้าง — null (ยังไม่เคยทำเควสสุขภาพ) ถือว่าสด ไม่ลงโทษผู้เล่นใหม่ */
export function groundDryness(daysSinceLastHealthQuest: number | null): number {
  if (daysSinceLastHealthQuest === null) return 0
  const t = (daysSinceLastHealthQuest - GRASS_FRESH_DAYS) / (BARREN_DAYS - GRASS_FRESH_DAYS)
  return Math.max(0, Math.min(1, t))
}

export function groundStage(dryness: number): GroundStage {
  if (dryness <= 0) return 'lush'
  if (dryness < 0.4) return 'wilting'
  if (dryness < 1) return 'dry'
  return 'barren'
}

export const GROUND_STAGE_LABEL: Record<GroundStage, string> = {
  lush: 'เขียวสด อุดมสมบูรณ์',
  wilting: 'หญ้าเริ่มเหี่ยวเหลือง',
  dry: 'หญ้าแห้งเป็นสีน้ำตาล',
  barren: 'กลายเป็นดินร้าง',
}

/** ตัวคูณคะแนนความรู้ (การโตของลำต้น) ตามความแห้งของดิน: สด 1 → ดินร้าง 0.5 */
export function knowledgeGrowthMultiplier(dryness: number): number {
  return 1 - (1 - BARREN_GROWTH_MULTIPLIER) * Math.max(0, Math.min(1, dryness))
}

const DAY_MS = 24 * 60 * 60 * 1000

/** จำนวนวันเต็มตั้งแต่ทำเควสสุขภาพ (HEALTH) สำเร็จล่าสุด — null = ยังไม่เคย */
export function daysSinceLastHealthQuest(logs: QuestLogEntry[], now = Date.now()): number | null {
  let latest: number | undefined
  for (const log of logs) {
    if (log.quest?.category !== 'HEALTH' || log.status !== 'COMPLETED' || !log.completedAt) continue
    const t = new Date(log.completedAt).getTime()
    if (latest === undefined || t > latest) latest = t
  }
  return latest === undefined ? null : Math.floor((now - latest) / DAY_MS)
}
