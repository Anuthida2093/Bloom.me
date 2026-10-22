import { describe, expect, it } from 'vitest'
import { emptyFriendWater, pendingWaterReward, summarizeFriendWater, type FriendWaterRecord } from '../friendWater'

/** เวลาไทย YYYY-MM-DD HH:mm → Date */
const bkk = (date: string, time = '12:00') => new Date(`${date}T${time}:00+07:00`)
const iso = (date: string, time = '12:00') => bkk(date, time).toISOString()

/** สร้างประวัติ: วันที่ทั้งสองฝ่ายรด (ครบคู่) + วันที่เรารดฝ่ายเดียว */
function record(both: string[], mineOnly: string[] = [], theirsOnly: string[] = []): FriendWaterRecord {
  const r = emptyFriendWater()
  for (const d of [...both, ...mineOnly]) r.mine[d] = iso(d, '09:00')
  for (const d of [...both, ...theirsOnly]) r.theirs[d] = iso(d, '10:00')
  return r
}

function days(from: string, count: number): string[] {
  const out: string[] = []
  const c = new Date(`${from}T12:00:00Z`)
  for (let i = 0; i < count; i++) { out.push(c.toISOString().slice(0, 10)); c.setUTCDate(c.getUTCDate() + 1) }
  return out
}

describe('friendWater (รดน้ำให้เพื่อน คล้ายเติมไฟ)', () => {
  it('ยังไม่เคยรดน้ำให้กัน = เทา 0 วัน', () => {
    const s = summarizeFriendWater('f', emptyFriendWater(), bkk('2026-10-22'))
    expect(s.status).toBe('none')
    expect(s.streak).toBe(0)
  })

  it('นับเฉพาะวันที่ทั้งสองฝ่ายรด — รดฝ่ายเดียวไม่นับ', () => {
    const s = summarizeFriendWater('f', record(['2026-10-20', '2026-10-21'], ['2026-10-22']), bkk('2026-10-22', '11:00'))
    expect(s.streak).toBe(2)
    expect(s.wateredToday).toBe(true)
    expect(s.friendWateredToday).toBe(false)
    expect(s.myTotal).toBe(3)
    expect(s.theirTotal).toBe(2)
  })

  it('ตัดรอบเที่ยงคืน: วันนี้ครบ = ฟ้าเต็ม · เรารดแล้วรอเพื่อน = ฟ้าครึ่ง · วันนี้ยังไม่รด = เทา · พลาด 1 วัน = ดับ (กู้ได้) · พลาด 2 วัน = หาย', () => {
    const r = record(['2026-10-20', '2026-10-21'])
    expect(summarizeFriendWater('f', r, bkk('2026-10-21', '23:00')).status).toBe('full')
    const grey = summarizeFriendWater('f', r, bkk('2026-10-22', '08:00'))
    expect(grey.status).toBe('grey')
    expect(grey.streak).toBe(2)
    const half = summarizeFriendWater('f', record(['2026-10-20', '2026-10-21'], ['2026-10-22']), bkk('2026-10-22', '11:00'))
    expect(half.status).toBe('half')
    const broken = summarizeFriendWater('f', r, bkk('2026-10-23', '09:00'))
    expect(broken.status).toBe('broken')
    expect(broken.streak).toBe(2)
    const dead = summarizeFriendWater('f', r, bkk('2026-10-24', '09:00'))
    expect(dead.status).toBe('dead')
    expect(dead.streak).toBe(0)
  })

  it('กู้คืนทัน (ขาด 1 วันแล้วกลับมารดครบคู่) → นับต่อจากเดิม', () => {
    const s = summarizeFriendWater('f', record(['2026-10-19', '2026-10-20', '2026-10-22']), bkk('2026-10-22', '12:00'))
    expect(s.status).toBe('full')
    expect(s.streak).toBe(3)
    expect(s.streakStartedOn).toBe('2026-10-19')
  })

  it('ดับแล้วเริ่มใหม่ → นับจาก 1 ใหม่ กู้ตัวเลขเดิมไม่ได้', () => {
    const s = summarizeFriendWater('f', record(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-22']), bkk('2026-10-22', '12:00'))
    expect(s.streak).toBe(1)
    expect(s.streakStartedOn).toBe('2026-10-22')
  })

  it('ครบทุก 100 วันได้รางวัลการ์ด 1 ครั้ง (ไม่ซ้ำ) และครบ 200 ได้อีกครั้ง', () => {
    const d100 = days('2026-01-01', 100)
    const r = record(d100)
    const now = bkk(d100[99], '12:00')
    const key = pendingWaterReward(r, now)
    expect(key).toBe('2026-01-01:1')
    r.rewarded.push(key!)
    expect(pendingWaterReward(r, now)).toBeNull()
    expect(pendingWaterReward(record(days('2026-01-01', 99)), bkk(d100[98], '12:00'))).toBeNull()
    const d200 = days('2026-01-01', 200)
    const r2 = record(d200)
    r2.rewarded.push('2026-01-01:1')
    expect(pendingWaterReward(r2, bkk(d200[199], '12:00'))).toBe('2026-01-01:2')
    expect(summarizeFriendWater('f', r2, bkk(d200[199], '12:00')).daysToNextReward).toBe(100)
  })
})
