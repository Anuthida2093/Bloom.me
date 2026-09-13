import type { QuestCategory, QuestControlType } from '../types'

/**
 * questCatalog.ts
 * ────────────────
 * แคตตาล็อกเควสทั้งหมด อ้างอิงเอกสาร "ภาพรวมโปรเจกต์" + เอกสารเควส 3 ไฟล์
 *
 * [แก้รอบนี้ล่าสุด — เก็บกวาดเควสซ้ำซ้อน/ไม่ได้ใช้ตามที่ระบุ]
 *  1) รวม 'know-time-capsule' เข้ากับ 'know-strategic-delay' (ทั้งสองเป็นเรื่อง Spacing
 *     Effect เหมือนกัน ต่างแค่ระยะเวลา) เหลือเควสเดียวชื่อ "กลยุทธ์การรอคอย"
 *  2) ลบ 'know-mirror-of-truth' ออกทั้งระบบ (รวม questGameRegistry.ts + ไฟล์เกม)
 *  3) ลบ 'phys-mindful-breeze' ออกจากหมวดสุขภาพกาย — ซ้ำกับเควสฝึกหายใจในหมวดสุขภาพจิต
 *     (ตัดออกจาก CALMING_QUEST_CODES ด้วย)
 *  4) ลบ 'ment-daily-potion' ออกทั้งระบบ — การเช็กอินอารมณ์ประจำวันไหลผ่าน MoodGateScreen
 *     → MoodCheckIn.tsx (3 ปุ่มเดิม) ซึ่งเรียก submitMoodPotion() ท่อเดียวกันอยู่แล้ว
 *     (ตัดออกจาก SPECIAL_QUEST_CODES ด้วย)
 *  5) ลบ 'ment-sunlit-root' ออกจากหมวดสุขภาพจิต (MENTAL_SIDE) — ซ้ำกับ 'phys-photosynthesis'
 *     ในหมวดสุขภาพกาย (ทั้งคู่คือ "ออกไปรับแดดตอนเช้า" ทฤษฎีเดียวกัน — Circadian Rhythm /
 *     Serotonin) ต้นตอคือตอนย้ายกลไกจาก "จับเวลา" มาเป็น "ถ่ายรูปยืนยัน" (ดู SunlitRootGame.tsx
 *     เดิม) มีคนสร้างเป็นเควสใหม่แยกในหมวดจิตใจแทนที่จะแก้เควส phys-photosynthesis ตัวเดิม
 *     ทำให้เควสเดียวกันไปโผล่ซ้ำสองหมวด เหลือไว้แค่ใน HEALTH/physical ตามเดิม (ลบไฟล์เกม +
 *     รายการใน questGameRegistry.ts ทิ้งไปด้วย — ไม่มีใครอ้างอิงแล้ว)
 *
 * [แก้รอบก่อนหน้า — 3 อย่าง]
 *  1) เพิ่ม field `gameKey` — ชี้ว่าเควสนี้ใช้ไฟล์เกมไหนใน src/components/quest/games/
 *     (ดู questGameRegistry.ts) เพื่อให้ "1 เควส = 1 ไฟล์" แก้ไขง่าย ไม่ต้องรื้อ modal กลาง
 *  2) เพิ่ม field `energyLevel` + `isCalming` — ใช้โดยระบบ Moderate Risk Action:
 *     เมื่อ currentRiskLevel = MODERATE/HIGH ระบบจะล็อกเควส energyLevel:'HIGH' ทั้งหมด
 *     และปล่อยเฉพาะเควส isCalming ให้ทำได้ (ทอดสมอใจ / เตาเผาขยะความคิด)
 */

export type QuestTabId = 'knowledge' | 'physical' | 'mental'

/** ระดับพลังงานที่เควสเรียกร้องจากผู้ใช้ — HIGH จะถูกล็อกอัตโนมัติเมื่อความเสี่ยงสูง */
export type QuestEnergyLevel = 'LOW' | 'HIGH'

export interface QuestDef {
  /** slug คงที่ ตรงกับ Quest.code ใน docs/DATA_DICTIONARY.md — ห้ามเปลี่ยนหลังใช้งานจริง */
  code: string
  icon: string
  title: string
  titleTh: string
  desc: string
  howTo: string
  theory?: string
  category: QuestCategory
  controlType?: QuestControlType
  coinReward: number
  expReward: number
  isDaily: boolean
  isLocked?: boolean
  unlockAfterQuestCount?: number
  isPassive?: boolean
  /** คีย์ของไฟล์เกมใน src/config/questGameRegistry.ts (ไม่ใส่ = ใช้หน้าเควสยืนยันแบบง่าย) */
  gameKey?: string
  /** default = 'LOW' */
  energyLevel?: QuestEnergyLevel
  /** true = เควสสงบใจ ใช้เป็นทางเลือกบังคับตอนความเสี่ยงปานกลาง/สูง */
  isCalming?: boolean
  /** [เพิ่มรอบนี้] จำนวนครั้งสูงสุดที่เล่นซ้ำได้ต่อวัน (ไม่ใส่ = เล่นได้ครั้งเดียวต่อวันตามปกติ)
   *  ทุกครั้งที่เล่นสำเร็จได้รางวัลเต็มเท่ากันหมด ไม่ลดหลั่น — ดู quest.api.ts (completeQuest)
   *  สำหรับการนับจำนวนครั้ง "วันนี้" จาก completedAt จริง */
  maxPerDay?: number
  /** [เพิ่มรอบนี้ — ตามที่ระบุ] ธงชัดเจนแยกจาก maxPerDay ล้วนๆ ว่าเควสนี้ "เล่นซ้ำได้ในวันเดียว"
   *  (ต่างจาก isDaily ซึ่งมีเควสเกือบทุกตัวติดไว้อยู่แล้ว แปลว่าแค่ "รีเซ็ตทุกวัน" ไม่ใช่ "เล่นได้
   *  หลายครั้งในวันเดียว") ปัจจุบันตรงกับเควสที่มี maxPerDay ทุกตัว (ตอนนี้มีแค่ phys-pure-water)
   *  แยกเป็นธงของตัวเองเพื่อให้ UI (badge 🔁 ใน QuestGateView.tsx/LearningQuestMap.tsx) เช็คตรงๆ
   *  ได้โดยไม่ต้องอนุมานจาก "มี maxPerDay ไหม" กระจายไปทุกจุดที่ต้องโชว์ป้าย — เควสอื่นที่ตอนนี้
   *  ไม่มี maxPerDay (เช่น green-vision/breathing) ยังไม่ได้ติดธงนี้เพราะเป็นการตัดสินใจเชิงโปรดักต์
   *  ว่าจะเปิดให้เล่นซ้ำได้ไหม ไม่ใช่บั๊กที่ต้องแก้ — ถ้าอยากเปิดเพิ่มเติมให้ผู้ดูแลโปรเจกต์ตัดสินใจ */
  isRepeatable?: boolean
}

export const QUEST_TABS: { id: QuestTabId; label: string; emoji: string; accent: string; accentBg: string }[] = [
  { id: 'knowledge', label: 'ด้านการเรียนรู้', emoji: '📚', accent: '#40916C', accentBg: '#D8F3DC' },
  { id: 'physical', label: 'ด้านสุขภาพกาย', emoji: '💪', accent: '#D05F2E', accentBg: '#FFE8DA' },
  { id: 'mental', label: 'ด้านสุขภาพจิต', emoji: '🌸', accent: '#9B52CC', accentBg: '#F3E8FF' },
]

// ── หมวดความรู้ (Knowledge) → ลำต้นและกิ่งก้าน ──
export const KNOWLEDGE_DAILY: QuestDef[] = [
  {
    code: 'know-active-focus', icon: '🎯', title: 'Active Focus', titleTh: 'เพ่งสมาธิ / ตั้งเป้าหมาย',
    desc: 'ตั้งเป้าหมายการเรียนรู้ที่ท้าทายและเฉพาะเจาะจงก่อนเริ่มต้น',
    howTo: 'ก่อนเริ่มทำงานหรือเรียน ตั้งเป้าหมายเฉพาะเจาะจงว่าวันนี้จะเก่งขึ้นเรื่องอะไร ต้องมีความท้าทาย ไม่ใช่แค่ทำสิ่งที่ทำได้ดีอยู่แล้วเพื่อความเพลิดเพลิน',
    theory: 'Deliberate Practice (Ericsson et al., 1993)',
    category: 'KNOWLEDGE', controlType: 'GOAL_INPUT', coinReward: 30, expReward: 20, isDaily: true,
    gameKey: 'active-focus', energyLevel: 'LOW',
  },
  {
    code: 'know-deep-root', icon: '🌿', title: 'The Deep Root', titleTh: 'หยั่งรากลึก / โหมดจดจ่อ',
    desc: 'จดจ่อกับงาน 90 นาทีเต็มโดยไม่ถูกรบกวน แล้วพักสมอง 15-20 นาที',
    howTo: 'ตั้งเวลา 90 นาทีทำงาน/อ่านหนังสือแบบ Deep Work ห้ามวอกแวก ครบเวลาแล้วพักทันที 15-20 นาที ต้องพักสมองจริงๆ (หลับตา เดินเล่น) ห้ามเล่นมือถือ',
    theory: '90/20 Rule · Ultradian Rhythms (Psomas, 2021)',
    category: 'KNOWLEDGE', controlType: 'TIMER', coinReward: 50, expReward: 40, isDaily: true,
    gameKey: 'deep-root', energyLevel: 'HIGH',
  },
  {
    code: 'know-brain-dump', icon: '🧠', title: 'Brain Dump (Voice Edition)', titleTh: 'เทกระเป๋าความจำผ่านเสียง',
    desc: 'อัดเสียงอธิบายสิ่งที่เรียนรู้ด้วยคำพูดของคุณเอง ห้ามดูโน้ต',
    howTo: 'หลังเรียนจบ พักจอ 5 นาที แล้วกดปุ่มไมโครโฟนพูดอธิบายทุกสิ่งที่จำได้ออกมาดังๆ ห้ามเปิดดูเนื้อหา ระบบจะแปลงเป็นข้อความให้เช็กว่าลืมประเด็นไหนไปบ้าง',
    theory: 'Testing Effect (Roediger & Karpicke, 2006) · Production Effect (MacLeod, 2010)',
    category: 'KNOWLEDGE', controlType: 'MIC', coinReward: 40, expReward: 35, isDaily: true,
    gameKey: 'brain-dump', energyLevel: 'HIGH',
  },
  {
    code: 'know-cross-pollination', icon: '🔀', title: 'Cross-Pollination', titleTh: 'ผสมเกสรข้ามศาสตร์',
    desc: 'สลับสับเปลี่ยนหัวข้อการเรียนเมื่อเรียนต่อเนื่องเกิน 2 ชั่วโมง',
    howTo: 'ถ้ามีเวลาเรียน 2 ชั่วโมงขึ้นไป ให้สลับหมวดหมู่วิชาเรียน เช่น ชั่วโมงแรกเรียนภาษา ชั่วโมงที่สองสลับไปแก้โจทย์คณิตศาสตร์',
    theory: 'Interleaved Practice (Rohrer, 2012)',
    category: 'KNOWLEDGE', controlType: 'TOGGLE_TOPICS', coinReward: 35, expReward: 25, isDaily: true,
    gameKey: 'cross-pollination', energyLevel: 'HIGH',
  },
  {
    code: 'know-daily-checkin', icon: '💧', title: 'Daily Learning Check-in', titleTh: 'เช็กอินรายวัน',
    desc: 'ตอบคำถามสั้นๆ 5 ข้อประเมินผลการเรียนรู้ นำคะแนนไปรดน้ำต้นไม้',
    howTo: 'ให้คะแนน 5 ด้าน: ความชัดเจนของเป้าหมาย, การจดจ่อ, ความพยายามดึงข้อมูล, การพักผ่อนสมอง, ความพึงพอใจในการเติบโต — ตอบครบ 5 ข้อ บัวรดน้ำจะเทน้ำลงลำต้นพร้อมเอฟเฟกต์แสงวิบวับ',
    theory: 'Deliberate Practice · Ultradian Rhythms · Growth Mindset',
    category: 'KNOWLEDGE', controlType: 'PROGRESS_BAR', coinReward: 60, expReward: 50, isDaily: true,
    isLocked: true, unlockAfterQuestCount: 2, gameKey: 'daily-checkin', energyLevel: 'LOW',
  },
]

export const KNOWLEDGE_SIDE: QuestDef[] = [
  {
    // [รวมเควสแล้ว] เดิมมี 2 เควสแยกกันที่จริงๆ เป็นเรื่องเดียวกัน (Spacing Effect) แค่คนละ
    // ช่วงเวลา — 'know-time-capsule' (รดน้ำข้ามเวลา ทบทวนระยะสั้น 1-2 วัน/1 เดือน) ถูกรวม
    // เข้ามาในนี้แล้ว desc/howTo ด้านล่างครอบคลุมทั้งสองระยะ (theory เดิมเหมือนกันอยู่แล้ว
    // ไม่ต้องรวมซ้ำ) ตัวเกม (StrategicDelayGame.tsx) ยังเป็นฟอร์มวางแผนเดิม ไม่ได้เขียนใหม่
    code: 'know-strategic-delay', icon: '📅', title: 'Strategic Delay', titleTh: 'กลยุทธ์การรอคอย',
    desc: 'ทบทวนเนื้อหาในจังหวะที่สมองกำลังจะลืมพอดี ตั้งแต่ทบทวนระยะสั้น (1-2 วันก่อนสอบ) ไปจนถึงวางแผนทบทวนระยะยาวเป็นรายเดือน',
    howTo: 'ถ้าใกล้สอบ ให้หยิบเนื้อหาที่เรียนไปเมื่อ 1-2 วันก่อนมาทบทวนซ้ำ ห้ามอ่านแต่ของใหม่ ส่วนเป้าหมายระยะยาว ให้วางแผนทบทวนแบบรายเดือนแทนรายสัปดาห์ — ถ้าต้องการจำข้อมูลให้ได้เป็นปี ระยะห่างในการทบทวนควรเป็นแค่ 5-10% ของเวลาทั้งหมด',
    theory: 'Spacing Effect (Cepeda et al., 2008)',
    category: 'KNOWLEDGE', controlType: 'GOAL_INPUT', coinReward: 40, expReward: 30, isDaily: false,
    gameKey: 'strategic-delay', energyLevel: 'LOW',
  },
  {
    code: 'know-guardian-of-rest', icon: '🛡️', title: 'Guardian of Rest', titleTh: 'ผู้พิทักษ์การพักผ่อน',
    desc: 'ระบบตรวจจับอัตโนมัติ: ฝึกหนักเกิน 4-5 ชม./วัน ต้นไม้จะเริ่มไหม้เกรียม',
    howTo: 'บังคับหยุดฝึกเมื่อครบโควตา 4-5 ชั่วโมงของการฝึกหนักต่อวัน หากฝืนทำต่อ ต้นไม้จะเฉา (Burnout) — ทำงานอัตโนมัติจากเวลาสะสม',
    theory: 'Deliberate Practice — ขีดจำกัดการฝึกฝน 4-5 ชม./วัน',
    category: 'KNOWLEDGE', coinReward: 30, expReward: 20, isDaily: false, isPassive: true,
    gameKey: 'guardian-of-rest', energyLevel: 'LOW',
  },
  {
    code: 'know-ten-year-forest', icon: '🏕️', title: 'Ten-Year Forest', titleTh: 'ป่าแห่งสิบปี',
    desc: 'ปฏิทิน Streak วันต่อวัน — เข้าแอปต่อเนื่องทุกวัน ลำต้นเพิ่มวงปีใหม่',
    howTo: 'รักษาความต่อเนื่อง (login streak) ของการฝึกฝน ไม่จำเป็นต้องเยอะ แต่ต้องไม่ขาด',
    theory: 'The 10-Year Rule (Ericsson et al., 1993)',
    category: 'KNOWLEDGE', coinReward: 20, expReward: 15, isDaily: false, isPassive: true,
    gameKey: 'ten-year-forest', energyLevel: 'LOW',
  },
]

// ── หมวดสุขภาพกาย (Health) → ราก ดิน และผืนหญ้า ──
export const PHYSICAL_DAILY: QuestDef[] = [
  {
    code: 'phys-photosynthesis', icon: '☀️', title: 'Photosynthesis', titleTh: 'สังเคราะห์แสง / รับแดดยามเช้า',
    desc: 'ออกไปรับแสงแดดอ่อนๆ แล้วถ่ายรูปยืนยันว่าออกไปรับแดดจริง',
    // [แก้รอบนี้ — ข้อ D7] เปลี่ยนจากจับเวลา → ถ่ายรูปยืนยัน (เหมือน phys-pure-water)
    howTo: 'ออกไปรับแสงแดดอ่อนๆ หรือยืนใกล้หน้าต่างที่แดดส่องถึงในช่วงเช้า ก่อนเริ่มเรียนหรือทำงาน แล้วถ่ายรูปยืนยันว่าออกไปรับแดดจริง',
    theory: 'Circadian Rhythm — แสงเช้ากระตุ้น Serotonin และรีเซ็ตนาฬิกาชีวภาพ',
    category: 'HEALTH', controlType: 'PHOTO_CAPTURE', coinReward: 35, expReward: 25, isDaily: true,
    gameKey: 'photosynthesis', energyLevel: 'LOW',
  },
  {
    code: 'phys-green-vision', icon: '👀', title: 'Green Vision', titleTh: 'พักสายตา / ถนอมใบไม้',
    desc: 'ละสายตาจากจอไปมองไกล 20 ฟุต เป็นเวลาอย่างน้อย 20 วินาที',
    howTo: 'หลังจ้องจอเป็นเวลานาน ละสายตาไปมองสิ่งที่อยู่ไกล 20 ฟุต อย่างน้อย 20 วินาที (กฎ 20-20-20)',
    theory: 'The 20-20-20 Rule (American Optometric Association)',
    category: 'HEALTH', controlType: 'BELL', coinReward: 20, expReward: 15, isDaily: true,
    gameKey: 'green-vision', energyLevel: 'LOW',
  },
  {
    code: 'phys-pure-water', icon: '💧', title: 'Pure Water', titleTh: 'น้ำพุหล่อเลี้ยงราก',
    desc: 'ถ่ายรูปแก้วน้ำเต็ม แล้วถ่ายอีกครั้งตอนดื่มหมดแก้ว เพื่อยืนยันว่าดื่มน้ำจริง',
    howTo: 'ถ่ายรูปแก้วน้ำตอนเต็มแก้ว 1 รูป ดื่มให้หมด แล้วถ่ายรูปแก้วเปล่าอีก 1 รูปเพื่อยืนยัน — เล่นซ้ำได้สูงสุด 10 ครั้ง/วัน ได้รางวัลเท่ากันทุกครั้ง',
    theory: 'Hydration & Cognitive Performance — ขาดน้ำ 1-2% สมาธิและความจำลดลงชัดเจน',
    category: 'HEALTH', controlType: 'PHOTO_CAPTURE', coinReward: 25, expReward: 20, isDaily: true,
    gameKey: 'pure-water', energyLevel: 'LOW', maxPerDay: 10, isRepeatable: true,
  },
]

export const PHYSICAL_SIDE: QuestDef[] = [
  {
    code: 'phys-soil-restoration', icon: '🌙', title: 'Soil Restoration', titleTh: 'ฟื้นฟูหน้าดิน / ตัดจอก่อนนอน',
    desc: 'งดเปิดแอปพลิเคชันหรือหน้าจอ 1-2 ชั่วโมงก่อนเข้านอนจริง',
    howTo: 'ตั้งเวลานอนของคุณ ระบบจะเริ่มโหมดตัดจอ 1-2 ชั่วโมงก่อนหน้า และล็อกเควสเรียนช่วงดึกให้อัตโนมัติ',
    theory: 'Blue Light & Melatonin Suppression',
    category: 'HEALTH', controlType: 'BELL', coinReward: 30, expReward: 20, isDaily: false,
    gameKey: 'soil-restoration', energyLevel: 'LOW',
  },
]

// ── หมวดสุขภาพจิต (Emotion) → ใบและดอก ──
export const MENTAL_DAILY: QuestDef[] = [
  {
    code: 'ment-oracle-activation', icon: '🔮', title: 'Oracle & 2-Minute Activation', titleTh: 'ไพ่ทิพย์กระตุ้นพลัง',
    desc: 'สุ่มเปิดไพ่รับคำคมให้กำลังใจ พร้อมทำกิจกรรมสั้นๆ 2 นาที',
    howTo: 'สุ่มเปิดไพ่เพื่อรับคำคมให้กำลังใจ จากนั้นทำกิจกรรมสั้นๆ ตามไพ่ที่สุ่มได้ให้ครบ 2 นาที',
    theory: 'Behavioral Activation (Jacobson) & Positive Affirmation',
    category: 'EMOTION', controlType: 'ACTION_BUTTON', coinReward: 25, expReward: 20, isDaily: true,
    energyLevel: 'LOW',
  },
  {
    code: 'ment-cognitive-incinerator', icon: '🔥', title: 'Cognitive Incinerator', titleTh: 'เตาเผาขยะความคิด',
    desc: 'พิมพ์ระบายความคิดลบลงบนก้อนหิน แล้วสไลด์ปัดทิ้งเข้ากองไฟ',
    howTo: 'พิมพ์ความคิดลบที่รบกวนใจลงบนก้อนหินในจอ แล้วสไลด์ปัดก้อนหินทิ้งลงกองไฟเพื่อปลดปล่อยความคิดนั้น',
    theory: 'CBT (Aaron T. Beck) & Externalization (Narrative Therapy)',
    category: 'EMOTION', controlType: 'SWIPE_DISCARD', coinReward: 30, expReward: 25, isDaily: true,
    energyLevel: 'LOW', isCalming: true,
  },
  {
    code: 'ment-mindful-anchor', icon: '⚓', title: 'The Mindful Anchor', titleTh: 'ทอดสมอใจ',
    desc: 'หายใจตามวงกลมเวทมนตร์จังหวะ 4-7-8 เป็นเวลา 2 นาที',
    howTo: 'เมื่อต้องการความสงบ หน้าจอจะตัดเข้าสู่กราฟิกวงกลมขยายเข้า-ออก (หรือภาพลมพัดใบไม้) ให้หายใจตามจังหวะ 4-7-8 — เข้า 4 วิ กลั้น 7 วิ ผ่อนออก 8 วิ ต่อเนื่อง 2 นาที',
    theory: 'Mindfulness-Based Stress Reduction (Jon Kabat-Zinn, UMass)',
    category: 'EMOTION', controlType: 'BREATHING', coinReward: 30, expReward: 25, isDaily: true,
    energyLevel: 'LOW', isCalming: true,
  },
]

export const MENTAL_SIDE: QuestDef[] = [
  {
    code: 'ment-reframer-journal', icon: '📖', title: 'The Reframer Journal', titleTh: 'สมุดบันทึกรากไม้เรืองแสง',
    desc: 'เขียนระบายความรู้สึก แล้วให้ AI ช่วยปรับมุมมองให้เป็นกลางขึ้น',
    howTo: 'เขียนบันทึกความรู้สึกของวันนี้ลงสมุด ถ้าพิมพ์ข้อความลบ ระบบ AI จะช่วยปรับมุมมอง (Cognitive Restructuring) เมื่อบันทึกเสร็จข้อความจะกลายเป็นหยดน้ำรดรากไม้',
    theory: 'Expressive Writing Therapy (Pennebaker) & Cognitive Restructuring',
    category: 'EMOTION', controlType: 'GOAL_INPUT', coinReward: 40, expReward: 35, isDaily: false,
    energyLevel: 'LOW', isCalming: true,
  },
  {
    code: 'ment-gratitude-shield', icon: '🛡️', title: 'Gratitude Shield', titleTh: 'เกราะแห่งความขอบคุณ',
    desc: 'พิมพ์ขอบคุณสิ่งดีๆ 1 เรื่องก่อนนอน ติดต่อกัน 14 วัน ปลดล็อกออร่าต้นไม้',
    howTo: 'พิมพ์ขอบคุณสิ่งดีๆ ที่เกิดขึ้นในวันนี้ 1 เรื่อง ก่อนเข้านอน ทำติดต่อกันให้ครบ 14 วันเพื่อปลดล็อกออร่าเรืองแสงรอบต้นไม้',
    theory: 'Positive Psychology (Seligman) — สร้าง Positive Bias และ Resilience',
    category: 'EMOTION', controlType: 'GOAL_INPUT', coinReward: 35, expReward: 30, isDaily: false,
    energyLevel: 'LOW', isCalming: true,
  },
  // [ลบ 'ment-sunlit-root'] ซ้ำกับ 'phys-photosynthesis' ในหมวดสุขภาพกายด้านบน (ดู comment
  // หัวไฟล์ข้อ 5) — "อาบแดดตอนเช้า" เหลืออยู่แค่หมวดสุขภาพกายเหมือนเดิมเท่านั้น
]

export const QUEST_CATALOG_BY_TAB: Record<QuestTabId, { daily: QuestDef[]; side: QuestDef[] }> = {
  knowledge: { daily: KNOWLEDGE_DAILY, side: KNOWLEDGE_SIDE },
  physical: { daily: PHYSICAL_DAILY, side: PHYSICAL_SIDE },
  mental: { daily: MENTAL_DAILY, side: MENTAL_SIDE },
}

export const ALL_QUESTS: QuestDef[] = [
  ...KNOWLEDGE_DAILY, ...KNOWLEDGE_SIDE,
  ...PHYSICAL_DAILY, ...PHYSICAL_SIDE,
  ...MENTAL_DAILY, ...MENTAL_SIDE,
]

export function findQuestByCode(code: string): QuestDef | undefined {
  return ALL_QUESTS.find((q) => q.code === code)
}

/** [เพิ่มรอบนี้ — รวมจุดคำนวณ "สำเร็จเต็มรูปแบบของวันนี้" ที่เคย copy-paste กระจาย 3 จุด]
 *  เดิม QuestGateView.tsx แก้บั๊กนี้ไปจุดเดียว (เควสที่มี maxPerDay เช่น phys-pure-water
 *  เคยขึ้น "สำเร็จแล้ว" ทันทีตั้งแต่เล่นรอบแรก เพราะ isCompleted() เช็คแค่ "มี log สำเร็จ
 *  บ้างไหม" ไม่สนใจว่าเควสนั้นเล่นซ้ำได้กี่ครั้ง) แต่ LearningQuestMap.tsx ยังมี isCompleted()
 *  ตรงๆ อีก 2 จุด (โหนดเส้นทางหลัก + FAB เควสเสริม) เก็บบั๊กเดิมไว้ครบ — ตอนนี้รวมตรรกะไว้
 *  จุดเดียวตรงนี้ ทุกที่ที่ต้องเช็ค "เควสนี้สำเร็จเต็มรูปแบบของวันนี้หรือยัง" เรียกฟังก์ชันนี้
 *  แทน isCompleted() ตรงๆ เพื่อไม่ให้พลาดจุดใดจุดหนึ่งอีกในอนาคต (แก้ที่เดียว ใช้ที่ไหนก็ตรงกัน)
 *
 *  [แก้เพิ่ม] เดิมเช็คแค่ q.maxPerDay อย่างเดียวเป็นตัวตัดสินว่าต้องนับรอบวันนี้ไหม — ถ้ามีเควส
 *  ในอนาคตตั้ง maxPerDay ไว้แต่ลืมติด isRepeatable (สองฟิลด์นี้เป็น optional อิสระต่อกันตาม
 *  type ไม่มีอะไรบังคับให้มาคู่กันเสมอ) getTodayCompletionCount จะไม่ถูกเรียกเลยเพราะเงื่อนไข
 *  เดิมผูกกับ isRepeatable ทำให้ playsToday ค้างที่ 0 ตลอดไป (0 >= maxPerDay เป็นเท็จเสมอ)
 *  แก้โดยเช็ค "q.maxPerDay ไหม" ตรงๆ เป็นตัวตัดสินแทน ไม่อิง isRepeatable อีกต่อไป */
export function isQuestFullyDoneToday(
  quest: QuestDef,
  isCompleted: (questCode: string) => boolean,
  getTodayCompletionCount: (questCode: string) => number,
): boolean {
  if (quest.maxPerDay) return getTodayCompletionCount(quest.code) >= quest.maxPerDay
  return isCompleted(quest.code)
}

/** เควสที่ระบบจะ "บังคับ" ให้ทำแทน เมื่อความเสี่ยงอยู่ระดับปานกลางขึ้นไป
 * [แก้] ตัด 'phys-mindful-breeze' ออก — เควสนี้ถูกลบทั้งระบบแล้ว (ซ้ำกับเควสฝึกหายใจ
 * ในหมวดสุขภาพจิต) เหลือแค่ 2 เควสสงบใจที่ยังอยู่จริง */
export const CALMING_QUEST_CODES = ['ment-mindful-anchor', 'ment-cognitive-incinerator']

/** เควสหมวดสุขภาพจิตทั้งหมดที่ต้องเปิดเป็น "หน้าเต็มกรอบ" ไม่ใช่ QuestPlayModal (ดู GameplayFrame.tsx)
 * [ย้ายมาจาก GameplayFrame.tsx] เดิม export ปนกับ default component export ในไฟล์เดียว ทำให้
 * Fast Refresh ของไฟล์นั้นตกกลับไปเป็น full reload เสมอ (react-refresh/only-export-components)
 * [แก้] ตัด 'ment-daily-potion' ออก — เควสนี้ถูกลบทั้งระบบแล้ว การเช็กอินอารมณ์ประจำวันตอนนี้
 * ไหลผ่าน MoodGateScreen (เด้งขึ้นเองตอนเปิดไพ่ทิพย์/สมุดบันทึกโดยยังไม่มีอารมณ์ของวันนี้)
 * ไปเข้า MoodCheckIn.tsx 3 ปุ่มเดิม ซึ่งเรียก submitMoodPotion() ท่อเดียวกันอยู่แล้ว */
export const SPECIAL_QUEST_CODES = [
  'ment-oracle-activation',
  'ment-reframer-journal',
  'ment-cognitive-incinerator',
  'ment-gratitude-shield',
  'ment-mindful-anchor',
]

/** [ใหม่] เควสที่ต้องเช็คอินอารมณ์ของวันนี้ก่อนถึงจะเล่นได้จริง (GameplayFrame.tsx โชว์
 * MoodGateScreen แทนหน้าจริงถ้ายังไม่มี todaysMoodEntry) — เดิมไม่มีสัญลักษณ์อะไรบอกผู้ใช้
 * ล่วงหน้าเลยตอนยังอยู่ที่เมนู FAB เลือกเควส (QuestGateView.tsx) กดเข้าไปแล้วถึงจะเจอหน้ากั้น
 * ดูเหมือนเควสพัง — export แยกไว้ที่นี่ให้ทั้งสองไฟล์อ้างอิงจุดเดียวกัน ไม่ต้องซ้ำ magic string */
export const MOOD_GATED_QUEST_CODES = ['ment-oracle-activation', 'ment-reframer-journal']