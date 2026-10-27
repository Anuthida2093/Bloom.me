import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFriendWater, getWateredMeToday, waterFriend } from '../services/api/friendWater.api'
import { queryKeys } from '../services/queryKeys'

/** สถานะรดน้ำกับเพื่อน 1 คน + ฟังก์ชันรดน้ำ (ดู utils/friendWater.ts) — friendId null = ไม่โหลด */
export function useFriendWater(friendId: string | null) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.friendWater(friendId ?? ''),
    queryFn: () => getFriendWater(friendId!),
    enabled: !!friendId,
    staleTime: 30_000,
  })
  const mutation = useMutation({
    mutationFn: () => waterFriend(friendId!),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.friendWater(friendId!), result.summary)
      // เพื่อนอาจรดกลับทันที → รายชื่อ "วันนี้ใครรดน้ำให้เรา" เปลี่ยน
      void queryClient.invalidateQueries({ queryKey: queryKeys.wateredMeToday })
      // ได้การ์ดแลกซื้อ (ครบหลักร้อยวัน) → กระเป๋าการ์ดเปลี่ยน
      if (result.rewardCardItemCode) void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
    },
  })
  return { summary: query.data ?? null, water: mutation.mutateAsync, watering: mutation.isPending }
}

/** วันนี้ใครรดน้ำให้เราบ้าง (แผงข้อมูลต้นไม้ของเรา) */
export function useWateredMeToday(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.wateredMeToday,
    queryFn: getWateredMeToday,
    enabled,
    staleTime: 30_000,
  })
  return { entries: query.data ?? [], loading: query.isLoading }
}
