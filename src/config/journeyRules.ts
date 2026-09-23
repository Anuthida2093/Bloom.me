import type { JourneyRecord, JourneyStatus } from '../types.journey'

const BASE_DAILY_STEP_TARGET = 8000
const HIGH_BMI_THRESHOLD = 23
const HIGH_BMI_EXTRA_STEPS = 1500

export const DEFAULT_JOURNEY_DEADLINE_DAYS = 3 // ให้เวลา 3 วันต่อ 1 ทริป (3 แผนที่)

export function calcDailyStepTarget(bmi: number): number {
  if (!Number.isFinite(bmi) || bmi < HIGH_BMI_THRESHOLD) return BASE_DAILY_STEP_TARGET
  return BASE_DAILY_STEP_TARGET + HIGH_BMI_EXTRA_STEPS
}

// คำนวณก้าวเป้าหมายรวมของทริป (เป้าหมายรายวัน x 3 วัน)
export function calcMapTotalStepsTarget(bmi: number): number {
  return calcDailyStepTarget(bmi) * DEFAULT_JOURNEY_DEADLINE_DAYS
}

// คำนวณรางวัลตามสัดส่วน (เต็มคือ หยดน้ำ 20, คอยน์ 10)
export function calcProportionalRewards(steps: number, target: number) {
  const pct = Math.min(100, (steps / target) * 100)
  return {
    pct: pct,
    waterDrops: Math.round((pct / 100) * 20),
    coins: Math.round((pct / 100) * 10)
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

  // ถ้าหมดเวลา 3 วัน ไม่ถือว่า Failed แล้ว แต่ให้จบเควสเป็น TIME_UP เพื่อแจกรางวัลตาม %
  if (now.getTime() > deadline) return 'TIME_UP'
  return 'IN_PROGRESS'
}