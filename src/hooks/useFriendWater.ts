import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFriendWater, waterFriend } from '../services/api/friendWater.api'
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.wateredMeToday })
      // ได้การ์ดแลกซื้อ (ครบหลักร้อยวัน) → กระเป๋าการ์ดเปลี่ยน
      if (result.rewardCardItemCode) void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
    },
  })
  return { summary: query.data ?? null, water: mutation.mutateAsync, watering: mutation.isPending }
}
