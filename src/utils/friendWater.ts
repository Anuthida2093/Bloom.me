import { bangkokDateString } from './progression'

/*============================================================================*\
  friendWater — รดน้ำต้นไม้ให้เพื่อน (คล้ายระบบ "เติมไฟ") — สูตรล้วน ใช้ทั้งฝั่ง mock และหน้าจอ
  ────────────────────────────────────────────────────────────────────────────
  - รดได้วันละ 1 ครั้งต่อเพื่อน 1 คน (วันตามปฏิทินไทย)
  - วันหนึ่ง "นับ" ก็ต่อเมื่อทั้งสองฝ่ายรดน้ำให้กันในวันนั้น (วันครบคู่)
  - [แก้ตามที่ระบุ] สถานะหยดน้ำ — ตัดรอบเที่ยงคืน (เทียบวันครบคู่ล่าสุดกับวันนี้):
      วันนี้ครบคู่ = ฟ้าเต็ม (full) · วันนี้เรารดแล้วแต่เพื่อนยังไม่รด = ฟ้าครึ่ง (half)
      เมื่อวานครบคู่ วันนี้ยังไม่ครบ = เทา (grey) ยังไม่ดับ
      เลยเที่ยงคืนไป 1 วันที่ไม่ครบคู่ = ดับ แต่กู้คืนได้วันนี้ (broken) — รดน้ำครบคู่วันนี้ = กู้คืน นับต่อจากเดิม
      ขาดครบ 2 วัน = หายถาวร (dead) จำนวนวันเป็น 0 ต้องเริ่มใหม่
  - ครบทุก 100 วัน (100, 200, ...) → ทั้งสองคนสุ่มได้การ์ดแลกซื้อคนละ 1 ใบ
  ไม่มีผลกับต้นไม้/คะแนนของใคร — เป็นกิจกรรมผูกมิตรอย่างเดียว
\*============================================================================*/

/** วันที่ (YYYY-MM-DD ปฏิทินไทย) → เวลาที่รด (ISO) */
export type WaterDays = Record<string, string>

export interface FriendWaterRecord {
  /** วันที่เรารดให้เพื่อน */
  mine: WaterDays
  /** วันที่เพื่อนรดให้เรา */
  theirs: WaterDays
  /** รางวัลที่ให้ไปแล้ว — key `${วันเริ่มสาย}:${หลักร้อย}` กันให้ซ้ำ */
  rewarded: string[]
}

export type WaterStatus = 'none' | 'full' | 'half' | 'grey' | 'broken' | 'dead'

export interface FriendWaterSummary {
  friendId: string
  /** จำนวนวันที่รดให้กันต่อเนื่อง (สายปัจจุบัน — ดับแล้ว = 0) */
  streak: number
  status: WaterStatus
  /** เรารดให้เพื่อนวันนี้แล้ว (รดซ้ำไม่ได้) */
  wateredToday: boolean
  friendWateredToday: boolean
  /** เรารดให้เพื่อนทั้งหมดกี่ครั้ง / เพื่อนรดให้เราทั้งหมดกี่ครั้ง */
  myTotal: number
  theirTotal: number
  /** วันแรกของสายที่ยังไม่ดับ (YYYY-MM-DD) — null = ยังไม่มี */
  streakStartedOn: string | null
  /** อีกกี่วันจะถึงรางวัลการ์ดครั้งถัดไป */
  daysToNextReward: number
}

export const WATER_REWARD_EVERY_DAYS = 100
/** วันครบคู่ห่างกันได้สูงสุดกี่วันโดยสายไม่ขาด (ขาด 1 วันยังกู้คืนได้) */
export const WATER_MAX_GAP_DAYS = 2

const DAY_MS = 24 * 60 * 60 * 1000

export function emptyFriendWater(): FriendWaterRecord {
  return { mine: {}, theirs: {}, rewarded: [] }
}

/** เลขวันจาก YYYY-MM-DD (ใช้หาระยะห่างเป็นวัน) */
function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
}

/** วันครบคู่ทั้งหมดเรียงจากเก่าไปใหม่ + เวลาที่ครบ (คนที่รดทีหลัง) */
function completeDays(rec: FriendWaterRecord): { date: string; at: number }[] {
  return Object.keys(rec.mine)
    .filter((d) => rec.theirs[d])
    .sort()
    .map((date) => ({ date, at: Math.max(Date.parse(rec.mine[date]), Date.parse(rec.theirs[date])) }))
}

/** สายวันครบคู่ล่าสุด (ไล่จากเก่า — ห่างเกิน WATER_MAX_GAP_DAYS = เริ่มสายใหม่) */
function lastChain(rec: FriendWaterRecord): { date: string; at: number }[] {
  let chain: { date: string; at: number }[] = []
  for (const day of completeDays(rec)) {
    const prev = chain[chain.length - 1]
    if (prev && dayNumber(day.date) - dayNumber(prev.date) > WATER_MAX_GAP_DAYS) chain = []
    chain.push(day)
  }
  return chain
}

export function summarizeFriendWater(friendId: string, rec: FriendWaterRecord, now = new Date()): FriendWaterSummary {
  const today = bangkokDateString(now)
  const chain = lastChain(rec)
  const last = chain[chain.length - 1]
  let status: WaterStatus = 'none'
  let streak = 0
  if (last) {
    const gap = dayNumber(today) - dayNumber(last.date)
    if (gap > WATER_MAX_GAP_DAYS) status = 'dead'
    else if (gap === 0) status = 'full'
    else if (rec.mine[today]) status = 'half' // เรารดแล้ว รอเพื่อน (รวมถึงกำลังกู้คืน)
    else status = gap === 1 ? 'grey' : 'broken'
    streak = status === 'dead' ? 0 : chain.length
  } else if (rec.mine[today]) {
    status = 'half'
  }
  return {
    friendId,
    streak,
    status,
    wateredToday: !!rec.mine[today],
    friendWateredToday: !!rec.theirs[today],
    myTotal: Object.keys(rec.mine).length,
    theirTotal: Object.keys(rec.theirs).length,
    streakStartedOn: streak > 0 ? chain[0].date : null,
    daysToNextReward: WATER_REWARD_EVERY_DAYS - (streak % WATER_REWARD_EVERY_DAYS),
  }
}

/** ถึงหลักร้อยใหม่ที่ยังไม่ได้รางวัลไหม — คืน key รางวัล (บันทึกลง rewarded แล้วสุ่มการ์ด) หรือ null */
export function pendingWaterReward(rec: FriendWaterRecord, now = new Date()): string | null {
  const s = summarizeFriendWater('', rec, now)
  if (s.streak === 0 || s.streak % WATER_REWARD_EVERY_DAYS !== 0 || !s.streakStartedOn) return null
  const key = `${s.streakStartedOn}:${s.streak / WATER_REWARD_EVERY_DAYS}`
  return rec.rewarded.includes(key) ? null : key
}
