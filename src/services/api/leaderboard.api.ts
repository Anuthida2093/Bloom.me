import { http, API_MODE, mockDelay } from '../http'
import { MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer, type RankCategory } from '../../config/leaderboardData'
import type { MbtiType } from '../../types'

/*============================================================================*\
  leaderboard.api.ts — ตารางจัดอันดับ
  ────────────────────────────────────────────────────────────────────────────
  live: GET /api/users/leaderboard?type=exp|knowledge|emotion|health — backend จัดอันดับให้
  จากฐานข้อมูลจริง (เฉพาะคนที่เปิด showOnLeaderboard) แทนรายชื่อจำลอง
  mock: MOCK_LEADERBOARD_PLAYERS เดิม
\*============================================================================*/

/** หมวดของหน้าเว็บ → ค่า ?type= ของ backend ("ระดับรวม" = เรียงตาม exp ซึ่งกำหนดเลเวล) */
const CATEGORY_TO_TYPE: Record<RankCategory, string> = {
  level: 'exp',
  knowledgeStack: 'knowledge',
  healthStack: 'health',
  emotionStack: 'emotion',
}

/** ผู้เล่นที่ยังไม่ได้ตั้ง MBTI (backend ส่ง mbtiType: null) — ใช้ธีมต้นไม้ค่าเริ่มต้น */
const FALLBACK_MBTI: MbtiType = 'INFP'

export async function getLeaderboard(category: RankCategory): Promise<LeaderboardPlayer[]> {
  if (API_MODE === 'mock') {
    await mockDelay(100)
    return MOCK_LEADERBOARD_PLAYERS
  }
  const raw = await http.get<(Omit<LeaderboardPlayer, 'mbtiType'> & { mbtiType?: MbtiType | null })[]>(
    `/users/leaderboard?type=${CATEGORY_TO_TYPE[category]}`,
  )
  return raw.map((p) => ({ ...p, mbtiType: p.mbtiType ?? FALLBACK_MBTI }))
}
