import { http, isMockMode, ApiError, mockDelay } from '../http'
import { getDb, updateDb, emptyProgression, type MockDb } from '../mock/mockDb'
import { pickRandomExchangeItem } from '../../config/exchangeItems'
import { bangkokDateString } from '../../utils/progression'
import {
  emptyFriendWater, pendingWaterReward, summarizeFriendWater, type FriendWaterRecord, type FriendWaterSummary,
} from '../../utils/friendWater'
import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'

/*============================================================================*\
  friendWater.api — รดน้ำต้นไม้ให้เพื่อน (ดูกติกาที่ utils/friendWater.ts)
  ────────────────────────────────────────────────────────────────────────────
  backend จริง (ยังไม่มี — ข้อเสนอใน docs/DB_CHANGES.md ข้อ 11):
    GET  /friends/:friendId/water        → FriendWaterSummary
    POST /friends/:friendId/water        → { summary, rewardCardItemCode } · รดซ้ำวันเดียวกัน = 409 ALREADY_WATERED
  โหมด mock: เพื่อนเป็นผู้ใช้จำลอง รดน้ำกลับเองไม่ได้ → จำลองให้เพื่อน "รดกลับ" ~80% ของวัน (คงที่ต่อเพื่อน+วัน)
  นับตั้งแต่วันแรกที่เรารดให้ — วันนี้เพื่อนรดกลับหลังเรารดเท่านั้น ได้ทดสอบสีฟ้า/เทา/ดับ และรางวัลครบ 100 วัน
\*============================================================================*/

export interface WaterFriendResult {
  summary: FriendWaterSummary
  /** ครบหลักร้อยวัน → การ์ดแลกซื้อที่สุ่มได้ (เพื่อนก็ได้ 1 ใบเช่นกัน — ฝั่งเซิร์ฟเวอร์ให้) */
  rewardCardItemCode: string | null
}

/** โอกาสที่เพื่อนจำลองรดกลับในแต่ละวัน */
const MOCK_FRIEND_WATER_CHANCE = 0.8

function hash01(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}

function recordOf(d: MockDb, friendId: string): FriendWaterRecord {
  if (!d.progression) d.progression = emptyProgression(bangkokDateString())
  const all = (d.progression.friendWater ??= {})
  return (all[friendId] ??= emptyFriendWater())
}

/** ผู้เล่นจำลองที่ติดตามเราอยู่ (กิจกรรม "เริ่มติดตามคุณ") — คนที่ยังไม่ติดตามกลับจะไม่รดน้ำให้เรา */
function followsMe(d: MockDb, friendId: string): boolean {
  return d.activity.some((a) => a.type === 'NEW_FOLLOWER' && a.actorId === friendId)
}

/** เพื่อนจำลองรดกลับ: ทุกวันตั้งแต่วันแรกที่เรารด ถึงวันนี้ (วันนี้เฉพาะหลังเรารดแล้ว)
 *  เฉพาะคนที่ติดตามเราอยู่ — เรารดให้คนที่ยังไม่ติดตามกลับได้ (หยดน้ำฟ้าครึ่ง) แต่ยังไม่นับวันต่อเนื่อง */
function simulateFriend(d: MockDb, rec: FriendWaterRecord, friendId: string, now: Date) {
  if (!followsMe(d, friendId)) return
  const firstMine = Object.keys(rec.mine).sort()[0]
  if (!firstMine) return
  const today = bangkokDateString(now)
  const cursor = new Date(`${firstMine}T05:00:00Z`) // เที่ยงวันเวลาไทย
  for (let date = firstMine; date <= today; cursor.setUTCDate(cursor.getUTCDate() + 1), date = bangkokDateString(cursor)) {
    if (rec.theirs[date] || hash01(`${friendId}:${date}`) >= MOCK_FRIEND_WATER_CHANCE) continue
    if (date === today) {
      if (!rec.mine[today]) continue
      rec.theirs[date] = new Date(Date.parse(rec.mine[today]) + 2 * 60 * 1000).toISOString()
    } else {
      rec.theirs[date] = cursor.toISOString()
    }
  }
}

/** GET /friends/:friendId/water */
export async function getFriendWater(friendId: string): Promise<FriendWaterSummary> {
  if (isMockMode()) {
    await mockDelay(60)
    const now = new Date()
    let summary!: FriendWaterSummary
    // เพื่อนจำลองรดกลับต้องบันทึกจริง (ตัวเลข "เพื่อนรดให้เรา" คงที่ทุกครั้งที่เปิด)
    if (getDb().progression?.friendWater?.[friendId]) {
      updateDb((d) => {
        const rec = recordOf(d, friendId)
        simulateFriend(d, rec, friendId, now)
        summary = summarizeFriendWater(friendId, rec, now)
      })
    } else {
      summary = summarizeFriendWater(friendId, emptyFriendWater(), now)
    }
    return summary
  }
  return http.get<FriendWaterSummary>(`/friends/${encodeURIComponent(friendId)}/water`)
}

/** POST /friends/:friendId/water — รดน้ำให้เพื่อน (วันละครั้ง) */
export async function waterFriend(friendId: string): Promise<WaterFriendResult> {
  if (isMockMode()) {
    await mockDelay()
    const now = new Date()
    const today = bangkokDateString(now)
    if (getDb().progression?.friendWater?.[friendId]?.mine[today]) {
      throw new ApiError(409, 'วันนี้รดน้ำให้เพื่อนคนนี้แล้ว', { error: { code: 'ALREADY_WATERED' } })
    }
    let result!: WaterFriendResult
    updateDb((d) => {
      const rec = recordOf(d, friendId)
      rec.mine[today] = now.toISOString()
      simulateFriend(d, rec, friendId, now)
      let rewardCardItemCode: string | null = null
      const rewardKey = pendingWaterReward(rec, now)
      if (rewardKey && d.progression) {
        rewardCardItemCode = pickRandomExchangeItem()
        d.progression.exchangeCards[rewardCardItemCode] = (d.progression.exchangeCards[rewardCardItemCode] ?? 0) + 1
        rec.rewarded.push(rewardKey)
      }
      result = { summary: summarizeFriendWater(friendId, rec, now), rewardCardItemCode }
    })
    return result
  }
  return http.post<WaterFriendResult>(`/friends/${encodeURIComponent(friendId)}/water`, {})
}

/** คนที่รดน้ำให้เราวันนี้ — ใช้ในแผงข้อมูลต้นไม้ */
export interface WateredMeToday {
  friendId: string
  username: string
  /** เวลาที่รด (ISO) */
  at: string
}

/** GET /friends/water/today — วันนี้ใครรดน้ำให้เราบ้าง (ใหม่ล่าสุดก่อน)
 *  backend ยังไม่มี endpoint นี้ — ข้อเสนอ: คืนแถว friend_waters ของวันนี้ (เวลาไทย) ที่ปลายทางคือเรา + ชื่อผู้รด */
export async function getWateredMeToday(): Promise<WateredMeToday[]> {
  if (isMockMode()) {
    await mockDelay(60)
    const today = bangkokDateString()
    const all = getDb().progression?.friendWater ?? {}
    return Object.entries(all)
      .filter(([, rec]) => rec.theirs[today])
      .map(([friendId, rec]) => ({
        friendId,
        username: MOCK_LEADERBOARD_PLAYERS.find((p) => p.id === friendId)?.username ?? 'เพื่อน',
        at: rec.theirs[today],
      }))
      .sort((a, b) => b.at.localeCompare(a.at))
  }
  return http.get<WateredMeToday[]>('/friends/water/today')
}
