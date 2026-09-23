/*============================================================================*\
  journeyRules.test.ts — [ใหม่ — เฟส 1 ของแผนพัฒนาเควสก้าวเพื่อสุขภาพใหม่] unit test เบื้องต้น
  สำหรับ calcDailyStepTarget เท่านั้น (ตามที่ระบุ — โปรเจกต์มี vitest ตั้งไว้แล้ว)
\*============================================================================*/
import { describe, it, expect } from 'vitest'
import { calcDailyStepTarget } from '../journeyRules'

describe('calcDailyStepTarget', () => {
  it('คืนเป้าหมายฐาน 8000 ก้าว เมื่อ BMI ต่ำกว่าเกณฑ์ (23)', () => {
    expect(calcDailyStepTarget(18.5)).toBe(8000)
    expect(calcDailyStepTarget(22.9)).toBe(8000)
  })

  it('เพิ่มเป้าหมายอีก 1500 ก้าว เมื่อ BMI ถึงเกณฑ์ (23) พอดี', () => {
    expect(calcDailyStepTarget(23)).toBe(9500)
  })

  it('เพิ่มเป้าหมายอีก 1500 ก้าว เมื่อ BMI สูงกว่าเกณฑ์', () => {
    expect(calcDailyStepTarget(30)).toBe(9500)
  })

  it('ตกกลับไปเป้าหมายฐาน ถ้า BMI เป็นค่าผิดปกติ (NaN — ผู้เล่นยังไม่กรอกส่วนสูง/น้ำหนัก)', () => {
    expect(calcDailyStepTarget(NaN)).toBe(8000)
  })
})
