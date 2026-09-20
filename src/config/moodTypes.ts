// src/config/moodTypes.ts
import type { MoodTypeValue, MoodCategory } from '../types'

/*============================================================================*\
  moodTypes.ts — [ไฟล์ใหม่ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์]
  ────────────────────────────────────────────────────────────────────────────
  ก่อนหน้านี้ MOOD_EMOJI (emoji ต่อ mood ทั้ง 8 ค่า) เป็น const ท้องถิ่นซ้ำกันในหลายไฟล์
  (OracleCardsPage.tsx ฯลฯ) และช่องทางเช็คอินอารมณ์จริง (MoodCheckIn.tsx) ก็ยังมีแค่ 3 ปุ่ม
  "ดี/เฉยๆ/ไม่ดี" ไม่เคยผลิตค่าอื่นนอกจาก HAPPY/CALM/SAD เลย — ทั้งที่ backend (schema.prisma)
  มี MoodType 8 ค่าจริง และเอกสารตั้งใจให้เป็น "3 bucket ใหญ่ (MoodCategory) → เลือก sub-emotion
  ละเอียดจาก bottom sheet" (ดู comment ของ enum MoodCategory ใน schema.prisma)

  ไฟล์นี้เป็นจุดเดียวที่นิยาม 8 อารมณ์ + จัดกลุ่มเข้า 3 bucket — MoodCheckIn.tsx ใช้จัด
  bottom sheet จริง ส่วนไฟล์อื่นที่เคยมี MOOD_EMOJI ท้องถิ่นของตัวเอง (OracleCardsPage.tsx)
  ควรอ้างจากที่นี่แทนเพื่อไม่ให้ซ้ำ/เพี้ยนกันเอง
\*============================================================================*/

export interface MoodTypeInfo {
  value: MoodTypeValue
  emoji: string
  label: string
}

export const MOOD_TYPE_INFO: Record<MoodTypeValue, MoodTypeInfo> = {
  HAPPY: { value: 'HAPPY', emoji: '😊', label: 'มีความสุข' },
  ENERGETIC: { value: 'ENERGETIC', emoji: '⚡', label: 'มีพลัง' },
  FOCUSED: { value: 'FOCUSED', emoji: '🎯', label: 'จดจ่อ' },
  CALM: { value: 'CALM', emoji: '😐', label: 'สงบ' },
  SAD: { value: 'SAD', emoji: '😔', label: 'เศร้า' },
  ANXIOUS: { value: 'ANXIOUS', emoji: '😰', label: 'กังวล' },
  TIRED: { value: 'TIRED', emoji: '😴', label: 'เหนื่อยล้า' },
  ANGRY: { value: 'ANGRY', emoji: '😠', label: 'หงุดหงิด' },
}

/** [เพิ่มตามที่ระบุ] จัดกลุ่ม 8 อารมณ์ย่อยเข้า 3 bucket ใหญ่ — schema.prisma ไม่ได้ระบุตาราง
 *  ผูกคู่ระหว่าง MoodType กับ MoodCategory ไว้ตรงๆ (มีแค่ comment อธิบายว่า "3 bucket ใหญ่
 *  → 8 อารมณ์ย่อยจาก bottom sheet") จึงจัดกลุ่มเองตามความหมายที่ใกล้เคียงที่สุด อ้างอิงจาก
 *  emoji/สี potion เดิมที่มีอยู่แล้วใน moodPotion.ts (YELLOW=ENERGETIC positive, GREEN=CALM
 *  neutral, BLUE/RED/GRAY=SAD/ANGRY/TIRED negative) */
export const MOOD_CATEGORY_SUBTYPES: Record<MoodCategory, MoodTypeValue[]> = {
  POSITIVE: ['HAPPY', 'ENERGETIC', 'FOCUSED'],
  NEUTRAL: ['CALM'],
  NEGATIVE: ['SAD', 'ANXIOUS', 'TIRED', 'ANGRY'],
}

/** MoodCheckIn.tsx ยังใช้ปุ่มเดิม 3 ปุ่ม "ดี/เฉยๆ/ไม่ดี" (MoodKey) เป็นขั้นแรกอยู่ —
 *  ตัวนี้แปลง MoodKey → MoodCategory จริงเพื่อเปิด bottom sheet เลือก sub-emotion ที่ถูกกลุ่ม */
export const LEGACY_KEY_TO_CATEGORY = { good: 'POSITIVE', neutral: 'NEUTRAL', bad: 'NEGATIVE' } as const satisfies Record<string, MoodCategory>
