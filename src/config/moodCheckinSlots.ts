import type { QuestCategory, QuestLogEntry } from '../types'
import { bangkokDateString, bangkokHour } from '../utils/progression'

/*============================================================================*\
  moodCheckinSlots — เช็คอินอารมณ์วันละ 2 รอบ (เช้า + เย็น)
  ────────────────────────────────────────────────────────────────────────────
  backend มีเควส 2 ตัวแยกกันอยู่แล้ว (prisma/seed.ts): mood-checkin-morning / mood-checkin-evening
  ทั้งคู่ isDaily → ทำได้รอบละครั้งต่อวัน (บังคับที่ DB ด้วย unique userId+questId+logDate)
  แต่ backend "ไม่เช็คเวลาในวัน" — การแบ่งเช้า/เย็นตามเวลาเป็น gate ฝั่งหน้าเว็บล้วน
  (ผู้ใช้เปลี่ยนนาฬิกาเครื่องแล้วข้ามได้ ยอมรับได้สำหรับฟีเจอร์ความเสี่ยงต่ำนี้)
    ก่อน 17:00 เวลาไทย → รอบเช้า   ·   ตั้งแต่ 17:00 → รอบเย็น (รอบเช้าปิดแล้ว)
\*============================================================================*/

export type MoodCheckinSlot = 'morning' | 'evening'

/** ชั่วโมง (เวลาไทย) ที่รอบเย็นเปิด / รอบเช้าปิด */
export const EVENING_CHECKIN_START_HOUR = 17

export const MOOD_CHECKIN_QUEST_CODE: Record<MoodCheckinSlot, string> = {
  morning: 'mood-checkin-morning',
  evening: 'mood-checkin-evening',
}

/** รางวัลตรงกับ seed ของ backend — ใช้เฉพาะโหมด mock (โหมด live อ่านผลจาก backend) */
export const MOOD_CHECKIN_QUESTS: { code: string; category: QuestCategory; expReward: number; coinReward: number }[] = [
  { code: MOOD_CHECKIN_QUEST_CODE.morning, category: 'EMOTION', expReward: 10, coinReward: 5 },
  { code: MOOD_CHECKIN_QUEST_CODE.evening, category: 'EMOTION', expReward: 10, coinReward: 5 },
]

export function currentMoodCheckinSlot(now: Date = new Date()): MoodCheckinSlot {
  return bangkokHour(now) >= EVENING_CHECKIN_START_HOUR ? 'evening' : 'morning'
}

/** รอบนี้เช็คอิน (ทำเควสสำเร็จ) ไปแล้ววันนี้หรือยัง — logDate ของ backend เป็นวันไทย */
export function isMoodCheckinDone(slot: MoodCheckinSlot, logs: QuestLogEntry[], now: Date = new Date()): boolean {
  const today = bangkokDateString(now)
  const code = MOOD_CHECKIN_QUEST_CODE[slot]
  return logs.some((l) => l.quest?.code === code && l.status === 'COMPLETED' && l.logDate?.slice(0, 10) === today)
}

export interface MoodCheckinStatus {
  slot: MoodCheckinSlot
  /** รอบปัจจุบันทำไปแล้ววันนี้ */
  doneThisSlot: boolean
  morningDone: boolean
  eveningDone: boolean
}

export function getMoodCheckinStatus(logs: QuestLogEntry[], now: Date = new Date()): MoodCheckinStatus {
  const slot = currentMoodCheckinSlot(now)
  const morningDone = isMoodCheckinDone('morning', logs, now)
  const eveningDone = isMoodCheckinDone('evening', logs, now)
  return { slot, doneThisSlot: slot === 'morning' ? morningDone : eveningDone, morningDone, eveningDone }
}
