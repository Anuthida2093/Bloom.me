import type { MbtiType } from '../types'

/**
 * LeaderboardPlayer — ยังไม่มี endpoint/model "Leaderboard" อยู่จริงใน
 * docs/VARIABLE_DICTIONARY.md ปัจจุบัน (มีแค่ User, TreeProgress, Quest, ...) ดังนั้น
 * โครงสร้างนี้จำลองมาจาก "subset ของ User model" ที่ endpoint จัดอันดับควรจะคืนกลับมา
 * โดยตรง — ใช้ชื่อ field ตรงกับ User ทุกตัว (username, mbtiType, level, knowledgeStack,
 * healthStack, emotionStack) เพื่อให้วันที่ backend มี endpoint จริง (เช่น GET /leaderboard)
 * เอา response มาใช้ได้ทันทีโดยไม่ต้อง map ชื่อ field ใหม่เลย
 */
export interface LeaderboardPlayer {
  id: string
  username: string
  mbtiType: MbtiType
  level: number
  knowledgeStack: number
  healthStack: number
  emotionStack: number
}

/** คีย์ที่ใช้จัดอันดับได้ — ตรงกับชื่อ field จริงของ LeaderboardPlayer ทุกตัว (ยกเว้น 'level' ที่เป็นคอลัมน์ "รวม") */
export type RankCategory = 'level' | 'knowledgeStack' | 'healthStack' | 'emotionStack'

export interface RankCategoryDef {
  id: RankCategory
  label: string
  icon: string
}

export const RANK_CATEGORIES: RankCategoryDef[] = [
  { id: 'level', label: 'ระดับรวม', icon: '🌳' },
  { id: 'knowledgeStack', label: 'ความรู้', icon: '📚' },
  { id: 'healthStack', label: 'สุขภาพกาย', icon: '💪' },
  { id: 'emotionStack', label: 'สุขภาพจิต', icon: '🌸' },
]

/**
 * MOCK_LEADERBOARD_PLAYERS — ข้อมูลจำลอง (ยังไม่มี GET /leaderboard จริง) ใช้แสดงผล
 * ไปพลางๆ ก่อน พอมี endpoint จริงแทนที่ตรงนี้ด้วยผลจาก fetch ได้เลย type ตรงกันอยู่แล้ว
 */
export const MOCK_LEADERBOARD_PLAYERS: LeaderboardPlayer[] = [
  { id: 'p1', username: 'ธนาวัฒน์', mbtiType: 'INTJ', level: 28, knowledgeStack: 1840, healthStack: 620, emotionStack: 510 },
  // [ชั่วคราว — ทดลองดูต้นไม้เลเวล 100] ค่าเดิม: level 24, knowledgeStack 1420, healthStack 880, emotionStack 960
  { id: 'p2', username: 'สิริมา', mbtiType: 'INFJ', level: 100, knowledgeStack: 4950, healthStack: 4950, emotionStack: 4950 },
  { id: 'p3', username: 'พงศ์พล', mbtiType: 'ENTJ', level: 22, knowledgeStack: 1680, healthStack: 720, emotionStack: 380 },
  { id: 'p4', username: 'วาสนา', mbtiType: 'ENFP', level: 20, knowledgeStack: 980, healthStack: 1100, emotionStack: 820 },
  { id: 'p5', username: 'ณัฐพล', mbtiType: 'ISTP', level: 19, knowledgeStack: 780, healthStack: 1380, emotionStack: 290 },
  { id: 'p6', username: 'ปริยา', mbtiType: 'INFP', level: 18, knowledgeStack: 860, healthStack: 540, emotionStack: 1140 },
  // [ชั่วคราว — ทดลองดูต้นไม้เลเวล 100] ค่าเดิม: level 16, knowledgeStack 1200, healthStack 660, emotionStack 310
  { id: 'p7', username: 'ชัยวัฒน์', mbtiType: 'ESTJ', level: 100, knowledgeStack: 4950, healthStack: 4950, emotionStack: 4950 },
]