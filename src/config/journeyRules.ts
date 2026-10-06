import type { JourneyRecord, JourneyStatus } from '../types.journey'
import { getDailyStepGoal } from './stepGoalByBmi'
import { endOfBangkokDay } from '../utils/progression'

/** ทริปรายวัน: 1 วัน = 1 ทริป = 1 แผนที่ — เป้าหมาย = ก้าวรายวันตาม BMI หมดเขตตอนเที่ยงคืนของวันนั้น
 *  (เดิม 3 วัน / 3 แผนที่ / เป้า ×3) วันที่เดินครบเป้าสะสมไปหา 21 วัน (config/exchangeItems.ts) */
export const DEFAULT_JOURNEY_DEADLINE_DAYS = 1

/** เส้นตายของทริปรายวัน = เที่ยงคืนตามเวลาไทย (Asia/Bangkok) ของวันที่เริ่มทริป
 *  [แก้ตามที่ระบุ] เดิมใช้เที่ยงคืนตามเวลาเครื่อง — เครื่องที่ตั้งโซนอื่นตัดรอบคนละเวลากับ backend (logDate วันไทย) */
export function endOfTripDay(from: Date = new Date()): Date {
  return endOfBangkokDay(from)
}

/** เป้าหมายก้าวรายวันตาม BMI เกณฑ์เอเชีย 4 ระดับ (ค่าต่ำของช่วง — ดู config/stepGoalByBmi.ts)
 *  เดิมเป็น 8,000 ก้าว (+1,500 เมื่อ BMI ≥ 23) — ตารางใหม่ลดเป้าให้ BMI สูง แทนการเพิ่ม */
export function calcDailyStepTarget(bmi: number): number {
  return getDailyStepGoal(bmi).min
}

/** ก้าวเป้าหมายของทริป = เป้าหมายรายวัน (ทริปรายวัน 1 แผนที่) */
export function calcMapTotalStepsTarget(bmi: number): number {
  return calcDailyStepTarget(bmi) * DEFAULT_JOURNEY_DEADLINE_DAYS
}

// คำนวณหยดน้ำตามสัดส่วน (เต็ม 20) — EXP/เหรียญของทริปคิดจากก้าวจริงตอนจบเควสแทน
// (calculateStepReward ใน config/stepGoalByBmi.ts / backend utils/stepReward.ts)
export function calcProportionalRewards(steps: number, target: number) {
  const pct = Math.min(100, (steps / target) * 100)
  return {
    pct: pct,
    waterDrops: Math.round((pct / 100) * 20),
  }
}

export function resolveJourneyStatus(journey: JourneyRecord, progressPct: number, now: Date): JourneyStatus {
  if (journey.status !== 'IN_PROGRESS') return journey.status

  const deadline = new Date(journey.deadlineAt).getTime()
  const started = new Date(journey.startedAt).getTime()
  const totalMs = Math.max(1, deadline - started)
  const elapsedMs = now.getTime() - started
  const elapsedRatio = elapsedMs / totalMs

  if (progressPct >= 100) {
    if (elapsedRatio <= 0.7) return 'COMPLETED_EARLY'
    if (elapsedRatio <= 1) return 'COMPLETED_ON_TIME'
    return 'COMPLETED_LATE'
  }

  // หมดวันแล้วยังไม่ถึงเป้า — ไม่ถือว่า Failed แต่จบเป็น TIME_UP เพื่อแจกรางวัลตาม %
  if (now.getTime() > deadline) return 'TIME_UP'
  return 'IN_PROGRESS'
}