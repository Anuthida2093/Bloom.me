import type { MoodEntryData } from '../types'

/**
 * aiSummaryService.ts
 * ────────────────────
 * รวม service ที่ยัง mock ผลลัพธ์แบบ AI (async, มี delay จำลอง, คืนค่าเป็น Promise) เพื่อให้
 * สลับไปเรียก backend จริงได้ในอนาคตโดยไม่ต้องแก้ signature/ฝั่ง component ที่เรียกใช้
 *
 * [แก้ตามที่ระบุ] getTreeSummary (สรุปตัวตนต้นไม้ด้วย AI mock) ถูกถอดออกไปแล้ว — popup
 * ที่ขึ้นตอนกดต้นไม้ (TreeSummaryModal.tsx) เปลี่ยนไปแสดงคำอธิบาย MBTI จริงแทน (ดู
 * src/config/mbtiDescriptions.ts) ไม่ใช่บทความ AI mock อีกต่อไป
 */

// ═══════════════════════════════════════════════════════════════════════
// [ใหม่] getOracleActionPlan — เควส "ไพ่ทิพย์กระตุ้นพลัง" (ment-oracle-activation)
// ═══════════════════════════════════════════════════════════════════════
// ใช้ pattern เดียวกับ getTreeSummary() ด้านบนทุกกระเบียดนิ้ว (async, delay จำลอง,
// คืนค่า Promise) — ไม่สร้าง service แยกใหม่อีกไฟล์ ตามที่ระบุไว้

export interface OracleActionPlanRequest {
  /** อารมณ์วันนี้จริงจาก MoodCheckIn (moodEntries ล่าสุดของวัน) — ตรง field backend เป๊ะ */
  moodEntry: Pick<MoodEntryData, 'category' | 'mood' | 'note'>
  /** ชื่อไพ่ 3 ใบที่ผู้ใช้เปิดได้ */
  cardTitles: [string, string, string]
}

export interface OracleActionPlanResponse {
  actionPlan: string
  generatedAt: string
}

const ACTION_PLAN_TEMPLATES: string[] = [
  'จากพลังของ "{c1}" "{c2}" และ "{c3}" ที่เปิดได้วันนี้ ลองเริ่มจากสิ่งเล็กๆ ก่อน: หาเวลา 5 นาทีระหว่างวันนี้ นั่งเงียบๆ แล้วถามตัวเองว่า "ตอนนี้ฉันต้องการอะไรที่สุด" แล้วให้สิ่งนั้นเกิดขึ้นจริง แม้จะเล็กแค่ไหนก็ตาม',
  'ไพ่ "{c1}" "{c2}" "{c3}" กำลังบอกว่าวันนี้ไม่ต้องเร่งรีบก็ได้ ลองส่งข้อความหาใครสักคนที่ไว้ใจได้ บอกเล่าความรู้สึกตรงๆ แค่ประโยคเดียวก็พอ — บางทีสิ่งที่ต้องทำที่สุดคือแค่ไม่ต้องแบกไว้คนเดียว',
  'รับพลังจาก "{c1}" "{c2}" "{c3}" แล้ว ลองทำสิ่งนี้วันนี้: ปิดแจ้งเตือนมือถือ 15 นาที แล้วออกไปเดินเล่นข้างนอกโดยไม่ต้องมีจุดหมาย ให้ร่างกายได้ขยับก่อนที่ใจจะตามทัน',
  '"{c1}" "{c2}" และ "{c3}" ชวนให้คุณลองเขียนสิ่งที่ทำสำเร็จวันนี้ลงกระดาษสัก 1 อย่าง ไม่ว่าจะเล็กแค่ไหน — บางครั้งใจที่เหนื่อยล้าแค่ต้องการหลักฐานว่ามันพยายามมามากพอแล้ว',
]

export async function getOracleActionPlan(request: OracleActionPlanRequest): Promise<OracleActionPlanResponse> {
  const delayMs = 1100 + Math.random() * 800
  await new Promise((resolve) => setTimeout(resolve, delayMs))

  const template = ACTION_PLAN_TEMPLATES[Math.floor(Math.random() * ACTION_PLAN_TEMPLATES.length)]
  const actionPlan = template
    .replaceAll('{c1}', request.cardTitles[0])
    .replaceAll('{c2}', request.cardTitles[1])
    .replaceAll('{c3}', request.cardTitles[2])

  return { actionPlan, generatedAt: new Date().toISOString() }
}

// ═══════════════════════════════════════════════════════════════════════
// [ใหม่] getJournalReflection — เควส "สมุดบันทึกรากไม้เรืองแสง" (ment-reframer-journal)
// ═══════════════════════════════════════════════════════════════════════

export interface JournalReflectionRequest {
  moodEntry: Pick<MoodEntryData, 'category' | 'mood' | 'note'>
  /** ข้อความที่ผู้ใช้เขียนลงสมุดวันนี้ */
  journalText: string
}

export interface JournalReflectionResponse {
  reflection: string
  generatedAt: string
}

const REFLECTION_INTROS: Record<MoodEntryData['category'], string[]> = {
  POSITIVE: [
    'อ่านสิ่งที่คุณเขียนวันนี้แล้วรู้สึกอบอุ่นไปด้วย — ความสุขแบบนี้คือสิ่งที่ควรบันทึกไว้จริงๆ',
    'มีความรู้สึกดีๆ ซ่อนอยู่ในทุกบรรทัดที่เขียนมา ลองสังเกตว่าอะไรทำให้วันนี้เป็นแบบนี้ แล้วเก็บสูตรนี้ไว้ใช้อีก',
  ],
  NEUTRAL: [
    'วันธรรมดาๆ แบบนี้ก็มีความหมายของมันเสมอ — ไม่ต้องพิเศษทุกวันก็ได้ แค่ผ่านไปอย่างมั่นคงก็เพียงพอแล้ว',
    'บางทีความรู้สึกเฉยๆ ก็คือพื้นที่พักใจก่อนก้าวต่อไป ลองให้เวลาตัวเองอยู่กับจังหวะนี้โดยไม่ต้องรีบตัดสินอะไร',
  ],
  NEGATIVE: [
    'ขอบคุณที่กล้าเขียนความรู้สึกตรงๆ ออกมา — การยอมรับว่าวันนี้ไม่โอเคก็เป็นความกล้าหาญแบบหนึ่งเหมือนกัน',
    'สิ่งที่เขียนมาฟังดูหนักไม่น้อย ลองมองมันเป็นแค่ "สภาพอากาศของวันนี้" ไม่ใช่ "ตัวตนของคุณ" — พรุ่งนี้ฟ้าเปลี่ยนได้เสมอ',
  ],
}

export async function getJournalReflection(request: JournalReflectionRequest): Promise<JournalReflectionResponse> {
  const delayMs = 1200 + Math.random() * 900
  await new Promise((resolve) => setTimeout(resolve, delayMs))

  const pool = REFLECTION_INTROS[request.moodEntry.category] ?? REFLECTION_INTROS.NEUTRAL
  const intro = pool[Math.floor(Math.random() * pool.length)]
  const reflection = `${intro} เก็บบันทึกนี้ไว้เป็นหลักฐานว่าคุณผ่านวันนี้มาได้แล้วจริงๆ 🌿`

  return { reflection, generatedAt: new Date().toISOString() }
}

// ═══════════════════════════════════════════════════════════════════════
// [ใหม่] getGratitudeReflection — เควส "เกราะแห่งความขอบคุณ" (ment-gratitude-shield)
// ═══════════════════════════════════════════════════════════════════════
// ใช้ pattern เดียวกับ getJournalReflection ด้านบนทุกกระเบียดนิ้ว แค่โทนบวก/ขอบคุณ
// เฉพาะทาง (ไม่สนใจ mood category เหมือน journal — เกราะแห่งความขอบคุณเน้น "1 เรื่องดีๆ
// วันนี้" เป็นหลัก ไม่ต้องปรับโทนตามอารมณ์แย่ๆ)

export interface GratitudeReflectionRequest {
  /** สิ่งดีๆ 1 อย่างที่เกิดขึ้นวันนี้ ที่ผู้ใช้เขียนมา */
  gratitudeText: string
}

export interface GratitudeReflectionResponse {
  reflection: string
  generatedAt: string
}

const GRATITUDE_REFLECTIONS: string[] = [
  'การสังเกตเห็นสิ่งดีๆ แม้เล็กน้อยแบบนี้ คือการฝึก "positive bias" ที่ทรงพลังมาก — ยิ่งทำบ่อย สมองจะยิ่งมองเห็นสิ่งดีๆ รอบตัวได้ไวขึ้นเรื่อยๆ',
  'ขอบคุณที่แบ่งปันช่วงเวลาดีๆ นี้ — เกราะแห่งความขอบคุณของคุณแข็งแกร่งขึ้นอีกชั้นแล้ว พร้อมปกป้องใจจากวันที่ยากขึ้น',
  'สิ่งดีๆ ที่คุณเขียนมาอาจดูเล็ก แต่การหยุดสังเกตมันคือทักษะที่คนส่วนใหญ่มองข้าม — คุณกำลังฝึกมันอยู่ ทำได้ดีมาก',
]

export async function getGratitudeReflection(request: GratitudeReflectionRequest): Promise<GratitudeReflectionResponse> {
  const delayMs = 1200 + Math.random() * 900
  await new Promise((resolve) => setTimeout(resolve, delayMs))

  const base = GRATITUDE_REFLECTIONS[Math.floor(Math.random() * GRATITUDE_REFLECTIONS.length)]
  const reflection = request.gratitudeText.trim()
    ? `${base} 🛡️✨`
    : base

  return { reflection, generatedAt: new Date().toISOString() }
}