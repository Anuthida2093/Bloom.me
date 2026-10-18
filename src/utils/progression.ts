import { EXP_PER_LEVEL, STACK_PER_VISUAL_LEVEL } from '../types'

/*============================================================================*\
  progression.ts — สูตรเลเวล/ขั้นภาพต้นไม้/streak ที่ "ตรงกับ backend เป๊ะ"
  ────────────────────────────────────────────────────────────────────────────
  โหมด live หน้าเว็บอ่านค่าที่ backend ส่งกลับมาเสมอ ไม่คำนวณเอง — สูตรในไฟล์นี้ใช้แค่
  (1) โหมด mock ที่ต้องจำลองผลแทน backend และ (2) แปลง stack → ขั้นภาพตอนแสดงผล
  อ้างอิง bloom-me-project:
    src/utils/level.ts  → calculateLevel       (100 EXP ต่อเลเวล คงที่)
    src/utils/tree.ts   → calculateVisualLevel (50 คะแนน stack ต่อขั้น ไม่มีเพดาน)
    src/utils/streak.ts → calculateNextStreak  (ขาด 1 วันไม่รีเซ็ต ขาด 2 วันติดขึ้นไปเริ่มที่ 1)
\*============================================================================*/

/** EXP ที่ได้จากการรดน้ำ (tree.controller.ts → WATER_EXP_REWARD) — ได้แค่ EXP ไม่มีเหรียญ/stack */
export const WATER_EXP_REWARD = 15

export function calculateLevel(exp: number): number {
  return Math.floor(exp / EXP_PER_LEVEL) + 1
}

/** ขั้นภาพของแต่ละส่วนต้นไม้ — ไม่มีเพดาน (ผู้วาดแปลงเป็นขั้นภาพ 1-8 เองที่จุดเลือกภาพ) */
export function calculateVisualLevel(stack: number): number {
  return Math.floor(Math.max(0, stack) / STACK_PER_VISUAL_LEVEL) + 1
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

/** วันตามปฏิทินไทย (Asia/Bangkok, UTC+7 ไม่มี DST) เป็นเลขวันนับจาก epoch */
function bangkokDayNumber(date: Date): number {
  return Math.floor((date.getTime() + BANGKOK_OFFSET_MS) / MS_PER_DAY)
}

/** วันที่ตามปฏิทินไทยรูปแบบ YYYY-MM-DD (ตรงกับคอลัมน์ @db.Date ของ backend) */
export function bangkokDateString(date: Date = new Date()): string {
  return new Date(bangkokDayNumber(date) * MS_PER_DAY).toISOString().slice(0, 10)
}

/** เที่ยงคืนตามเวลาไทย (23:59:59.999 ของวันไทยที่ `from` อยู่) — เส้นตายทริปก้าวรายวัน ไม่ขึ้นกับโซนเวลาเครื่อง */
export function endOfBangkokDay(from: Date = new Date()): Date {
  return new Date((bangkokDayNumber(from) + 1) * MS_PER_DAY - BANGKOK_OFFSET_MS - 1)
}

/** เวลา hour:00 น. ตามเวลาไทยของวันที่ไทย `date` (YYYY-MM-DD) */
export function bangkokTimeOn(date: string, hour: number): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) + hour * 60 * 60 * 1000 - BANGKOK_OFFSET_MS)
}

/** ชั่วโมงตามเวลาไทย 0-23 */
export function bangkokHour(date: Date = new Date()): number {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS).getUTCHours()
}

export function calculateNextStreak(currentStreak: number, lastActiveDate: string | Date | null, now: Date = new Date()): number {
  if (!lastActiveDate) return 1
  // lastActiveDate จาก backend เป็น "YYYY-MM-DD" (วันไทย) หรือ ISO เต็ม — แปลงเป็นเลขวันไทยให้ตรงกัน
  const last = typeof lastActiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastActiveDate)
    ? Math.floor(Date.parse(`${lastActiveDate}T00:00:00Z`) / MS_PER_DAY)
    : bangkokDayNumber(new Date(lastActiveDate))
  const gapDays = bangkokDayNumber(now) - last
  if (gapDays <= 0) return currentStreak // ทำกิจกรรมวันนี้ไปแล้ว ไม่นับซ้ำ
  if (gapDays === 1) return currentStreak + 1 // วันติดกัน
  if (gapDays === 2) return currentStreak // ขาด 1 วัน — ผ่อนผัน streak คงเดิม
  return 1 // ขาด 2 วันติดขึ้นไป — เริ่มใหม่
}
