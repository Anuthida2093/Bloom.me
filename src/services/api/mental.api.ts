import { http, API_MODE, ApiError } from '../http'
import type { ScreeningAnswer, ScreeningResultRecord, ScreeningTriggerType } from '../../types.mental'
import type { TreeStats, UserData } from '../../types'

/*============================================================================*\
  mental.api.ts — แบบคัดกรอง / badge / รดน้ำต้นไม้ ที่ backend (bloom-me-project) มีจริงแล้ว
  ────────────────────────────────────────────────────────────────────────────
  โหมด mock: คืน null/[] — หน้าเว็บใช้การคำนวณในเครื่องเดิมต่อไป (MentalContext)
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
  if (API_MODE === 'mock') return null
  try {
    return await http.post<WaterResult>('/tree/water')
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return null
    throw error
  }
}
