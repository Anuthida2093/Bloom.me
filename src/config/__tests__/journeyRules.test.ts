/*============================================================================*\
  journeyRules.test.ts — [ใหม่ — เฟส 1 ของแผนพัฒนาเควสก้าวเพื่อสุขภาพใหม่] unit test เบื้องต้น
  สำหรับ calcDailyStepTarget เท่านั้น (ตามที่ระบุ — โปรเจกต์มี vitest ตั้งไว้แล้ว)
\*============================================================================*/
import { describe, it, expect } from 'vitest'
import { calcDailyStepTarget } from '../journeyRules'

describe('calcDailyStepTarget (BMI เกณฑ์เอเชีย 4 ระดับ — ค่าต่ำของช่วง)', () => {
  it('BMI < 18.5 → 5,000 ก้าว', () => {
    expect(calcDailyStepTarget(18.4)).toBe(5000)
  })

  it('BMI 18.5–22.9 → 8,000 ก้าว', () => {
    expect(calcDailyStepTarget(18.5)).toBe(8000)
    expect(calcDailyStepTarget(22.9)).toBe(8000)
  })

  it('BMI 23.0–24.9 → 4,000 ก้าว', () => {
    expect(calcDailyStepTarget(23)).toBe(4000)
    expect(calcDailyStepTarget(24.9)).toBe(4000)
  })

  it('BMI ≥ 25 → 2,500 ก้าว', () => {
    expect(calcDailyStepTarget(30)).toBe(2500)
  })

  it('ตกกลับไประดับปกติ ถ้า BMI เป็นค่าผิดปกติ (NaN — ผู้เล่นยังไม่กรอกส่วนสูง/น้ำหนัก)', () => {
    expect(calcDailyStepTarget(NaN)).toBe(8000)
  })
})
