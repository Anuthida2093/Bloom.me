import { useQuery } from '@tanstack/react-query'
import { getProgression, getStepHistory, type ProgressionSummary, type StepDayRecord } from '../services/api/progression.api'
import { queryKeys } from '../services/queryKeys'
import { useUser } from '../context/UserContext'

const EMPTY: ProgressionSummary = { exchangeCards: {}, doubleRewardToday: false, goalStreakDays: 0, specialDust: 0 }

/** การ์ดแลกซื้อ / บัฟคูณสอง / สตรีคเดินครบเป้า — ร้านค้า คลังไอเทม และเควสใช้ข้อมูลชุดเดียวกัน
 *  เปลี่ยนค่าแล้วเรียก invalidateQueries({ queryKey: queryKeys.progression }) ให้ทุกจุดอัปเดต */
export function useProgression(): ProgressionSummary & { isLoading: boolean } {
  const { isLoggedIn } = useUser()
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.progression],
    queryFn: getProgression,
    enabled: isLoggedIn,
    staleTime: 15_000,
    retry: false,
  })
  return { ...(data ?? EMPTY), isLoading }
}

/** ประวัติก้าวรายวัน (ใหม่สุดก่อน) — โชว์สถานะสำเร็จ + เปิดแผนที่ของวันนั้น */
export function useStepHistory(): StepDayRecord[] {
  const { isLoggedIn } = useUser()
  const { data } = useQuery({
    queryKey: [...queryKeys.progression, 'step-days'],
    queryFn: getStepHistory,
    enabled: isLoggedIn,
    staleTime: 15_000,
    retry: false,
  })
  return data ?? []
}
