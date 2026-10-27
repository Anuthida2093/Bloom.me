import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { StepChestReward } from '../config/stepChest'
import { getStepHistory, openStepChest } from '../services/api/progression.api'
import { queryKeys } from '../services/queryKeys'
import { API_MODE } from '../services/http'
import { useAppContext } from '../context/AppContext'
import { markNewWaterDrop } from '../utils/waterPrompt'

/*============================================================================*\
  useStepChest — หีบสมบัติของวันที่เดินถึงเป้า (1 ใบ/วัน) ผูกกับ "วันที่ของทริป"
  ────────────────────────────────────────────────────────────────────────────
  - โหลดสถานะจากเซิร์ฟเวอร์ (getStepHistory → chest) ว่าเปิดไปแล้วหรือยัง
  - open(): ป็อปอัปขึ้นทันที (popupOpen) แล้วค่อยรอผลจากเซิร์ฟเวอร์ — ผลสุ่ม/การให้รางวัลทำที่เซิร์ฟเวอร์
    หยดน้ำ: โหมด live เซิร์ฟเวอร์บวกให้เอง → รีเฟรช user จากเซิร์ฟเวอร์ · โหมด mock บวกผ่าน updateProfile
    เมื่อเปิดครั้งแรก (!alreadyOpened) เหมือนเดิม
  - beforeOpen: ให้ผู้เรียกยืนยันก้าวของวันนั้นเข้าบัญชีก่อน (กันกรณีเซิร์ฟเวอร์ยังไม่เห็นว่าถึงเป้า)
\*============================================================================*/

export function useStepChest(date: string | null, eligible: boolean, beforeOpen?: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  const { userData, updateProfile } = useAppContext()
  /** undefined = ยังโหลดไม่เสร็จ · null = ยังไม่เปิด · reward = เปิดแล้ว */
  const [opened, setOpened] = useState<StepChestReward | null | undefined>(undefined)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupReward, setPopupReward] = useState<StepChestReward | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  useEffect(() => {
    if (!date || !eligible) return
    let cancelled = false
    getStepHistory()
      .then((list) => { if (!cancelled) { setOpened(list.find((d) => d.date === date)?.chest ?? null); setLoadedFor(date) } })
      // โหลดไม่ได้ → แสดงหีบไว้ก่อน (เปิดซ้ำเซิร์ฟเวอร์คืนผลเดิม ไม่ได้รางวัลซ้ำ)
      .catch(() => { if (!cancelled) { setOpened(null); setLoadedFor(date) } })
    return () => { cancelled = true }
  }, [date, eligible])

  const loaded = !eligible || (!!date && loadedFor === date)
  /** มีหีบรอเปิดอยู่ */
  const ready = eligible && loaded && opened === null

  const open = useCallback(async () => {
    if (!date || busy.current) return
    busy.current = true
    setError(null)
    setPopupReward(null)
    setPopupOpen(true)
    try {
      await beforeOpen?.().catch(() => { /* เซิร์ฟเวอร์ตัดสินเองว่าถึงเป้าหรือยัง */ })
      const res = await openStepChest(date)
      if (!res.alreadyOpened && res.reward.kind === 'WATER_DROPS') {
        if (API_MODE === 'mock') updateProfile({ waterDrops: (userData.waterDrops ?? 0) + res.reward.amount })
        else markNewWaterDrop(userData.id) // หน้า Home เล่นบัวรดน้ำ — ยอดจริงมากับ GET /users/me ด้านล่าง
      }
      setOpened(res.reward)
      setPopupReward(res.reward)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
    } catch {
      setError('เปิดหีบไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง')
    } finally {
      busy.current = false
    }
  }, [date, beforeOpen, updateProfile, userData.waterDrops, userData.id, queryClient])

  const closePopup = useCallback(() => { setPopupOpen(false); setError(null) }, [])

  return {
    loaded, ready, opened: opened ?? null,
    popupOpen, popupReward, error, open, closePopup,
  }
}
