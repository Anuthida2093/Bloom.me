/*============================================================================*\
  moodPotion.ts — รหัสสีอารมณ์ของเควส "ปรุงน้ำยาสำรวจใจ" (Daily Potion Check-in)
  ────────────────────────────────────────────────────────────────────────────
  อ้างอิงเอกสาร "เควสด้านสุขภาพจิต" ส่วนที่ 1 ข้อ 1 (Color Mapping 5 สี) และงานวิจัย
  Affect Labeling — "Putting Feelings into Words" (Lieberman, UCLA): การเรียกชื่ออารมณ์
  ช่วยลดการทำงานของ Amygdala และเพิ่มการทำงานของ Prefrontal Cortex

  สีน้ำเงิน (เศร้า) และสีเทา (หมดไฟ) ถูกทำเครื่องหมาย isNegative = true — สองสีนี้เท่านั้น
  ที่นับเข้าเงื่อนไข Emergency Trigger "ปรุงน้ำยาสีน้ำเงิน/เทา ติดกัน 3 วัน"
\*============================================================================*/

import type { MoodColorCode } from '../types.mental'
import type { MoodCategory, MoodTypeValue } from '../types'

export interface MoodPotionColor {
  code: MoodColorCode
  label: string
  sublabel: string
  hex: string
  glow: string
  emoji: string
  /** true = นับเป็นวัน "อารมณ์ลบ" สำหรับ Emergency Trigger */
  isNegative: boolean
  /** map ลงคอลัมน์ที่มีอยู่จริงใน mood_entries เพื่อให้ข้อมูลเดิมยังใช้ต่อได้ */
  backendCategory: MoodCategory
  backendMood: MoodTypeValue
}

export const MOOD_POTION_COLORS: MoodPotionColor[] = [
  {
    code: 'YELLOW', label: 'มีความสุข / มีพลัง', sublabel: 'จิตใจเบิกบาน พร้อมลุย',
    hex: '#F6C445', glow: '#FFE9A3', emoji: '🌟', isNegative: false,
    backendCategory: 'POSITIVE', backendMood: 'ENERGETIC',
  },
  {
    code: 'GREEN', label: 'สงบ / ผ่อนคลาย', sublabel: 'อารมณ์นิ่งๆ เป็นกลาง สบายใจ',
    hex: '#6FCF97', glow: '#C6F1D6', emoji: '🍃', isNegative: false,
    backendCategory: 'NEUTRAL', backendMood: 'CALM',
  },
  {
    code: 'BLUE', label: 'เศร้า / ดิ่ง / โดดเดี่ยว', sublabel: 'รู้สึกแย่ หดหู่ หรือเหงา',
    hex: '#5B8DEF', glow: '#BDD4FA', emoji: '💧', isNegative: true,
    backendCategory: 'NEGATIVE', backendMood: 'SAD',
  },
  {
    code: 'RED', label: 'เครียด / โกรธ / กดดัน', sublabel: 'ว้าวุ่นใจ หัวเสีย แบกภาระหนัก',
    hex: '#E4572E', glow: '#FFC9B5', emoji: '🔥', isNegative: false,
    backendCategory: 'NEGATIVE', backendMood: 'ANGRY',
  },
  {
    code: 'GRAY', label: 'ว่างเปล่า / หมดไฟ', sublabel: 'เฉยชา ไร้ความรู้สึก ไม่อยากทำอะไร',
    hex: '#9AA5B1', glow: '#DCE2E8', emoji: '🌫️', isNegative: true,
    backendCategory: 'NEGATIVE', backendMood: 'TIRED',
  },
]

export function findMoodColor(code: MoodColorCode): MoodPotionColor {
  return MOOD_POTION_COLORS.find((c) => c.code === code) ?? MOOD_POTION_COLORS[1]
}

/** แปลงปุ่มเช็คอินแบบเก่า (ดี/เฉยๆ/ไม่ดี) เป็นรหัสสี — ไม่ทำลาย MoodCheckIn เดิม */
export function legacyMoodToColor(mood: 'good' | 'neutral' | 'bad'): MoodColorCode {
  if (mood === 'good') return 'YELLOW'
  if (mood === 'bad') return 'BLUE'
  return 'GREEN'
}

/** วันที่รูปแบบ YYYY-MM-DD ตามเวลาไทย — คีย์มาตรฐาน "1 วัน 1 ครั้ง" ของทั้งระบบ */
export function bangkokDateKey(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
}

/** ถอยหลัง n วันจากวันนี้ แล้วคืนคีย์วันที่ */
export function dateKeyDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return bangkokDateKey(d)
}

/**
 * countConsecutiveNegativeDays — นับ "จำนวนวันติดกันล่าสุด" ที่ปรุงน้ำยาเป็นสีน้ำเงิน/เทา
 * เริ่มนับจากวันนี้ถอยหลัง ถ้าวันไหนเป็นสีอื่นหรือไม่มีบันทึก = ตัดสตรีคทันที
 * (ยกเว้นวันนี้ที่ยังไม่ได้เช็คอิน ไม่ถือว่าตัด เพราะยังปรุงได้อยู่)
 *
 * ครบ 3 วันติด → Emergency Trigger เด้งแบบประเมินคัดกรองทันที ตามเอกสารส่วนที่ 3
 */
export function countConsecutiveNegativeDays(
  logs: { logDate: string; colorCode: MoodColorCode }[],
): number {
  const byDate = new Map<string, MoodColorCode>()
  for (const log of logs) byDate.set(log.logDate, log.colorCode)

  let streak = 0
  for (let i = 0; i < 30; i++) {
    const color = byDate.get(dateKeyDaysAgo(i))
    if (!color) {
      if (i === 0) continue
      break
    }
    if (!findMoodColor(color).isNegative) break
    streak++
  }
  return streak
}