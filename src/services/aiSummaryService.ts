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

// ═══════════════════════════════════════════════════════════════════════
// [ใหม่รอบนี้ — เควส "แคลอรี่ตาม BMI"] analyzeFoodPhoto — วิเคราะห์รูปมื้ออาหารจริง
// ═══════════════════════════════════════════════════════════════════════
// [สำคัญ — ต่างจากทุกฟังก์ชันด้านบนในไฟล์นี้] getOracleActionPlan/getJournalReflection/
// getGratitudeReflection ทั้งหมดข้างบนเป็น mock ล้วน (สุ่มเลือกข้อความจากเทมเพลตคงที่ ไม่มี
// การเรียก network ใดๆ เลย) — ฟังก์ชันนี้ต่างออกไปโดยสิ้นเชิง: เป็นการเรียก AI vision API
// "จริง" (OpenAI Chat Completions แบบส่งรูปภาพ) ไม่ใช่ mock อีกต่อไปตามที่ระบุ
//
// [ข้อจำกัดด้านความปลอดภัยที่ต้องแจ้งชัดเจน] โปรเจกต์นี้ยังไม่มี backend ของตัวเองที่รับคำขอ
// จริงได้เลย (ดู http.ts — API_MODE ยังเป็น mock เสมอ ไม่มี endpoint ฝั่งเซิร์ฟเวอร์รองรับจริง)
// ฟังก์ชันนี้จึงเรียก OpenAI ตรงจากฝั่ง client โดยแนบ API key ไว้ใน bundle — เหมาะสำหรับ
// เดโม/ทดสอบเท่านั้น "ห้ามใช้แบบนี้ในโปรดักชันจริง" เพราะใครก็ตามที่เปิด dev tools ดู network
// request หรือแกะ JS bundle จะเห็น API key แล้วเอาไปใช้แทนได้ (ถูกเรียกเก็บเงินแทนเจ้าของ key)
// ก่อนขึ้นโปรดักชันจริงต้องย้ายการเรียกนี้ไปอยู่หลัง backend endpoint ของตัวเอง (เช่น
// POST /api/ai/analyze-food-photo ผ่าน http.ts เหมือน service อื่นๆ) แล้วเก็บ API key ไว้ฝั่ง
// เซิร์ฟเวอร์เท่านั้น
//
// ตั้งค่าที่ต้องทำก่อนใช้งานจริง (ดูสรุปท้ายบทสนทนา):
//   VITE_AI_VISION_API_KEY=<OpenAI API key ของคุณ>   (ต้องขึ้นต้น sk-... จาก platform.openai.com)
//   VITE_AI_VISION_MODEL=gpt-4o-mini                  (ไม่ตั้ง = ใช้ค่าเริ่มต้นนี้ — ต้องเป็น
//                                                       โมเดลที่รองรับ image input เท่านั้น)
// ถ้าไม่ตั้งค่า VITE_AI_VISION_API_KEY เลย analyzeFoodPhoto() จะโยน error
// 'AI_VISION_NOT_CONFIGURED' ทันที ไม่เรียก network ไม่ auto-approve เงียบๆ — ฝั่งเรียกใช้
// (BalancedNutrientsQuest.tsx) ต้อง catch แล้วแจ้งผู้ใช้ว่าตรวจสอบไม่ได้ตอนนี้

export interface FoodPhotoAnalysis {
  /** false = AI มองว่ารูปนี้ไม่มีอาหารอยู่เลย (เช่น ถ่ายผิด/ไม่ชัด/เป็นสิ่งอื่น) */
  isFood: boolean
  /** ประมาณแคลอรี่รวมของมื้อในรูป (kcal) — 0 เสมอถ้า isFood เป็น false */
  estimatedCalories: number
  /** คำอธิบายสั้นๆ ว่า AI เห็นอะไรในรูป (ภาษาไทย) ให้ผู้ใช้เห็นว่าระบบตีความรูปว่าอย่างไร */
  foodDescription: string
}

const AI_VISION_API_KEY = import.meta.env.VITE_AI_VISION_API_KEY as string | undefined
const AI_VISION_MODEL = (import.meta.env.VITE_AI_VISION_MODEL as string | undefined)?.trim() || 'gpt-4o-mini'
const AI_VISION_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

const FOOD_ANALYSIS_SYSTEM_PROMPT =
  'คุณเป็นผู้ช่วยประเมินแคลอรี่จากรูปมื้ออาหารคร่าวๆ ตอบกลับเป็น JSON object เท่านั้น ' +
  'ห้ามมีข้อความอื่นนอกเหนือจาก JSON รูปแบบต้องเป็น ' +
  '{"isFood": boolean, "estimatedCalories": number, "foodDescription": string} ' +
  'ถ้ารูปที่ได้รับไม่มีอาหารอยู่เลย ให้ isFood เป็น false และ estimatedCalories เป็น 0 ' +
  'foodDescription ต้องเป็นภาษาไทยเสมอ สั้นกระชับไม่เกิน 1-2 ประโยค'

/** true = มี OpenAI API key ตั้งค่าไว้ใน .env แล้ว (แค่ "พร้อมลอง" ไม่ได้แปลว่า key ยังใช้ได้จริง
 * หรือไม่หมดโควต้า) */
export function isFoodPhotoAnalysisConfigured(): boolean {
  return typeof AI_VISION_API_KEY === 'string' && AI_VISION_API_KEY.trim().length > 0
}

function isValidFoodPhotoAnalysis(value: unknown): value is FoodPhotoAnalysis {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.isFood === 'boolean' && typeof v.estimatedCalories === 'number' && typeof v.foodDescription === 'string'
}

/**
 * ส่งรูปมื้ออาหาร (data URL จาก CameraCapture.tsx — image/jpeg หรือ image/* ที่แนบจากคลังภาพ)
 * ไปให้ OpenAI vision model วิเคราะห์จริง คืนค่าที่ AI ประเมิน (ไม่ใช่ค่าคงที่/สุ่มแบบ mock อื่น
 * ในไฟล์นี้) โยน error ที่มีความหมายชัดเจนถ้า: ยังไม่ได้ตั้งค่า key (AI_VISION_NOT_CONFIGURED),
 * เรียก API ไม่สำเร็จ (AI_VISION_HTTP_xxx), หรือ AI ตอบกลับมาไม่ตรงรูปแบบที่คาดไว้
 * (AI_VISION_INVALID_RESPONSE) — ฝั่งเรียกใช้ต้อง catch ทั้งหมดนี้เอง ไม่มี fallback
 * auto-approve ในฟังก์ชันนี้โดยตั้งใจ (ตามที่ระบุ "ไม่ mock auto-approve อีกต่อไป")
 */
export async function analyzeFoodPhoto(imageBase64: string): Promise<FoodPhotoAnalysis> {
  if (!isFoodPhotoAnalysisConfigured()) {
    throw new Error('AI_VISION_NOT_CONFIGURED')
  }

  const res = await fetch(AI_VISION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_VISION_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_VISION_MODEL,
      response_format: { type: 'json_object' },
      max_tokens: 300,
      messages: [
        { role: 'system', content: FOOD_ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'นี่คือรูปมื้ออาหารมื้อหนึ่ง ช่วยประเมินว่าเป็นอาหารจริงไหม และประมาณแคลอรี่รวมของมื้อนี้' },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`AI_VISION_HTTP_${res.status}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('AI_VISION_INVALID_RESPONSE')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('AI_VISION_INVALID_RESPONSE')
  }

  if (!isValidFoodPhotoAnalysis(parsed)) {
    throw new Error('AI_VISION_INVALID_RESPONSE')
  }

  return parsed
}

/** ข้อความ error ภาษาไทยที่แสดงให้ผู้ใช้เห็นได้ตรงๆ — รวมไว้ที่นี่ที่เดียวกันข้อความไม่ตรงกัน
 * ระหว่างจุดที่เรียกใช้ต่างกัน (ปัจจุบันมีจุดเดียวคือ BalancedNutrientsQuest.tsx) */
export function describeFoodAnalysisError(err: unknown): string {
  const code = err instanceof Error ? err.message : ''
  if (code === 'AI_VISION_NOT_CONFIGURED') {
    return 'ระบบตรวจสอบรูปอาหารด้วย AI ยังไม่ได้ตั้งค่าในเครื่องนี้ — ตรวจสอบรูปไม่ได้ตอนนี้'
  }
  if (code.startsWith('AI_VISION_HTTP_')) {
    return 'เชื่อมต่อระบบตรวจสอบรูปอาหารไม่สำเร็จ — ตรวจสอบไม่ได้ตอนนี้ ลองใหม่อีกครั้ง'
  }
  if (code === 'AI_VISION_INVALID_RESPONSE') {
    return 'ระบบตรวจสอบรูปอาหารตอบกลับมาผิดปกติ — ลองถ่ายรูปใหม่อีกครั้ง'
  }
  return 'ตรวจสอบรูปอาหารไม่ได้ตอนนี้ — ลองใหม่อีกครั้ง'
}