import { http, API_MODE, ApiError, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { bangkokDateString, calculateLevel, calculateNextStreak, WATER_EXP_REWARD } from '../../utils/progression'
import type { ScreeningAnswer, ScreeningResultRecord, ScreeningTriggerType } from '../../types.mental'
import { DEFAULT_TREE_STATS, type TreeStats, type UserData } from '../../types'

/*============================================================================*\
  mental.api.ts — แบบคัดกรอง / badge / รดน้ำต้นไม้ ที่ backend (bloom-me-project) มีจริงแล้ว
  ────────────────────────────────────────────────────────────────────────────
  โหมด mock: คืน null/[] — หน้าเว็บใช้การคำนวณในเครื่องเดิมต่อไป (MentalContext) ยกเว้นรดน้ำที่จำลองตาม backend
  โหมด live: ให้เซิร์ฟเวอร์เป็นผู้ตัดสิน (คำนวณคะแนน/ระดับความเสี่ยง, ปลดล็อก badge, cooldown
  รดน้ำวันละครั้ง) ผู้ใช้แก้ค่าในเครื่องเพื่อโกงไม่ได้
\*============================================================================*/

/** POST /api/screening — backend คำนวณ totalScore/riskLevel/nextDueAt และอัปเดต
 *  users.currentRiskLevel ให้เอง */
export async function submitScreening(
  answers: ScreeningAnswer[], triggerType: ScreeningTriggerType,
): Promise<ScreeningResultRecord | null> {
  if (API_MODE === 'mock') return null
  return http.post<ScreeningResultRecord>('/screening', { triggerType, answers })
}

/** GET /api/screening/me/latest — ผลล่าสุด (ใช้คุมรอบ 30 วันข้ามการรีเฟรช/ข้ามเครื่อง) */
export async function getLatestScreening(): Promise<ScreeningResultRecord | null> {
  if (API_MODE === 'mock') return null
  return http.get<ScreeningResultRecord | null>('/screening/me/latest')
}

/** GET /api/badges/me → code ของ badge ที่ backend ปลดล็อกให้แล้ว (code ตรงกับ badgeCatalog.ts) */
export async function getMyBadgeCodes(): Promise<string[]> {
  if (API_MODE === 'mock') return []
  const rows = await http.get<{ badge: { code: string } }[]>('/badges/me')
  return rows.map((r) => r.badge.code)
}

export interface WaterResult {
  tree: TreeStats
  user: Pick<UserData, 'id' | 'level' | 'exp' | 'coins' | 'streak'>
  expGained: number
  leveledUp: boolean
}

/** POST /api/tree/water — รดน้ำประจำวัน (ได้ EXP + นับ streak) วันละครั้งตามเวลาไทย
 *  รดซ้ำในวันเดียวกัน backend ตอบ 409 ALREADY_WATERED_TODAY → คืน null (ไม่ถือเป็น error) */
export async function waterTree(): Promise<WaterResult | null> {
  if (API_MODE === 'mock') {
    // จำลองตาม backend (tree.controller.ts → waterTree): วันละครั้งตามวันไทย ได้ EXP +15 อย่างเดียว
    // (ไม่มีเหรียญ/stack) นับเป็นกิจกรรม streak ของวันนั้น เลเวลคำนวณจาก exp ใหม่
    await mockDelay(120)
    const before = getDb().user
    const today = bangkokDateString()
    if (before.lastWateredAt && bangkokDateString(new Date(before.lastWateredAt)) === today) return null
    const now = new Date()
    const { user } = updateDb((d) => {
      const exp = d.user.exp + WATER_EXP_REWARD
      d.user = {
        ...d.user,
        exp,
        level: calculateLevel(exp),
        streak: calculateNextStreak(d.user.streak, d.user.lastActiveDate, now),
        lastActiveDate: today,
        lastWateredAt: now.toISOString(),
      }
    })
    return {
      tree: { ...DEFAULT_TREE_STATS, userId: user.id, level: user.level },
      user: { id: user.id, level: user.level, exp: user.exp, coins: user.coins, streak: user.streak },
      expGained: WATER_EXP_REWARD,
      leveledUp: user.level > before.level,
    }
  }
  try {
    return await http.post<WaterResult>('/tree/water')
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null
    throw error
  }
}
