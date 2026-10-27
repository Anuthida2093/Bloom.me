import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { computeCalorieTarget, loadMeals, MEALS_CHANGED_EVENT, totalCalories } from '../utils/nutrition'
import { isQuestDoneNow } from '../utils/questCompletion'
import { findQuestByCode } from '../config/questCatalog'
import { prepareQuestPhotos } from '../services/api/upload.api'

/*============================================================================*\
  useCalorieGoalReward — เควส "แคลอรี่ตาม BMI": ตั้งแต่ 18:00 ของวัน ถ้าบันทึกมื้ออาหารวันนี้ได้แคลอรี่
  "ครบเป้า" (≥ เป้าแคลอรี่ตาม BMI) และวันนี้ยังไม่ได้ทำเควสนี้สำเร็จ → นับเควสสำเร็จให้อัตโนมัติ 1 ครั้ง/วัน
  ────────────────────────────────────────────────────────────────────────────
  รางวัลให้ผ่านเส้นทางเดียวกับการกดทำเควส (ProgressContext.handleToggleQuest → completeQuest)
  เซิร์ฟเวอร์เป็นผู้ให้ EXP/เหรียญจริง — หน้านี้แค่ตัดสินเงื่อนไขจากมื้ออาหาร (เก็บในเครื่อง)
  เช็คทุกนาที + ทุกครั้งที่บันทึกมื้อ + ตอนกลับมาที่แอป · วันละครั้ง (ธงในเครื่องกันยิงซ้ำ)
  โหมด live: อัปโหลดรูปมื้อล่าสุดก่อนส่งเควส — ล้มเหลว = ไม่ส่งเควส แจ้ง onError (วันละครั้ง) แล้วลองใหม่รอบถัดไป
\*============================================================================*/

const QUEST_CODE = 'phys-balanced-nutrients'
/** ชั่วโมงที่เริ่มตัดสิน (เวลาเครื่อง — ตรงกับวันของบันทึกมื้ออาหารใน utils/nutrition.ts) */
export const CALORIE_REWARD_HOUR = 18

const flagKey = (userId: string, d: Date) => `bloom:calorie-goal-reward:${userId}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

export function useCalorieGoalReward(enabled: boolean, onError?: (message: string) => void) {
  const { userData, questLogs, handleToggleQuest } = useAppContext()
  const [rewarded, setRewarded] = useState<{ coins: number; exp: number; key: number } | null>(null)
  const latest = useRef({ userData, questLogs, handleToggleQuest, onError })
  useEffect(() => { latest.current = { userData, questLogs, handleToggleQuest, onError } })
  /** กันแจ้งเตือนอัปโหลดล้มเหลวซ้ำทุกนาที (แจ้งครั้งเดียวต่อวัน) */
  const errorShownFor = useRef<string | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const check = async () => {
      const { userData: u, questLogs: logs, handleToggleQuest: complete } = latest.current
      const now = new Date()
      if (inFlight.current || !u.id || now.getHours() < CALORIE_REWARD_HOUR) return
      const target = computeCalorieTarget(u)
      const meals = loadMeals(u.id, now)
      if (target === null || totalCalories(meals) < target) return
      if (isQuestDoneNow(logs, QUEST_CODE, now)) return
      const key = flagKey(u.id, now)
      try {
        if (window.localStorage.getItem(key)) return
        window.localStorage.setItem(key, '1')
      } catch { return }
      let photoPayload: Record<string, unknown>
      inFlight.current = true
      try {
        photoPayload = await prepareQuestPhotos(QUEST_CODE, meals.slice(-1).map((m) => m.photo))
      } catch (err) {
        try { window.localStorage.removeItem(key) } catch { /* ไม่เป็นไร */ }
        if (errorShownFor.current !== key) {
          errorShownFor.current = key
          const detail = err instanceof Error && err.message ? err.message : 'อัปโหลดรูปไม่สำเร็จ'
          latest.current.onError?.(`รับรางวัลแคลอรี่ตาม BMI ไม่สำเร็จ: ${detail}`)
        }
        return
      } finally {
        inFlight.current = false
      }
      complete(QUEST_CODE, { calorieGoalMet: true, calorieTarget: target, autoAwardedAt: now.toISOString(), ...photoPayload })
      const def = findQuestByCode(QUEST_CODE)
      setRewarded({ coins: def?.coinReward ?? 0, exp: def?.expReward ?? 0, key: Date.now() })
    }
    const run = () => { void check() }
    run()
    const id = window.setInterval(run, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    window.addEventListener(MEALS_CHANGED_EVENT, run)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(MEALS_CHANGED_EVENT, run)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return { rewarded, dismiss: () => setRewarded(null) }
}
