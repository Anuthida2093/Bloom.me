/*============================================================================*\
  screening.ts — ระบบคัดกรองภาวะซึมเศร้า & Safety Net (ส่วนที่ 3 ของเอกสารสุขภาพจิต)
  ────────────────────────────────────────────────────────────────────────────
  ทฤษฎีรองรับ: Patient Health Questionnaire (PHQ) — ดัดแปลงจาก PHQ-2 / PHQ-9
  (Dr. Robert L. Spitzer) และอ้างอิงมาตรฐานแบบประเมิน 2Q/9Q ของกรมสุขภาพจิต

  คำถาม 5 ข้อ ให้คะแนนข้อละ 0-3 (รวม 0-15) แล้วแปรผลเป็น 3 ระดับ:
      0-4   LOW       ต้นไม้ปกติ แข็งแรงดี
      5-9   MODERATE  ดอกเริ่มหุบ + ล็อกเควสพลังงานสูง บังคับทำเควสสงบใจ
      10-15 HIGH      ดอกเหี่ยวเฉา + ขึ้นกล่องพยาบาล/สายด่วน 1323

  เกณฑ์คะแนนตรงกับ RiskLevel ใน docs/DATA_DICTIONARY.md (LOW 0-4, MODERATE 5-9, HIGH 10-15)
  ทุกอย่างที่ต้องแก้ข้อความ/เกณฑ์ในอนาคต แก้ที่ไฟล์นี้ไฟล์เดียวจบ
\*============================================================================*/

import type { RiskLevel } from '../types'
import type { ScreeningAnswer, ScreeningTriggerType } from '../types.mental'

/** จำนวนวันที่ปรุงน้ำยาสีน้ำเงิน/เทาติดกัน แล้วเด้งแบบประเมินทันที */
export const NEGATIVE_STREAK_TRIGGER = 3

/** รอบตรวจประจำ (Routine Check) — เดือนละ 1 ครั้ง */
export const ROUTINE_INTERVAL_DAYS = 30

export interface ScreeningQuestion {
  no: number
  text: string
  hint: string
}

/** คำถาม 5 ข้อ ถามถึงความถี่ของอาการ "ใน 2 สัปดาห์ที่ผ่านมา" */
export const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  { no: 1, text: 'คุณรู้สึกเบื่อหน่าย ไม่มีความสนใจ หรือไม่มีความสุขในการทำสิ่งต่างๆ เลยใช่หรือไม่?', hint: 'Anhedonia — ความสนใจในกิจกรรมที่เคยชอบลดลง' },
  { no: 2, text: 'คุณรู้สึกเศร้า ซึม หดหู่ หรือสิ้นหวัง ใช่หรือไม่?', hint: 'Depressed mood — อารมณ์เศร้าต่อเนื่อง' },
  { no: 3, text: 'คุณมีปัญหาเรื่องการนอน (หลับยาก ตื่นเร็วกว่าปกติ หรือนอนมากเกินไป) ใช่หรือไม่?', hint: 'Sleep disturbance' },
  { no: 4, text: 'คุณรู้สึกเหนื่อยล้า อ่อนเพลีย ไม่มีเรี่ยวแรงจะทำอะไรเลย ใช่หรือไม่?', hint: 'Fatigue / loss of energy' },
  { no: 5, text: 'คุณรู้สึกแย่กับตัวเอง คิดว่าตัวเองล้มเหลว หรือทำให้คนอื่นผิดหวัง ใช่หรือไม่?', hint: 'Negative self-view' },
]

export const SCORE_CHOICES: { score: 0 | 1 | 2 | 3; label: string }[] = [
  { score: 0, label: 'ไม่มีเลย' },
  { score: 1, label: 'เป็นบางวัน' },
  { score: 2, label: 'เป็นบ่อย' },
  { score: 3, label: 'เป็นแทบทุกวัน' },
]

export function computeTotalScore(answers: ScreeningAnswer[]): number {
  return answers.reduce((sum, a) => sum + a.score, 0)
}

export function computeRiskLevel(totalScore: number): RiskLevel {
  if (totalScore >= 10) return 'HIGH'
  if (totalScore >= 5) return 'MODERATE'
  return 'LOW'
}

export interface RiskPlan {
  level: RiskLevel
  headline: string
  /** สถานะต้นไม้ที่ต้องแสดง */
  treeStatus: string
  /** ข้อความจากระบบ — โทนเห็นอกเห็นใจ ห้ามตัดสิน */
  advice: string
  /** สิ่งที่ระบบทำต่อโดยอัตโนมัติ */
  actions: string[]
  accent: string
  emoji: string
}

export const RISK_PLANS: Record<RiskLevel, RiskPlan> = {
  LOW: {
    level: 'LOW',
    headline: 'ความเสี่ยงต่ำ (คะแนน 0-4)',
    treeStatus: 'ปกติ แข็งแรงดี',
    advice: 'สภาพจิตใจของคุณแข็งแรงดีมาก! รดน้ำและดูแลต้นไม้ของคุณต่อไปนะ ทำเควสประจำวันเพื่อรักษาสมดุลนี้ไว้',
    actions: ['เควสทุกหมวดเปิดให้ทำได้ตามปกติ', 'ระบบจะชวนทำแบบประเมินอีกครั้งในอีก 30 วัน'],
    accent: '#52B788',
    emoji: '🌳',
  },
  MODERATE: {
    level: 'MODERATE',
    headline: 'ความเสี่ยงปานกลาง / มีความเครียดสะสม (คะแนน 5-9)',
    treeStatus: 'ดอกไม้เริ่มหุบ ใบไม้มีสีซีดเล็กน้อย',
    advice: 'ช่วงนี้คุณดูแบกรับอะไรไว้เยอะ ต้นไม้ของคุณต้องการการพักฟื้นนะ',
    actions: [
      'ล็อกเควสที่ใช้พลังงานสูงไว้ชั่วคราว (เช่น หยั่งรากลึก 90 นาที)',
      'บังคับให้ทำเควสทอดสมอใจ (ฝึกหายใจ) หรือเตาเผาขยะความคิด เพื่อปลดปล่อยความเครียด',
      'แนะนำให้หาเวลาพักผ่อนให้เพียงพอ',
    ],
    accent: '#E8A020',
    emoji: '🥀',
  },
  HIGH: {
    level: 'HIGH',
    headline: 'ความเสี่ยงสูง / มีแนวโน้มซึมเศร้า (คะแนน 10-15)',
    treeStatus: 'ดอกไม้เหี่ยวเฉา มีไอคอนกล่องพยาบาลลอยอยู่เหนือต้นไม้',
    advice: 'ต้นไม้ของคุณกำลังส่งสัญญาณว่าคุณเหนื่อยล้าเกินไปแล้ว การพยายามจัดการทุกอย่างคนเดียวอาจจะหนักเกินไปในตอนนี้ การขอความช่วยเหลือไม่ใช่เรื่องผิดนะ',
    actions: [
      'เปิดกล่องพยาบาล: กดโทรสายด่วนสุขภาพจิต 1323 ได้ทันที',
      'มีช่องทางปรึกษาจิตแพทย์ออนไลน์ (Tele-psychiatry)',
      'ล็อกเควสพลังงานสูงทั้งหมด เหลือเฉพาะเควสสงบใจ',
    ],
    accent: '#EF476F',
    emoji: '🧰',
  },
}

/** ข้อมูลสายด่วน/ช่องทางช่วยเหลือ — แก้เบอร์/ลิงก์ได้ที่นี่ที่เดียว */
export const SAFETY_NET_CONTACTS = [
  {
    id: 'hotline-1323',
    icon: '📞',
    title: 'สายด่วนสุขภาพจิต 1323',
    subtitle: 'กรมสุขภาพจิต · โทรฟรี ตลอด 24 ชั่วโมง',
    href: 'tel:1323',
    primary: true,
  },
  {
    id: 'samaritans',
    icon: '💬',
    title: 'สะมาริตันส์ 02-113-6789',
    subtitle: 'รับฟังโดยอาสาสมัคร ทุกวัน 12:00-22:00 น.',
    href: 'tel:021136789',
    primary: false,
  },
  {
    id: 'tele-psychiatry',
    icon: '🩺',
    title: 'ปรึกษาจิตแพทย์ออนไลน์',
    subtitle: 'นัดหมาย Tele-psychiatry กับคลินิกที่เชื่อมต่อไว้',
    href: 'https://www.dmh.go.th/',
    primary: false,
  },
]

export const SAFETY_NET_DISCLAIMER =
  'Tree of Life เป็นเพียงเครื่องมือดูแลเบื้องต้น ไม่สามารถแทนที่การรักษาจากแพทย์ผู้เชี่ยวชาญได้'

export function buildTriggerReason(triggerType: ScreeningTriggerType, negativeDays: number): string {
  if (triggerType === 'EMERGENCY') {
    return `ระบบเห็นว่าคุณปรุงน้ำยาเป็นสีน้ำเงิน/เทาติดกัน ${negativeDays} วันแล้ว ขอชวนคุยด้วยคำถามสั้นๆ 5 ข้อนะ`
  }
  return 'ครบรอบตรวจสุขภาพใจประจำเดือนแล้ว ใช้เวลาไม่ถึง 2 นาที'
}

/** วันครบกำหนดรอบถัดไป (ISO string) */
export function computeNextDueAt(from: Date = new Date()): string {
  const next = new Date(from)
  next.setDate(next.getDate() + ROUTINE_INTERVAL_DAYS)
  return next.toISOString()
}