/*============================================================================*\
  stepGoalByBmi.ts — เป้าหมายก้าว + โบนัสตาม BMI (เกณฑ์เอเชีย 4 ระดับ) เฉพาะเควส "ก้าวเพื่อสุขภาพ"
  ────────────────────────────────────────────────────────────────────────────
  สำเนาตรงกับ backend bloom-me-project src/utils/stepReward.ts (+ Quest.config ของ vitality-steps
  ใน prisma/seed.ts) — แก้ฝั่งใดต้องแก้อีกฝั่งด้วย โหมด live backend เป็นผู้คำนวณรางวัลจริง
  ไฟล์นี้ใช้แสดงเป้าหมาย/พรีวิวรางวัล และจำลองรางวัลในโหมด mock

  เกณฑ์ BMI ชุดนี้ "แยกจาก" bodyType (WHO 3 ระดับ ใช้เลือกภาพรูปร่าง) โดยตั้งใจ — ไม่แตะของเดิม
    < 18.5      5,000–7,000 ก้าว/วัน   โบนัส streak: EXP เพิ่มต่อวันที่ทำเป้าติดกัน
    18.5–22.9   8,000–10,000          โบนัสเพซ: ×1.25 เมื่อเดินเร็วถึงเกณฑ์ (ยังไม่มีข้อมูลความเร็ว)
    23.0–24.9   4,000–6,000           โบนัสเผาผลาญ: +EXP เมื่อเคลื่อนไหวต่อเนื่อง 30+ นาที (ยังไม่มีข้อมูล)
    ≥ 25.0      2,500–4,000           Double EXP เมื่อทำสำเร็จ (ให้กำลังใจ ไม่ลงโทษ)
  เป้าหมายรายวันที่ทริปนับ = ค่าต่ำของช่วง ค่าสูงแสดงเป็น "เป้าท้าทาย"
\*============================================================================*/

export type StepBmiTier = 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE'

export function classifyStepBmiTier(bmi: number | null | undefined): StepBmiTier {
  // ยังไม่กรอกส่วนสูง/น้ำหนัก → ใช้ระดับปกติ ไม่เดา
  if (bmi == null || !Number.isFinite(bmi) || bmi <= 0) return 'NORMAL'
  if (bmi < 18.5) return 'UNDERWEIGHT'
  if (bmi < 23) return 'NORMAL'
  if (bmi < 25) return 'OVERWEIGHT'
  return 'OBESE'
}

export const STEP_GOAL_BY_TIER: Record<StepBmiTier, { min: number; max: number }> = {
  UNDERWEIGHT: { min: 5000, max: 7000 },
  NORMAL: { min: 8000, max: 10000 },
  OVERWEIGHT: { min: 4000, max: 6000 },
  OBESE: { min: 2500, max: 4000 },
}

/** ข้อความโบนัสของแต่ละระดับ (แสดงในหน้าเควส) */
export const STEP_BONUS_LABEL: Record<StepBmiTier, string> = {
  UNDERWEIGHT: 'โบนัส streak: ทำเป้าติดกันยิ่งได้ EXP เพิ่ม',
  NORMAL: 'โบนัสเพซ: เดินเร็วถึงเกณฑ์ได้รางวัล ×1.25',
  OVERWEIGHT: 'โบนัสเผาผลาญ: เคลื่อนไหวต่อเนื่อง 30+ นาทีได้ EXP เพิ่ม',
  OBESE: 'Double EXP เมื่อจบทริป',
}

/** ตรงกับ Quest.config.stepReward ของ vitality-steps ใน backend */
export const STEP_REWARD_CONFIG = {
  expPerHundredSteps: 1,
  coinsPerHundredSteps: 0.5,
  tripDays: 3,
  bonuses: {
    streakExpPerDay: 10,
    paceMultiplier: 1.25,
    paceMinStepsPerMinute: 100,
    sustainedExp: 20,
    sustainedMinMinutes: 30,
    obeseExpMultiplier: 2,
  },
} as const

export function getDailyStepGoal(bmi: number | null | undefined): { min: number; max: number } {
  return STEP_GOAL_BY_TIER[classifyStepBmiTier(bmi)]
}

export interface StepRewardInput {
  steps: number
  bmi: number | null | undefined
  consecutiveGoalDays?: number
  /** มีเฉพาะเมื่อแหล่งข้อมูลก้าววัดได้ — ตอนนี้ยังไม่มีแหล่งไหนส่งมา */
  stepsPerMinute?: number
  continuousActiveMinutes?: number
}

export function calculateStepReward(input: StepRewardInput, config = STEP_REWARD_CONFIG) {
  const tier = classifyStepBmiTier(input.bmi)
  const maxSteps = STEP_GOAL_BY_TIER[tier].max * config.tripDays
  const countedSteps = Math.max(0, Math.min(Math.floor(input.steps) || 0, maxSteps))
  const hundreds = Math.floor(countedSteps / 100)
  const b = config.bonuses

  let exp = hundreds * config.expPerHundredSteps
  let coins = Math.floor(hundreds * config.coinsPerHundredSteps)
  let bonusExp = 0

  if (tier === 'UNDERWEIGHT') {
    const days = Math.max(0, Math.min(config.tripDays, Math.floor(input.consecutiveGoalDays ?? 0)))
    bonusExp = Math.max(0, days - 1) * b.streakExpPerDay
  } else if (tier === 'NORMAL') {
    if ((input.stepsPerMinute ?? 0) >= b.paceMinStepsPerMinute) {
      bonusExp = Math.round(exp * (b.paceMultiplier - 1))
      coins = Math.round(coins * b.paceMultiplier)
    }
  } else if (tier === 'OVERWEIGHT') {
    if ((input.continuousActiveMinutes ?? 0) >= b.sustainedMinMinutes) bonusExp = b.sustainedExp
  } else {
    bonusExp = Math.round(exp * (b.obeseExpMultiplier - 1))
  }

  exp += bonusExp
  return { tier, countedSteps, exp, coins, bonusExp }
}
