import { describe, expect, it } from 'vitest'
import { calculateStepReward, classifyStepBmiTier, getDailyStepGoal } from '../../config/stepGoalByBmi'
import { formatDistance, stepsToDistanceMeters } from '../strideDistance'

describe('เป้าหมายก้าวตาม BMI (เกณฑ์เอเชีย ตรงกับ backend stepReward.ts)', () => {
  it('แบ่งระดับที่ 18.5 / 23 / 25', () => {
    expect(classifyStepBmiTier(18.4)).toBe('UNDERWEIGHT')
    expect(classifyStepBmiTier(22.9)).toBe('NORMAL')
    expect(classifyStepBmiTier(23)).toBe('OVERWEIGHT')
    expect(classifyStepBmiTier(25)).toBe('OBESE')
    expect(classifyStepBmiTier(null)).toBe('NORMAL')
  })
  it('เป้าหมายรายวัน', () => {
    expect(getDailyStepGoal(17)).toEqual({ min: 5000, max: 7000 })
    expect(getDailyStepGoal(30)).toEqual({ min: 2500, max: 4000 })
  })
})

describe('calculateStepReward', () => {
  it('ทุก 100 ก้าว = 1 EXP / 0.5 เหรียญ', () => {
    expect(calculateStepReward({ steps: 8050, bmi: 21 })).toMatchObject({ exp: 80, coins: 40 })
  })
  it('จำกัดก้าวที่นับไม่เกิน max × 3 วัน', () => {
    expect(calculateStepReward({ steps: 1e6, bmi: 21 }).countedSteps).toBe(30000)
  })
  it('streak bonus (BMI < 18.5)', () => {
    expect(calculateStepReward({ steps: 0, bmi: 17, consecutiveGoalDays: 3 }).bonusExp).toBe(20)
  })
  it('Double EXP (BMI ≥ 25)', () => {
    expect(calculateStepReward({ steps: 2500, bmi: 30 })).toMatchObject({ exp: 50, bonusExp: 25 })
  })
})

describe('stepsToDistanceMeters', () => {
  it('ใช้ค่าคงที่ตามเพศ', () => {
    expect(stepsToDistanceMeters(1000, 160, 'FEMALE')).toBeCloseTo(660.8)
    expect(stepsToDistanceMeters(1000, 160, 'MALE')).toBeCloseTo(664)
    expect(stepsToDistanceMeters(1000, 160, null)).toBeCloseTo(662.4)
  })
  it('ไม่มีส่วนสูง → null', () => {
    expect(stepsToDistanceMeters(1000, null, 'FEMALE')).toBeNull()
  })
  it('formatDistance', () => {
    expect(formatDistance(660.8)).toBe('661 ม.')
    expect(formatDistance(2345)).toBe('2.35 กม.')
  })
})
