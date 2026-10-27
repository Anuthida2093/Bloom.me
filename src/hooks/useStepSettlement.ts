import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../context/AppContext'
import { settlePreviousStepDay } from '../services/stepSettlement'
import { queryKeys } from '../services/queryKeys'
import { API_MODE } from '../services/http'
import { markNewWaterDrop } from '../utils/waterPrompt'

/*============================================================================*\
  useStepSettlement — เรียกปิดรอบเควสก้าวของวันก่อนหน้า (services/stepSettlement.ts) ตอนเปิดแอป
  และทุกครั้งที่กลับมาที่แอป (แท็บ/แอปกลับมาแสดง) — เปิดค้างข้ามเที่ยงคืนก็ปิดรอบได้โดยไม่ต้องรีเฟรช
\*============================================================================*/

export function useStepSettlement(enabled: boolean) {
  const { userData, updateProfile } = useAppContext()
  const queryClient = useQueryClient()
  // ค่าล่าสุดสำหรับงาน async (หยดน้ำต้องบวกจากยอดปัจจุบัน ไม่ใช่ยอดตอนเริ่ม)
  const latest = useRef({ userData, updateProfile })
  useEffect(() => { latest.current = { userData, updateProfile } })

  const userId = userData.id
  const bmi = userData.bmi ?? 0

  useEffect(() => {
    if (!enabled || !userId || bmi <= 0) return
    let cancelled = false
    const settle = () => {
      settlePreviousStepDay({
        userId, bmi,
        addWaterDrops: (n) => {
          const { userData: u, updateProfile: update } = latest.current
          update({ waterDrops: (u.waterDrops ?? 0) + n })
        },
      })
        .then((record) => {
          if (!record || cancelled) return
          // โหมด live หยดน้ำ (จากหีบ) เซิร์ฟเวอร์บวกให้แล้ว — ยอดจริงมากับการรีเฟรช me ด้านล่าง
          if (API_MODE === 'live' && record.waterDrops > 0) markNewWaterDrop(userId)
          void queryClient.invalidateQueries({ queryKey: queryKeys.questLogs() })
          void queryClient.invalidateQueries({ queryKey: queryKeys.me })
          void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
        })
        .catch(() => { /* ทริปยังค้างเป็น pending — ลองใหม่รอบหน้า */ })
    }
    settle()
    const onVisible = () => { if (document.visibilityState === 'visible') settle() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible) }
  }, [enabled, userId, bmi, queryClient])
}
