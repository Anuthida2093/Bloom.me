/*============================================================================*\
  types.mental.ts — [ไฟล์ใหม่] ชนิดข้อมูลของ "ระบบสุขภาพจิต + ระบบคัดกรอง + Activity Log"
  ────────────────────────────────────────────────────────────────────────────
  ทำไมต้องแยกไฟล์: src/types.ts เดิมสะท้อน Prisma schema ปัจจุบัน (docs/DATA_DICTIONARY.md)
  แบบ 1:1 อยู่แล้ว การไปแทรกของใหม่ปนเข้าไปจะทำให้แยกไม่ออกว่า field ไหน "มีจริงใน DB แล้ว"
  กับ field ไหน "ยังต้องไป migrate เพิ่ม" — ไฟล์นี้จึงรวมเฉพาะชนิดข้อมูลชุดใหม่ พร้อมกำกับไว้
  ทุกตัวว่าต้องเพิ่มตาราง/คอลัมน์อะไรบ้างฝั่ง backend (สรุปทั้งหมดอยู่ใน docs/DB_CHANGES.md)

  import ตรงจากไฟล์นี้ได้เลย เช่น
      import type { MoodColorCode } from '../types.mental'
  ไม่ต้องแก้ src/types.ts แม้แต่บรรทัดเดียว
\*============================================================================*/

import type { RiskLevel } from './types'

/* ── 1) เควสปรุงน้ำยาสำรวจใจ (Daily Potion Check-in) ──────────────────────────
   [ต้องเพิ่มใน DB] ตาราง mood_entries ปัจจุบันมีแค่ category/mood/note/createdAt
   ต้องเพิ่ม: colorCode (MoodColorCode), moodScore (Int 1-5), logDate (Date)
   + unique(userId, logDate) เพื่อให้นับ "เศร้าติดกัน 3 วัน" ได้แม่นยำระดับ DB     */
export type MoodColorCode = 'YELLOW' | 'GREEN' | 'BLUE' | 'RED' | 'GRAY'

export interface MoodPotionLog {
  id: string
  userId: string
  /** วันที่แบบ YYYY-MM-DD (โซนเวลา Bangkok) — 1 คน 1 วัน 1 record */
  logDate: string
  colorCode: MoodColorCode
  /** 1-5 ความเข้มของอารมณ์ที่ผู้ใช้กวนลงหม้อ (จำนวนขวดยาที่เท) */
  moodScore: number
  note: string | null
  createdAt: string
}

/* ── 2) ระบบคัดกรองภาวะซึมเศร้า (Depression Screening) ───────────────────────
   ตาราง mental_health_screenings มีอยู่แล้วใน schema ครบเกือบทุก field
   [ต้องเพิ่ม] nextDueAt (DateTime?) เพื่อคุมรอบ "เดือนละ 1 ครั้ง" ที่ระดับข้อมูล     */
export type ScreeningTriggerType = 'ROUTINE' | 'EMERGENCY'

export interface ScreeningAnswer {
  /** เลขข้อ 1-5 ตามลำดับใน SCREENING_QUESTIONS */
  question: number
  /** 0 = ไม่มีเลย, 1 = เป็นบางวัน, 2 = เป็นบ่อย, 3 = เป็นแทบทุกวัน */
  score: 0 | 1 | 2 | 3
}

export interface ScreeningResultRecord {
  id: string
  userId: string
  triggerType: ScreeningTriggerType
  answers: ScreeningAnswer[]
  /** 0-15 */
  totalScore: number
  riskLevel: RiskLevel
  createdAt: string
  /** วันครบกำหนดทำรอบถัดไป (ปกติ +30 วัน) */
  nextDueAt: string
}

/** คำขอให้เด้งแบบประเมิน — ยังไม่ใช่ผลลัพธ์ เป็นแค่ "สัญญาณ" ให้ UI เปิดหน้าประเมิน */
export interface PendingScreening {
  triggerType: ScreeningTriggerType
  /** ข้อความอธิบายเหตุผลที่เด้ง แสดงหัวหน้าจอประเมิน */
  reason: string
}

/* ── 3) Activity Log (เตาเผา / ฝึกหายใจ / อาบแดด / โฟกัส ฯลฯ) ────────────────
   [ต้องเพิ่มใน DB] ยังไม่มีตารางนี้เลย — ER Diagram ในเอกสารเรียกว่า Action /
   Activity_Logs (activity_id, user_id, activity_type, duration_seconds, completed_at)
   quest_logs เก็บได้แค่ "ทำ/ไม่ทำ" เก็บ "ทำนานแค่ไหน ทำอะไรไปบ้าง" ไม่ได้           */
export type ActivityType =
  | 'BREATHING'      // ทอดสมอใจ
  | 'INCINERATOR'    // เตาเผาขยะความคิด
  | 'ORACLE'         // ไพ่ทิพย์ + ภารกิจ 2 นาที
  | 'SUNLIGHT'       // Photosynthesis / อาบแดดรับแสง
  | 'GREEN_VISION'   // พักสายตา 20-20-20
  | 'HYDRATION'      // ดื่มน้ำ
  | 'SCREEN_CURFEW'  // ตัดจอก่อนนอน
  | 'DEEP_WORK'      // The Deep Root
  | 'BRAIN_DUMP'     // อัดเสียงทวนความจำ
  | 'REVIEW'         // ทบทวนแบบเว้นระยะ (กลยุทธ์การรอคอย)
  | 'CHECKIN'        // Daily Learning Check-in
  // [เพิ่มรอบนี้ — เควสสุขภาพใหม่]
  | 'STEPS'          // Vitality Steps (จังหวะแห่งรากแก้ว)
  | 'NUTRITION'      // Balanced Nutrients (สารอาหารแห่งผืนดิน)

export interface ActivityLogRecord {
  id: string
  userId: string
  activityType: ActivityType
  /** วินาทีที่ทำจริง (0 ถ้าเป็นกิจกรรมกดยืนยันครั้งเดียว) */
  durationSeconds: number
  /** ผลลัพธ์เฉพาะของกิจกรรมนั้น เช่น { cycles: 6 } หรือ { glasses: 1 } */
  meta: Record<string, unknown>
  completedAt: string
}

/* ── 4) ไพ่ทิพย์ (Oracle Draws) ──────────────────────────────────────────────
   [ต้องเพิ่มใน DB] ตาราง oracle_draws ตาม ER Diagram — ยังไม่มีใน schema         */
export interface OracleDrawRecord {
  id: string
  userId: string
  drawDate: string
  cardName: string
  taskName: string
  isCompleted: boolean
  completedAt: string | null
}

/* ── 5) Daily Learning Check-in (5 คำถามรดน้ำต้นไม้) ─────────────────────────
   [ต้องเพิ่มใน DB] ตาราง learning_checkins — ตอนนี้ผลประเมิน 5 ข้อไม่มีที่เก็บเลย
   (quest_logs เก็บได้แค่ status) ทำให้ทำ "สถิติย้อนหลัง" ตามเอกสารไม่ได้จริง       */
export interface LearningCheckinRecord {
  id: string
  userId: string
  checkinDate: string
  /** ทุกข้อให้คะแนน 1-5 ดาว */
  goalClarity: number
  deepFocus: number
  activeRecall: number
  qualityRest: number
  satisfaction: number
  /** คำถามโบนัส "พรุ่งนี้อยากปรับอะไร" → เอาไปแปะเป็น Post-it */
  bonusNote: string | null
  createdAt: string
}

/* ── 7) Badge / Achievement — [เพิ่มตามที่ระบุ] backend มีตาราง badges + user_badges
   (ดู schema.prisma) แต่ frontend ไม่เคยมีระบบแสดงผล badge เลยแม้แต่จุดเดียว ตอนนี้เพิ่ม
   กลไกจริงให้ 2 badge ที่ถูกตัดสินใจให้สร้างแล้ว (Strategic Delay / Mirror of Truth)
   [ต้องเพิ่มใน DB] ตาราง user_badges (ผูก userId+badgeCode+earnedAt) — ตอนนี้เป็น
   client-only state ล้วนๆ ใน MentalContext เหมือน moodPotionLogs/activityLogs อื่นๆ      */
export interface UserBadgeRecord {
  code: string
  earnedAt: string
}

/** ฟีดแบ็กสั้นๆ หลังทำเควสสำเร็จ — ใช้ประเมิน badge "Mirror of Truth" (feedbackWithinHours
 *  criteria ใน seed.ts: ให้ feedback ทันทีหลังทำกิจกรรมเสร็จ) [ต้องเพิ่มใน DB] ยังไม่มีตาราง
 *  รองรับ — ใกล้เคียง quest_logs แต่เป็นคนละ record (feedback แยกจากตัวเควสเอง) */
export interface QuestFeedbackRecord {
  id: string
  questCode: string
  reaction: 'good' | 'neutral' | 'bad'
  /** เวลาที่ทำเควสสำเร็จ (ใช้เทียบกับ submittedAt ว่าอยู่ในกรอบ 24 ชม. ไหม) */
  completedAt: string
  submittedAt: string
}

/* ── 6) payload ของการเล่นเควสแต่ละครั้ง ─────────────────────────────────────
   [ต้องเพิ่มใน DB] quest_logs.payload (Json?) + quest_logs.durationSeconds (Int?)
   ตอนนี้ผู้ใช้ตั้งเป้าหมาย/พิมพ์คำตอบ/จับเวลาไปเท่าไหร่ ไม่ถูกบันทึกลงที่ไหนเลย      */
export type QuestPlayPayload = Record<string, unknown>

/** props มาตรฐานที่ "ไฟล์เกมของแต่ละเควส" ทุกไฟล์รับเหมือนกันหมด */
export interface QuestGameProps {
  accent: string
  accentBg: string
  /** เรียกเมื่อเล่นจบ → GameShell จะสลับไปหน้ารับรางวัลให้เอง */
  finish: (payload?: QuestPlayPayload) => void
  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] true = ห้ามมีทางลัด เกมจับเวลาต้องซ่อนปุ่มข้าม/ปุ่มลัดใดๆ
   *  ที่ทำให้จบก่อนเวลาจริง — เกมที่ไม่มีกลไกจับเวลาไม่ต้องอ่านค่านี้เลยก็ได้ */
  strictMode: boolean
  /** [เพิ่มรอบนี้] เฉพาะเกมที่มีกลไกจับเวลา (นับถอยหลัง/บังคับรอ) เรียกแทน finish() เมื่อผู้เล่น
   *  กด "ข้าม" กลางคัน — จบเควสทันทีแต่ได้รางวัลครึ่งเดียว (ตายตัว ไม่คิดตามสัดส่วนเวลาที่ทำจริง)
   *  ห้ามแสดงปุ่มนี้เลยเมื่อ strictMode === true */
  skip: (payload?: QuestPlayPayload) => void
  /** [เพิ่มรอบนี้ — แก้บั๊กที่พบจากการทดสอบจริง] ออกจากเควสเลยโดยไม่นับว่าสำเร็จและไม่ได้รางวัล
   *  (คนละอย่างกับ skip() ที่ยังได้รางวัลครึ่งเดียว) — เกมที่ปุ่มปิดของ GameShell ถูกจอเนื้อหา
   *  ของตัวเองบังจนกดไม่ถึง (เช่น CameraCapture ที่ทำ position:fixed;inset:0 ทับหัวเรื่องของ
   *  GameShell ไปแล้ว) ต้องโชว์ปุ่มออกของตัวเองแล้วเรียก exit() นี้แทน ไม่งั้นผู้เล่นติดอยู่ใน
   *  หน้าเกมโดยไม่มีทางออกเลย */
  exit: () => void
}