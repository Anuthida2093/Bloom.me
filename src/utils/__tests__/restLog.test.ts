// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { activeRest, loadRestSessions, restTotals, startRest } from '../restLog'
import { DEFAULT_DECORATION_SCALE, maxDecorationScale } from '../../config/decorationItems'

describe('restLog ผู้พิทักษ์การพักผ่อน (เวลาจริง ไม่ขึ้นกับหน้าจอ)', () => {
  afterEach(() => window.localStorage.clear())

  it('เริ่มพัก 15 นาที: ระหว่างพักยังไม่นับ ครบแล้วนับเป็นเวลาพักที่ทำได้ทันที', () => {
    const t0 = new Date('2026-10-06T10:00:00')
    startRest('u1', 15, t0)
    const list = loadRestSessions('u1')
    expect(activeRest(list, t0.getTime() + 5 * 60_000)).not.toBeNull()
    expect(restTotals(list, t0.getTime() + 5 * 60_000).todayMinutes).toBe(0)
    expect(activeRest(list, t0.getTime() + 15 * 60_000)).toBeNull()
    expect(restTotals(list, t0.getTime() + 15 * 60_000).todayMinutes).toBe(15)
  })

  it('ไม่เริ่มรอบพักซ้อนขณะยังพักอยู่', () => {
    const t0 = new Date('2026-10-06T10:00:00')
    startRest('u1', 15, t0)
    startRest('u1', 15, new Date(t0.getTime() + 60_000))
    expect(loadRestSessions('u1')).toHaveLength(1)
  })
})

describe('สเกลไอเทมตกแต่ง', () => {
  it('เริ่มต้น 200% และขยายได้สูงสุด 500% ทุกหมวด', () => {
    expect(DEFAULT_DECORATION_SCALE).toBe(2)
    expect(maxDecorationScale('fire-dragon')).toBe(5)
    expect(maxDecorationScale('gold-star')).toBe(5)
    expect(maxDecorationScale('cherry-blossom')).toBe(5)
  })
})
