import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../services/queryKeys'
import { API_MODE } from '../services/http'
import { getLeaderboard } from '../services/api/leaderboard.api'
import { MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer, type RankCategory } from '../config/leaderboardData'

/** รายชื่อผู้เล่นในตารางจัดอันดับตามหมวด — ระหว่างโหลด/โหลดพลาดคืนรายการว่าง (โหมด mock ได้ทันที) */
export function useLeaderboard(category: RankCategory): LeaderboardPlayer[] {
  const { data } = useQuery({
    queryKey: [...queryKeys.leaderboard, category],
    queryFn: () => getLeaderboard(category),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
  return data ?? (API_MODE === 'live' ? [] : MOCK_LEADERBOARD_PLAYERS)
}
