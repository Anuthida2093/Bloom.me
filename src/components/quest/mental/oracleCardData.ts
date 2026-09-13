// src/components/quest/mental/oracleCardData.ts
import type { MoodEntryData } from '../../../types'
import { seededRandom } from '../../../utils/seededRandom'

export interface OracleCard {
  id: string
  title: string
  icon: string
  /** ข้อความให้กำลังใจสั้นๆ (Positive Affirmation) ที่โผล่ตอนไพ่ใบนี้ถูกเปิด */
  affirmation: string
  /** ภารกิจกระตุ้นพฤติกรรมสั้นๆ 2 นาที (Behavioral Activation - BA) */
  twoMinuteTask: string
  /** คำสำคัญภาษาไทยที่ถ้าเจอในบันทึกอารมณ์ ไพ่ใบนี้ตรงประเด็นที่จะ "แก้" ความรู้สึกนั้น */
  keywords: string[]
  /** อารมณ์ (MoodTypeValue ของ backend) ที่ไพ่ใบนี้เหมาะเปิดให้ */
  moodTags: MoodEntryData['mood'][]
}

/**
 * ORACLE_CARDS — [อิงตามทฤษฎี Behavioral Activation (BA) & Positive Affirmation]
 * เนื้อหาไพ่เน้นการ Counteract ความรู้สึกลบ พร้อมแนบภารกิจ 2 นาทีที่ทำได้ทันที
 */
export const ORACLE_CARDS: OracleCard[] = [
  {
    id: 'rest',
    title: 'การพักผ่อน',
    icon: '🌙',
    affirmation: 'การหยุดพักไม่ใช่ความล้มเหลว มันคือส่วนหนึ่งของการเติบโต',
    twoMinuteTask: 'หลับตาลงช้าๆ พักสายตา และหายใจเข้าลึกๆ 5 ลมหายใจ',
    keywords: ['เหนื่อย', 'เพลีย', 'ล้า', 'ง่วง', 'หมดแรง'],
    moodTags: ['SAD', 'TIRED'],
  },
  {
    id: 'healing',
    title: 'การเยียวยา',
    icon: '🩹',
    affirmation: 'ทุกบาดแผลใช้เวลาของมันเอง ไม่ต้องเร่งตัวเองให้หายเร็วกว่าที่ควร',
    twoMinuteTask: 'ลุกไปดื่มน้ำเย็น 1 แก้วเต็มๆ แล้วส่องกระจกยิ้มให้ตัวเอง 1 ครั้ง',
    keywords: ['เจ็บ', 'ป่วย', 'บาดเจ็บ', 'ท้อ'],
    moodTags: ['SAD', 'TIRED'],
  },
  {
    id: 'self-compassion',
    title: 'ความเมตตาต่อตนเอง',
    icon: '💗',
    affirmation: 'พูดกับตัวเองเหมือนที่คุณจะพูดกับเพื่อนสนิทที่กำลังทุกข์ใจ',
    twoMinuteTask: 'สวมกอดตัวเองแน่นๆ 10 วินาที พร้อมบอกตัวเองว่า "เธอเก่งมากแล้ว"',
    keywords: ['ผิดหวัง', 'แย่', 'ล้มเหลว', 'โทษตัวเอง', 'ไม่ดีพอ'],
    moodTags: ['SAD', 'ANGRY'],
  },
  {
    id: 'calm-breath',
    title: 'ลมหายใจสงบ',
    icon: '🍃',
    affirmation: 'หายใจเข้าลึกๆ แล้วปล่อยสิ่งที่ควบคุมไม่ได้ให้ผ่านไป',
    twoMinuteTask: 'ลุกขึ้นยืดเส้นยืดสาย หมุนไหล่ไปข้างหลัง 10 ครั้ง และบิดเอวเบาๆ 2 นาที',
    keywords: ['เครียด', 'กังวล', 'กดดัน', 'วิตก'],
    moodTags: ['SAD', 'CALM', 'ANXIOUS', 'ANGRY'],
  },
  {
    id: 'hope',
    title: 'แสงแห่งความหวัง',
    icon: '✨',
    affirmation: 'แม้คืนนี้จะมืด แต่พรุ่งนี้ยังมีแสงใหม่รอคุณอยู่เสมอ',
    twoMinuteTask: 'เปิดหน้าต่างหรือเดินออกไปสูดอากาศภายนอก มองท้องฟ้า 1 นาที',
    keywords: ['มืดมน', 'สิ้นหวัง', 'เศร้า', 'ท้อแท้'],
    moodTags: ['SAD', 'TIRED'],
  },
  {
    id: 'inner-strength',
    title: 'พลังใจ',
    icon: '🔥',
    affirmation: 'คุณผ่านวันที่ยากมาได้เสมอ ครั้งนี้ก็เช่นกัน',
    twoMinuteTask: 'ลุกขึ้นยืนตรง ยืนกางขาเล็กน้อย เอามือแตะอก แล้วสูดหายใจยาวๆ 3 ครั้ง',
    keywords: ['อ่อนแอ', 'หมดแรง', 'ไม่ไหว'],
    moodTags: ['SAD', 'TIRED', 'ANXIOUS', 'ENERGETIC'],
  },
  {
    id: 'courage',
    title: 'ความกล้าหาญ',
    icon: '🦋',
    affirmation: 'ก้าวเล็กๆ ด้วยความกลัวก็ยังนับเป็นความกล้าอยู่ดี',
    twoMinuteTask: 'เขียนสิ่งที่กลัวหรือกังวลลงบนกระดาษ แล้วขยำทิ้งถังขยะทันที',
    keywords: ['กลัว', 'ไม่มั่นใจ', 'ประหม่า'],
    moodTags: ['SAD', 'CALM', 'ANXIOUS'],
  },
  {
    id: 'forgiveness',
    title: 'การให้อภัย',
    icon: '🕊️',
    affirmation: 'การปล่อยวางความโกรธคือของขวัญที่คุณมอบให้ตัวเอง',
    twoMinuteTask: 'ล้างหน้าด้วยน้ำเย็น ล้างความรู้สึกขุ่นมัวออกไป แล้วซับหน้าให้แห้ง',
    keywords: ['โกรธ', 'แค้น', 'หงุดหงิด', 'รำคาญ'],
    moodTags: ['SAD', 'ANGRY'],
  },
  {
    id: 'balance',
    title: 'ความสมดุล',
    icon: '⚖️',
    affirmation: 'ไม่ต้องทำทุกอย่างให้เสร็จวันนี้ แบ่งมันออกเป็นชิ้นเล็กๆ ได้เสมอ',
    twoMinuteTask: 'จัดเก็บโต๊ะทำงานหรือพื้นที่ตรงหน้าให้เป็นระเบียบขึ้นเล็กน้อย 2 นาที',
    keywords: ['วุ่นวาย', 'สับสน', 'เยอะ', 'มากไป'],
    moodTags: ['CALM', 'ANXIOUS', 'TIRED', 'FOCUSED'],
  },
  {
    id: 'growth',
    title: 'การเติบโต',
    icon: '🌱',
    affirmation: 'ทุกวันที่พยายาม คือวงปีใหม่ที่เพิ่มเข้ามาในตัวคุณ',
    twoMinuteTask: 'จิบน้ำช้าๆ 1 แก้ว และเขียนสิ่งที่ภูมิใจในตัวเองวันนี้ 1 ข้อ',
    keywords: ['พัฒนา', 'เรียนรู้', 'ตั้งใจ'],
    moodTags: ['HAPPY', 'CALM', 'FOCUSED'],
  },
  {
    id: 'gratitude',
    title: 'ความกตัญญู',
    icon: '🙏',
    affirmation: 'ลองมองสิ่งเล็กๆ ที่ทำให้วันนี้ดีขึ้น แล้วขอบคุณมันสักครั้ง',
    twoMinuteTask: 'ส่งข้อความสั้นๆ ไปขอบคุณหรือส่งความหวังดีให้คนที่คุณรัก 1 คน',
    keywords: ['ขอบคุณ', 'ดีใจ', 'ซาบซึ้ง'],
    moodTags: ['HAPPY'],
  },
  {
    id: 'positive-energy',
    title: 'พลังบวก',
    icon: '🌟',
    affirmation: 'ความสุขที่มีตอนนี้ มีค่าพอที่จะฉลองให้กับตัวเอง',
    twoMinuteTask: 'เปิดเพลงจังหวะสนุกๆ 1 เพลง แล้วขยับร่างกายตามจังหวะเบาๆ 2 นาที',
    keywords: ['สนุก', 'มีความสุข', 'ยินดี'],
    moodTags: ['HAPPY', 'ENERGETIC'],
  },
]

/**
 * selectOracleCards — เลือกไพ่ 1 ใบที่ดีที่สุด (ตรงประเด็นที่สุด) ให้ผู้ใช้
 */
export function selectOracleCards(moodEntry: Pick<MoodEntryData, 'mood' | 'note'>, seedKey: string): OracleCard[] {
  const rng = seededRandom(seedKey)
  const noteLower = (moodEntry.note ?? '').toLowerCase()

  const scored = ORACLE_CARDS.map((card) => {
    let score = 0
    if (card.keywords.some((k) => noteLower.includes(k))) score += 2
    if (card.moodTags.includes(moodEntry.mood)) score += 1
    score += rng() * 0.5 // จิตเตอร์ป้องกันสุ่มได้แบบเดิม
    return { card, score }
  })

  scored.sort((a, b) => b.score - a.score)
  // คืนค่าเฉพาะไพ่ใบที่ดีที่สุด 1 ใบ
  return [scored[0].card]
}