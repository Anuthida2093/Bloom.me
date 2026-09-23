// src/types.ts
// ไฟล์นี้หายไปจากโปรเจกต์เดิม ทั้งที่หลาย component อ้างอิงถึง (App, NavBar,
// TreeCanvas, TreeStatsPanel, UserProfile, Leaderboard, LeaderboardPanel,
// QuestSection, ShopSection, SettingsModal, InventoryModal, StreakCelebration) —
// สร้างขึ้นใหม่โดยรวบรวม field ทั้งหมดที่ทุก component เรียกใช้จริง เพื่อไม่ให้ตกหล่น
//
// [TS conversion] เพิ่ม interface ต่อจาก const เดิมทุกตัว ไม่ได้เปลี่ยน runtime value
// ใดๆ เลย — ปลอดภัย 100% ต่อ component ที่ import ค่าพวกนี้ไปใช้อยู่แล้ว

// ─────────────────────────────────────────────────────────────────────────
// MBTI types
// ─────────────────────────────────────────────────────────────────────────

export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

export interface MbtiTreeTheme {
  accent: string
  treeName: string
  trunk: string
  leaves: string[]
  flowers: string[]
  pot: string
}

export const MBTI_TREE_THEME: Record<MbtiType, MbtiTreeTheme> = {
  INTJ: { accent: '#2D6A4F', treeName: 'ต้นสนแห่งกลยุทธ์', trunk: '#5C3D1E', leaves: ['#1B4332', '#2D6A4F', '#52B788'], flowers: ['#4CC9F0', '#00B4D8'], pot: '#2D6A4F' },
  INTP: { accent: '#52B788', treeName: 'ต้นไทรแห่งปัญญา', trunk: '#6B4226', leaves: ['#2D6A4F', '#52B788', '#74C69D'], flowers: ['#C77DFF', '#9B59B6'], pot: '#40916C' },
  ENTJ: { accent: '#1B4332', treeName: 'ต้นโอ๊กแห่งผู้นำ', trunk: '#4A2C0A', leaves: ['#0B2F1E', '#1B4332', '#2D6A4F'], flowers: ['#F4C430', '#E8A020'], pot: '#1B4332' },
  ENTP: { accent: '#52B788', treeName: 'ต้นไม้แห่งไอเดีย', trunk: '#7A4F28', leaves: ['#40916C', '#52B788', '#95D5B2'], flowers: ['#F4845F', '#FF6B35'], pot: '#52B788' },

  INFJ: { accent: '#E87EA0', treeName: 'ต้นซากุระแห่งจิตวิญญาณ', trunk: '#8B5E3C', leaves: ['#F8C8D4', '#F4A0B5', '#E87EA0'], flowers: ['#C77DFF', '#FF85A1', '#9B59B6'], pot: '#C77DFF' },
  INFP: { accent: '#FF85A1', treeName: 'ต้นไม้แห่งความฝัน', trunk: '#A0714F', leaves: ['#FFB3C6', '#FF85A1', '#F4A0B5'], flowers: ['#C77DFF', '#B07FFF', '#D4AAFF'], pot: '#FF85A1' },
  ENFJ: { accent: '#74C69D', treeName: 'ต้นไม้แห่งแรงบันดาลใจ', trunk: '#8B6340', leaves: ['#52B788', '#74C69D', '#95D5B2'], flowers: ['#FF85A1', '#FFD60A', '#F4C430'], pot: '#74C69D' },
  ENFP: { accent: '#74C69D', treeName: 'ต้นไม้แห่งพลังบวก', trunk: '#9B6B3F', leaves: ['#74C69D', '#95D5B2', '#B7E4C7'], flowers: ['#F4845F', '#FF85A1', '#C77DFF'], pot: '#95D5B2' },

  ISTJ: { accent: '#2D6A4F', treeName: 'ต้นสนแห่งความมั่นคง', trunk: '#4A3020', leaves: ['#1B4332', '#2D6A4F', '#40916C'], flowers: ['#B7E4C7', '#95D5B2'], pot: '#2D6A4F' },
  ISFJ: { accent: '#74C69D', treeName: 'ต้นไม้แห่งการดูแล', trunk: '#7A5030', leaves: ['#52B788', '#74C69D', '#B7E4C7'], flowers: ['#FF85A1', '#FFB3C6'], pot: '#74C69D' },
  ESTJ: { accent: '#1B4332', treeName: 'ต้นโอ๊กแห่งระเบียบ', trunk: '#3B2410', leaves: ['#0B2F1E', '#1B4332', '#2D6A4F'], flowers: ['#F4C430', '#FFD60A'], pot: '#1B4332' },
  ESFJ: { accent: '#95D5B2', treeName: 'ต้นไม้แห่งความอบอุ่น', trunk: '#8B5E3C', leaves: ['#74C69D', '#95D5B2', '#D8F3DC'], flowers: ['#F4845F', '#FFB3C6', '#FF85A1'], pot: '#95D5B2' },

  ISTP: { accent: '#C85C20', treeName: 'ต้นไม้แห่งช่างฝีมือ', trunk: '#6B4226', leaves: ['#E07B39', '#C85C20', '#F4A040'], flowers: ['#4CC9F0', '#00B4D8'], pot: '#C85C20' },
  ISFP: { accent: '#FF85A1', treeName: 'ต้นไม้แห่งศิลปะ', trunk: '#9B6B3F', leaves: ['#FFB3C6', '#FF85A1', '#F4A0B5'], flowers: ['#C77DFF', '#F4C430', '#4CC9F0'], pot: '#FF85A1' },
  ESTP: { accent: '#E8603A', treeName: 'ต้นไม้แห่งพลังงาน', trunk: '#5C3D1E', leaves: ['#B8511E', '#E8603A', '#FF8C5A'], flowers: ['#F4C430', '#FFD60A'], pot: '#F4845F' },
  ESFP: { accent: '#FFD60A', treeName: 'ต้นไม้แห่งเทศกาล', trunk: '#A07040', leaves: ['#74C69D', '#95D5B2', '#F4A0B5'], flowers: ['#FF85A1', '#F4C430', '#C77DFF'], pot: '#FFD60A' },
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy UI shape — ตรงกับที่ App.jsx ประกอบเป็น `legacyState` ส่งให้
// component ที่ยังไม่ migrate ไปใช้ backend shape ตรงๆ (NavBar, TreeStatsPanel,
// QuestSection, ShopSection, SettingsModal, UserProfile, StreakCelebration ฯลฯ)
// ─────────────────────────────────────────────────────────────────────────

export interface LegacyUser {
  name: string
  mbti: MbtiType | null
  level: number
  exp: number
  maxExp: number
  coins: number
  streakDays: number
  treeName: string
  learningHours: number
  stepsTotal: number
  knowledgeScore: number
  physicalScore: number
  mentalScore: number
  heightCm: number
  weightKg: number
}

export const DEFAULT_USER: LegacyUser = {
  name: 'ผู้มาเยือน',
  mbti: 'INFP',
  level: 1,
  exp: 0,
  maxExp: 1000,
  coins: 0,
  streakDays: 0,
  treeName: 'ต้นไม้ของฉัน',
  learningHours: 0,
  stepsTotal: 0,
  knowledgeScore: 0,
  physicalScore: 0,
  mentalScore: 0,
  heightCm: 170,
  weightKg: 60,
}

export interface MoodHistoryEntry {
  date: string
  mood: 'good' | 'neutral' | 'bad'
  text: string
}

export interface PlacedItem {
  itemId: string
  zone: 'pot' | 'branch-left' | 'branch-right' | 'crown'
}

/**
 * DecorationPositionMap — [ข้อกำหนดข้อ 3 ระบบ Free-form Decoration] พิกัด (%) ที่ผู้ใช้ลาก
 * ปรับเองสำหรับไอเทมตกแต่งแต่ละชิ้น (key = shopItemId) — ไม่มี field แบบนี้อยู่ใน UserItem
 * model ของ backend เลย (ดู docs/DATA_DICTIONARY.md: id/userId/shopItemId/isEquipped/
 * purchasedAt เท่านั้น ไม่มี positionX/positionY เหมือน PostIt) จึงเก็บเป็น state ฝั่ง
 * client ล้วนๆ ไปก่อน (คล้ายกับ AppSettings) ไม่ได้เขียนทับหรือสมมติชื่อ field ใหม่ให้ backend
 *
 * [เพิ่มตามที่ระบุ — ปรับขนาดไอเทมตกแต่งได้อิสระ] scale เก็บคู่กับ x/y ในอ็อบเจ็กต์เดียวกัน
 * เพราะเป็นข้อมูล "การจัดวางของไอเทมชิ้นนี้" ชุดเดียวกัน ไม่แยกเก็บคนละ map — optional เพราะ
 * ไอเทมที่ยังไม่เคยลากปรับขนาดเลยจะไม่มี key นี้ (ใช้ค่าเริ่มต้น 1 ที่ผู้เรียกใช้เอง)
 */
export type DecorationPositionMap = Record<string, { xPct: number; yPct: number; scale?: number }>

export type CompletedQuestsMap = Record<string, boolean>

/**
 * LegacyState — shape กลางที่ App.jsx ส่งลงมาเป็น prop `state` ให้
 * component รุ่นเก่าจำนวนมาก ยังคงชื่อ field เดิมทั้งหมดไว้เพื่อไม่ทำลาย
 * โครงสร้าง component ที่มีอยู่แล้ว
 */
export interface LegacyState {
  user: LegacyUser
  isLoggedIn: boolean
  isGuest: boolean
  darkMode: boolean
  /** ปุ่มเปิด/ปิดเสียงหลักจาก SettingsModal — false = ปิดเสียงทั้งหมด (เพลง+เอฟเฟกต์+เสียงพื้นหลังวิดีโอ) ไม่ว่า volume slider จะตั้งไว้เท่าไหร่ */
  soundEnabled: boolean
  musicVolume: number
  sfxVolume: number
  moodHistory: MoodHistoryEntry[]
  completedQuests: CompletedQuestsMap
  ownedItems: string[]
  placedItems: PlacedItem[]
  activeQuestTab: string
  shopCategory: string
  page: string
  showSettings: boolean
  showInventory: boolean
  showLeaderboard: boolean
  showMoodCheckin: boolean
  /** [แก้ TS error] เดิมมีอยู่แค่ใน AppContext ภายใน (UiState) แต่ไม่เคยถูกประกาศใน
   * LegacyState/ไม่เคยถูกก็อปปี้เข้า legacyState object จริง ทำให้ Dashboard.tsx/
   * QuestSection.tsx/ActionMenuBar.tsx เรียก updateState({ showQuests: true }) หรืออ่าน
   * legacyState.showQuests แล้วเกิด TS error (property ไม่มีอยู่ใน type) เพิ่ม field ตรงนี้
   * ให้ตรงกับของจริงที่ AppContext ใช้อยู่แล้ว */
  showQuests: boolean
  showShop: boolean
  showMeditation?: boolean
  showBrainDump?: boolean
}

// ค่าเริ่มต้นของ state ทั้งก้อน — ใช้เป็น default parameter ใน component ที่รับ
// prop `state` เพื่อกัน runtime crash หากยังไม่มีการส่ง state จริงเข้ามา
// (เช่นตอน component ถูก render เดี่ยวๆ ระหว่างพัฒนา ก่อนต่อกับ App state กลาง)
export const DEFAULT_STATE: LegacyState = {
  user: DEFAULT_USER,
  isLoggedIn: false,
  isGuest: true,
  darkMode: false,
  soundEnabled: true,
  musicVolume: 60,
  sfxVolume: 80,
  moodHistory: [],
  completedQuests: {},
  ownedItems: [],
  placedItems: [],
  activeQuestTab: 'knowledge',
  shopCategory: 'statues',
  page: 'home',
  showSettings: false,
  showInventory: false,
  showLeaderboard: false,
  showMoodCheckin: false,
  showQuests: false,
  showShop: false,
}

/** partial update ที่ component ลูกส่งขึ้นให้ App ผ่าน onUpdateState/onUpdate
 * รองรับทั้ง field ระดับบนของ LegacyState และ { user: Partial<LegacyUser> } */
export type LegacyStateUpdate = Partial<Omit<LegacyState, 'user'>> & {
  user?: Partial<LegacyUser>
}

// ─────────────────────────────────────────────────────────────────────────
// จากนี้ลงไป: shape ที่อ้างอิงตรงจาก docs/DATA_DICTIONARY.md +
// docs/VARIABLE_DICTIONARY.md ของ repo bloom-me-project (Prisma schema จริง)
// นี่คือ field ที่ backend จะส่งมาจริงเมื่อต่อ API แล้ว — ใช้ชื่อพวกนี้เป็น
// มาตรฐานสำหรับ props/state ตัวใหม่ (userData, treeStats, inventoryData)
// ส่วน DEFAULT_STATE/DEFAULT_USER ด้านบนยังคงไว้เพื่อ backward-compat กับ
// component ที่ยังไม่ถูก migrate มาใช้ shape ใหม่นี้
// ─────────────────────────────────────────────────────────────────────────

// EXP ต่อ 1 level ของ user (src/controllers/user.controller.ts → EXP_PER_LEVEL)
export const EXP_PER_LEVEL = 100

// คะแนนสะสมต่อ 1 visual level ของต้นไม้ (src/utils/tree.ts → STACK_PER_VISUAL_LEVEL)
export const STACK_PER_VISUAL_LEVEL = 50

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH'
export type BodyType = 'THIN' | 'AVERAGE' | 'OVERWEIGHT'
/** [ใหม่] เพศ — ตรวจแล้วระบบยังไม่เคยมีฟิลด์นี้มาก่อน (ดู UserData ด้านล่าง) ใช้เลือกชุดภาพ
 *  "รูปร่างของคุณ" ให้ตรงเพศจริง (ดู src/config/bodyTypeAssets.ts) แก้ไขได้ปกติเหมือน
 *  ส่วนสูง/น้ำหนัก ไม่ได้ล็อกถาวรแบบ MBTI */
export type Gender = 'MALE' | 'FEMALE'
export type TreeSpecies = 'OAK' | 'CHERRY_BLOSSOM' | 'PINE' | 'WILLOW' | 'BALANCED'
export type QuestCategory = 'KNOWLEDGE' | 'EMOTION' | 'HEALTH'
export type QuestControlType =
  | 'GOAL_INPUT'
  | 'TIMER'
  | 'MIC'
  | 'TOGGLE_TOPICS'
  | 'PROGRESS_BAR'
  | 'CALENDAR'
  | 'ACTION_BUTTON'
  | 'BELL'
  | 'BREATHING'
  | 'SWIPE_DISCARD'
  /** [เพิ่มรอบนี้] ยืนยันงานด้วยการถ่ายรูปจริง (ผ่านกล้อง/แนบไฟล์) แทนการจับเวลา/กดปุ่มเฉยๆ */
  | 'PHOTO_CAPTURE'
  /** เควส "ก้าวเพื่อสุขภาพ" โฉมใหม่ — เลือกแผนที่ปลายทางจาก 8 ใบแล้วเดินไปถึงตามก้าวจริง
   *  (ดู types.journey.ts, src/components/quest/games/physical/StepJourneyGame.tsx) */
  | 'STEP_JOURNEY'
export type QuestLogStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
export type MoodCategory = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
/**
 * [แก้ไขตามการตรวจสอบ DATA_DICTIONARY.md จริง] enum MoodType ของจริงใน backend มี 8 ค่า
 * ไม่ใช่แค่ 3 ค่า (HAPPY/CALM/SAD) แบบที่โค้ดเดิมใช้อยู่ — อ้างอิงตรงจาก
 * bloom-me-project/docs/DATA_DICTIONARY.md ตาราง mood_entries:
 * "mood: MoodType — อารมณ์ย่อยที่เลือกจาก bottom sheet
 * (HAPPY, ENERGETIC, FOCUSED, CALM, SAD, ANXIOUS, TIRED, ANGRY)"
 * เดิมโค้ด frontend ใช้แค่ 3 ค่าเป็นการลดรูป UI ชั่วคราว (เช็คอิน 3 ปุ่ม ดี/เฉยๆ/ไม่ดี)
 * ยังคง compile ผ่านได้เพราะ HAPPY/CALM/SAD เป็นสมาชิกของ union 8 ค่านี้อยู่แล้ว (ไม่ breaking)
 * — แต่ต้องขยาย type ให้ตรงกับ backend จริงก่อน ถ้าจะรองรับ mood ทั้ง 8 ค่าในอนาคต
 */
export type MoodTypeValue = 'HAPPY' | 'ENERGETIC' | 'FOCUSED' | 'CALM' | 'SAD' | 'ANXIOUS' | 'TIRED' | 'ANGRY'

/** User — ตรงกับ response จริงของ backend (ไม่รวม passwordHash ที่ backend ไม่ส่งออกมา) */
export interface UserData {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  bio: string | null
  level: number
  exp: number
  coins: number
  streak: number
  lastActiveDate: string | null
  lastWateredAt: string | null
  mbtiType: MbtiType | null
  birthDate: string | null
  /** [ใหม่] fallback 'FEMALE' สำหรับ user เดิมที่ยังไม่เคยตั้งค่านี้ (ดู mockDb.ts read()) */
  gender: Gender
  height: number | null
  weight: number | null
  bmi: number | null
  bodyType: BodyType | null
  knowledgeStack: number
  emotionStack: number
  healthStack: number
  /** [เพิ่มรอบนี้] หยดน้ำแห่งชีวิต — รางวัลพิเศษจากภารกิจย่อยในเควส "ไพ่ทิพย์" (ถ่ายรูปยืนยัน
   *  ทำภารกิจ 2 นาทีจริง) แยกจากเหรียญ/EXP ปกติของเควส [ต้องเพิ่มคอลัมน์ users.water_drops
   *  ฝั่ง backend จริง — ตอนนี้ยังเป็นแค่ field เสริมฝั่ง client/mock เท่านั้น ดู DB_CHANGES.md] */
  waterDrops: number
  currentRiskLevel: RiskLevel
  createdAt: string | null
  updatedAt: string | null
  /** [เพิ่มรอบแก้ไข Story] ปิดโปรไฟล์ทั้งบัญชี — true = คนอื่นกดดูโปรไฟล์เรา (จาก list เพื่อน/
   *  คนกดไลค์/คอมเมนต์) ไม่ได้ เห็นแค่ toast แจ้งเตือนแทน (ไม่เกี่ยวกับ isAnonymous ของโพสต์
   *  แต่ละอันซึ่งเป็นคนละ field กัน — อันนั้นซ่อนเฉพาะโพสต์ อันนี้ปิดทั้งบัญชี)
   *  [ต้องเพิ่มคอลัมน์ users.is_profile_private ฝั่ง backend จริง] */
  isProfilePrivate: boolean
}

export const DEFAULT_USER_DATA: UserData = {
  id: '',
  email: '',
  username: 'ผู้มาเยือน',
  avatarUrl: null,
  bio: null,
  level: 1,
  exp: 0,
  coins: 0,
  streak: 0,
  lastActiveDate: null,
  lastWateredAt: null,
  mbtiType: 'INFP',
  birthDate: null,
  gender: 'FEMALE',
  height: null,
  weight: null,
  bmi: null,
  bodyType: null,
  knowledgeStack: 0,
  emotionStack: 0,
  healthStack: 0,
  waterDrops: 0,
  currentRiskLevel: 'LOW',
  createdAt: null,
  updatedAt: null,
  isProfilePrivate: false,
}

/** TreeProgress — ตรงกับ response จริงของ backend (1 user : 1 ต้นไม้) */
export interface TreeStats {
  id: string
  userId: string
  level: number
  treeType: TreeSpecies
  trunkBranchLevel: number
  leafFlowerLevel: number
  grassSoilLevel: number
}

export const DEFAULT_TREE_STATS: TreeStats = {
  id: '',
  userId: '',
  level: 1,
  treeType: 'BALANCED',
  trunkBranchLevel: 1,
  leafFlowerLevel: 1,
  grassSoilLevel: 1,
}

export interface ShopItemData {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  imageUrl: string | null
  isActive: boolean
}

/** UserItem (join table user_items) — คลังไอเทมของ user แต่ละชิ้นจะแนบ
 * shopItem object เต็มมาด้วยเมื่อ backend include: shopItem */
export interface InventoryItem {
  id: string
  userId: string
  shopItemId: string
  isEquipped: boolean
  purchasedAt: string
  shopItem?: ShopItemData
}

export const DEFAULT_INVENTORY_DATA: InventoryItem[] = []

export interface QuestDef {
  id: string
  code: string
  title: string
  description: string | null
  category: QuestCategory
  isDaily: boolean
  isActive: boolean
}

/** QuestLog[] — ประวัติการทำเควส แต่ละอันจะแนบ quest object เต็มมาด้วยเมื่อ
 * backend include: quest (endpoint หลักทำแบบนี้อยู่แล้วตาม VARIABLE_DICTIONARY) */
export interface QuestLogEntry {
  id: string
  status: QuestLogStatus
  userId: string
  questId: string
  quest?: Partial<QuestDef> & { code: string; category?: QuestCategory }
  logDate: string | null
  completedAt: string | null
  /** [เพิ่มรอบนี้] สิ่งที่ผู้ใช้กรอก/เลือกตอนเล่นเควสรอบนั้น (เช่น skill/improvement ของ
   *  Active Focus, topic ของ Strategic Delay) — quest.api.ts (mock) แนบมาให้อยู่แล้วจริงตั้งแต่
   *  แรก แต่ type เดิมไม่เคยประกาศ field นี้ ทำให้ดึงมาใช้ (เช่นหน้าโปรไฟล์) ต้อง cast เอง
   *  [ต้องเพิ่มใน DB] quest_logs.payload (Json?) — ดู docs/DB_CHANGES.md ข้อ 5 */
  payload?: Record<string, unknown>
}

export const DEFAULT_QUEST_LOGS: QuestLogEntry[] = []

/** MoodEntry — ตรงชื่อ field ตาม backend เป๊ะ ไม่ต้อง map เพิ่ม */
export interface MoodEntryData {
  id: string
  userId: string
  category: MoodCategory
  mood: MoodTypeValue
  note: string | null
  createdAt: string
}

/**
 * JournalEntryRecord — [ใหม่ — client-only mock] บันทึกประวัติของเควส "สมุดบันทึกราก
 * ไม้เรืองแสง" (ment-reframer-journal) และ "เกราะแห่งความขอบคุณ" (ment-gratitude-shield)
 *
 * [ตัวแปรตรง backend — คำเตือนสำคัญ] ไม่มี model แบบนี้อยู่ใน DATA_DICTIONARY.md/
 * VARIABLE_DICTIONARY.md ของโปรเจกต์เลย (QuestLog เก็บแค่ status/logDate/completedAt ไม่มี
 * ที่เก็บ "เนื้อหาที่เขียน") จึงเป็น client-only state ล้วนๆ ใน AppContext.tsx (ไม่ persist
 * ข้าม session จริง หายไปตอน refresh หน้า) — ถ้า backend เพิ่ม endpoint เก็บบันทึกจริงใน
 * อนาคต ให้แทนที่ state นี้ด้วยการ fetch จาก API แทน โครงสร้าง field ตั้งไว้ให้พร้อมสลับได้เลย
 */
export interface JournalEntryRecord {
  id: string
  /** 'ment-reframer-journal' หรือ 'ment-gratitude-shield' — ใช้แยกว่าเป็นประวัติของเควสไหน */
  questCode: string
  /** หัวข้อย่อ — สร้างจากประโยคแรกของ originalText อัตโนมัติตอนบันทึก */
  title: string
  originalText: string
  aiReframedText: string
  createdAt: string
}

export const DEFAULT_JOURNAL_ENTRIES: JournalEntryRecord[] = []

export const DEFAULT_MOOD_ENTRIES: MoodEntryData[] = []

/** PostIt — ตรงชื่อ field ตาม backend เป๊ะ ไม่ต้อง map เพิ่ม */
export interface PostItData {
  id: string
  content: string
  color: string
  positionX: number
  positionY: number
  isPinned: boolean
  userId: string
}

export const DEFAULT_POST_ITS: PostItData[] = []

// ─────────────────────────────────────────────────────────────────────────
// Feed (ฟีดโพสต์แบบ Threads) — [ใหม่] ยังไม่มี model แบบนี้ใน docs/DATA_DICTIONARY.md เลย
// (เป็นฟีเจอร์ใหม่ทั้งระบบ) ตั้งชื่อ field ตามแนวทางเดิมของโปรเจกต์ (ตรงกับ QuestLogEntry/
// MoodEntryData ที่มีอยู่แล้ว) เพื่อให้ backend มา map ตามได้ง่ายเมื่อสร้างตารางจริง
// [ต้องเพิ่มใน DB] ตาราง posts (id, userId, content, imageUrl?, isAnonymous, createdAt)
// + post_likes (userId, postId — unique คู่ กันกดไลค์ซ้ำ) + post_comments (id, postId,
// userId, content, createdAt) — likeCount/likedByMe/comments ด้านล่างคือค่าที่ backend
// ควร "ประกอบ" ส่งมาให้ ไม่ใช่คอลัมน์ตรงในตาราง posts เอง
// ─────────────────────────────────────────────────────────────────────────

export interface PostCommentData {
  id: string
  userId: string
  authorName: string
  content: string
  createdAt: string
}

/** [เพิ่มรอบแก้ไข Story] คนที่กดไลค์โพสต์ — ต้องเก็บเป็นรายชื่อจริง (ไม่ใช่แค่ตัวเลขนับ)
 *  เพื่อให้กดดูรายชื่อคนไลค์ได้ (ข้อ 10) [ต้องเพิ่มตาราง post_likes เก็บ userId+postId จริง
 *  ฝั่ง backend — likeCount/likedByMe ด้านล่างควร derive จากตารางนี้ ไม่ใช่คอลัมน์แยก] */
export interface PostLikerInfo {
  userId: string
  username: string
}

export interface PostData {
  id: string
  userId: string
  /** ใช้แสดงเฉพาะตอน isAnonymous = false — ฝั่ง UI ต้องไม่โชว์ค่านี้เลยถ้า isAnonymous = true */
  authorName: string
  content: string
  imageUrl?: string | null
  /** true = ซ่อนตัวตนผู้โพสต์เฉพาะโพสต์นี้เท่านั้น ไม่ใช่ทั้งบัญชี — ไลค์/คอมเมนต์ยังทำได้ปกติ
   *  ทุกกรณี (ซ่อนแค่ "ใครโพสต์" ไม่ได้ปิดการมีปฏิสัมพันธ์กับโพสต์) สลับได้ทุกเมื่อหลังโพสต์แล้ว
   *  ผ่าน EditPostModal (ไม่ใช่ตั้งได้ครั้งเดียวตอนสร้างอีกต่อไป) */
  isAnonymous: boolean
  /** [แก้รอบนี้] เก็บรายชื่อจริงแทนตัวเลขเฉยๆ — likeCount/likedByMe ยัง derive ไว้ให้ใช้ตรงๆ
   *  เหมือนเดิม (เท่ากับ likedBy.length / likedBy.some(userId===ฉัน)) เพื่อไม่ต้องแก้ทุกจุดที่
   *  เคยอ่าน field 2 ตัวนี้อยู่แล้ว */
  likedBy: PostLikerInfo[]
  likeCount: number
  /** true = ผู้ใช้ปัจจุบัน (ที่ล็อกอินอยู่) กดไลค์โพสต์นี้ไปแล้ว */
  likedByMe: boolean
  comments: PostCommentData[]
  createdAt: string
  /** [ตัดออกจากเฟสนี้ตามที่ตกลง — เหลือ 3 ไอคอนหลัก: ไลค์/คอมเมนต์/แชร์] เก็บ field ไว้
   *  เฉยๆ กัน TS/localStorage เก่าพัง ไม่มี UI ไหนอ่าน/แสดงผลอีกต่อไป */
  repostedByMe: boolean
  repostCount: number
}

export const DEFAULT_POSTS: PostData[] = []

// ─────────────────────────────────────────────────────────────────────────
// Social (ติดตาม/กิจกรรม) — [ใหม่ — ฟีเจอร์สตอรี่] ยังไม่มี model แบบนี้ใน
// docs/DATA_DICTIONARY.md เลย (เป็นฟีเจอร์ใหม่ทั้งระบบ เหมือน Feed ด้านบน)
// [ต้องเพิ่มใน DB] ตาราง follows (followerId, followingId — unique คู่)
// ระบบนี้เป็น "ติดตามทางเดียว" (one-way follow) ล้วนๆ ไม่ใช่ friend-request แบบต้องกดรับ —
// ถ้าจะทำ friend-request เต็มรูปแบบ (ขอ/ยอมรับ/ปฏิเสธ) เป็นงานแยกอีกเฟส ยังไม่ได้ทำในรอบนี้
// ─────────────────────────────────────────────────────────────────────────

/** ประเภทกิจกรรมที่แสดงในหน้า "กิจกรรม" ของสตอรี่
 *  [แก้รอบนี้ — ตัดเฟสตามที่ตกลง] เดิมมี FOLLOW_SUGGESTION/MENTION/REPOST ด้วย — ตอนนี้ตัด
 *  บัญชีแนะนำ+กล่าวถึง (hashtag/mention เต็มรูปแบบไปเฟส B) และรีโพสต์ (ตัดฟีเจอร์ทิ้งเฟสนี้)
 *  เหลือ 4 ประเภทตรงตามที่ระบุ: ติดตามใหม่/ไลค์โพสต์เรา/คอมเมนต์โพสต์เรา/แชร์โพสต์มาให้เรา */
export type ActivityType = 'NEW_FOLLOWER' | 'LIKE_POST' | 'COMMENT_POST' | 'SHARED_POST_TO_YOU'

export interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string
  actorName: string
  createdAt: string
  /** ข้อความประกอบ — สำหรับ LIKE_POST/COMMENT_POST/SHARED_POST_TO_YOU คือชิ้นส่วนของโพสต์ที่เกี่ยวข้อง */
  excerpt?: string | null
  /** [เพิ่มรอบนี้] โพสต์ที่เกี่ยวข้อง — กดแถวนี้แล้วเปิดโพสต์นั้นได้ทันที (ข้อ 13/14) */
  postId?: string | null
}

export const DEFAULT_ACTIVITY: ActivityItem[] = []