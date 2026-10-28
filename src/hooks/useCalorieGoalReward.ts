import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { computeCalorieTarget, loadMeals, MEALS_CHANGED_EVENT, totalCalories } from '../utils/nutrition'
import { isQuestDoneNow } from '../utils/questCompletion'
import { findQuestByCode } from '../config/questCatalog'
import { appStorage } from '../utils/testerSession'

/*============================================================================*\
  useCalorieGoalReward — เควส "แคลอรี่ตาม BMI": ตั้งแต่ 18:00 ของวัน ถ้าบันทึกมื้ออาหารวันนี้ได้แคลอรี่
  "ครบเป้า" (≥ เป้าแคลอรี่ตาม BMI) และวันนี้ยังไม่ได้ทำเควสนี้สำเร็จ → นับเควสสำเร็จให้อัตโนมัติ 1 ครั้ง/วัน
  ────────────────────────────────────────────────────────────────────────────
  รางวัลให้ผ่านเส้นทางเดียวกับการกดทำเควส (ProgressContext.handleToggleQuest → completeQuest)
  เซิร์ฟเวอร์เป็นผู้ให้ EXP/เหรียญจริง — หน้านี้แค่ตัดสินเงื่อนไขจากมื้ออาหาร (เก็บในเครื่อง)
  เช็คทุกนาที + ทุกครั้งที่บันทึกมื้อ + ตอนกลับมาที่แอป · วันละครั้ง (ธงในเครื่องกันยิงซ้ำ)
\*============================================================================*/

const QUEST_CODE = 'phys-balanced-nutrients'
/** ชั่วโมงที่เริ่มตัดสิน (เวลาเครื่อง — ตรงกับวันของบันทึกมื้ออาหารใน utils/nutrition.ts) */
export const CALORIE_REWARD_HOUR = 18

const flagKey = (userId: string, d: Date) => `bloom:calorie-goal-reward:${userId}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

export function useCalorieGoalReward(enabled: boolean) {
  const { userData, questLogs, handleToggleQuest } = useAppContext()
  const [rewarded, setRewarded] = useState<{ coins: number; exp: number; key: number } | null>(null)
  const latest = useRef({ userData, questLogs, handleToggleQuest })
  useEffect(() => { latest.current = { userData, questLogs, handleToggleQuest } })

  useEffect(() => {
    if (!enabled) return
    const check = () => {
      const { userData: u, questLogs: logs, handleToggleQuest: complete } = latest.current
      const now = new Date()
      if (!u.id || now.getHours() < CALORIE_REWARD_HOUR) return
      const target = computeCalorieTarget(u)
      if (target === null || totalCalories(loadMeals(u.id, now)) < target) return
      if (isQuestDoneNow(logs, QUEST_CODE, now)) return
      try {
        if (appStorage.getItem(flagKey(u.id, now))) return
        appStorage.setItem(flagKey(u.id, now), '1')
      } catch { return }
      complete(QUEST_CODE, { calorieGoalMet: true, calorieTarget: target, autoAwardedAt: now.toISOString() })
      const def = findQuestByCode(QUEST_CODE)
      setRewarded({ coins: def?.coinReward ?? 0, exp: def?.expReward ?? 0, key: Date.now() })
    }
    check()
    const id = window.setInterval(check, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    window.addEventListener(MEALS_CHANGED_EVENT, check)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(MEALS_CHANGED_EVENT, check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return { rewarded, dismiss: () => setRewarded(null) }
}
