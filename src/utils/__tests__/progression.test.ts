import { describe, expect, it } from 'vitest'
import { bangkokDateString, bangkokHour, calculateLevel, calculateNextStreak, calculateVisualLevel } from '../progression'

describe('calculateLevel (ตรงกับ backend level.ts)', () => {
  it('100 EXP ต่อเลเวลคงที่', () => {
    expect(calculateLevel(0)).toBe(1)
    expect(calculateLevel(99)).toBe(1)
    expect(calculateLevel(100)).toBe(2)
    expect(calculateLevel(1050)).toBe(11)
  })
})

describe('calculateVisualLevel (ตรงกับ backend tree.ts)', () => {
  it('50 คะแนนต่อเลเวล สูงสุดเลเวล 100 (คะแนนเกินยังสะสมได้ แต่ภาพหยุดที่ 100)', () => {
    expect(calculateVisualLevel(0)).toBe(1)
    expect(calculateVisualLevel(49)).toBe(1)
    expect(calculateVisualLevel(50)).toBe(2)
    expect(calculateVisualLevel(4950)).toBe(100)
    expect(calculateVisualLevel(5000)).toBe(100)
    expect(calculateVisualLevel(99999)).toBe(100)
  })
})

describe('calculateNextStreak (ตรงกับ backend streak.ts)', () => {
  // 2026-10-03 10:00 เวลาไทย
  const now = new Date('2026-10-03T03:00:00Z')
  it('ยังไม่เคยมีกิจกรรม → 1', () => expect(calculateNextStreak(0, null, now)).toBe(1))
  it('วันเดียวกัน → คงเดิม', () => expect(calculateNextStreak(5, '2026-10-03', now)).toBe(5))
  it('วันติดกัน → +1', () => expect(calculateNextStreak(5, '2026-10-02', now)).toBe(6))
  it('ขาด 1 วัน → คงเดิม', () => expect(calculateNextStreak(5, '2026-10-01', now)).toBe(5))
  it('ขาด 2 วันติด → เริ่มที่ 1', () => expect(calculateNextStreak(5, '2026-09-30', now)).toBe(1))
  it('ใช้วันตามเวลาไทย ไม่ใช่ UTC', () => {
    // 2026-10-02 23:30 เวลาไทย = 16:30Z — ยังเป็นวันที่ 2 ตามเวลาไทย
    expect(calculateNextStreak(5, '2026-10-02', new Date('2026-10-02T16:30:00Z'))).toBe(5)
    // 2026-10-03 00:30 เวลาไทย = 2026-10-02 17:30Z — ขึ้นวันที่ 3 แล้ว
    expect(calculateNextStreak(5, '2026-10-02', new Date('2026-10-02T17:30:00Z'))).toBe(6)
  })
})

describe('เวลาไทย', () => {
  it('bangkokDateString / bangkokHour', () => {
    expect(bangkokDateString(new Date('2026-10-02T17:30:00Z'))).toBe('2026-10-03')
    expect(bangkokHour(new Date('2026-10-02T17:30:00Z'))).toBe(0)
    expect(bangkokHour(new Date('2026-10-03T10:00:00Z'))).toBe(17)
  })
})
