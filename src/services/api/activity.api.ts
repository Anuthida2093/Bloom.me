import { http, API_MODE } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'
import { ALL_QUESTS } from '../../config/questCatalog'
import { DECORATION_ITEM_META } from '../../config/decorationItems'
import { EXCHANGE_REQUIREMENTS } from '../../config/exchangeItems'

/*============================================================================*\
  activity.api.ts — ฟีดความคืบหน้าของคนที่เราติดตาม (เลเวลอัป / ทำเควสสำเร็จ / ปลดล็อกไอเทมให้เรา)
  ────────────────────────────────────────────────────────────────────────────
  backend: GET /api/activity/recent?since=<ISO> (bloom-me-project activity.controller.ts)
  คืนเฉพาะเหตุการณ์ของคนที่เรากดติดตาม (ไม่รวมบัญชีปิดโปรไฟล์/คู่ที่บล็อกกัน) ใหม่สุดก่อน สูงสุด 20 รายการ
  เป็นการ poll ธรรมดา — ถ้าอนาคตย้ายไป WebSocket รูปข้อมูลชุดนี้ใช้ต่อได้เลย เปลี่ยนแค่วิธีส่ง

  ITEM_UNLOCKED — "[เพื่อน] ปลดล็อก [ไอเทม] ให้คุณ!" หน้าเว็บรองรับแล้ว แต่ backend ยังไม่มี
  enum ProgressEventType.ITEM_UNLOCKED และยังไม่มีระบบมอบไอเทมให้เพื่อน (ต้องเพิ่มฝั่ง backend
  ก่อนจึงจะมีเหตุการณ์จริงในโหมด live) — payload: { itemCode, itemName, recipientId }
\*============================================================================*/

export type ProgressEventType = 'LEVEL_UP' | 'QUEST_COMPLETED' | 'ITEM_UNLOCKED'

export interface ProgressEvent {
  id: string
  type: ProgressEventType
  /** LEVEL_UP → { level } · QUEST_COMPLETED → { questCode, questTitle } · ITEM_UNLOCKED → { itemCode, itemName, recipientId } */
  payload: {
    level?: number
    questCode?: string
    questTitle?: string
    itemCode?: string
    itemName?: string
    /** ผู้รับไอเทม — ITEM_UNLOCKED แจ้งเฉพาะเมื่อเป็นเรา */
    recipientId?: string
  }
  createdAt: string
  user: { id: string; username: string; avatarUrl: string | null }
}

export async function getRecentProgressEvents(since: string | null): Promise<ProgressEvent[]> {
  if (API_MODE === 'mock') return mockRecentEvents()
  const query = since ? `?since=${encodeURIComponent(since)}` : ''
  return http.get<ProgressEvent[]>(`/activity/recent${query}`)
}

/* ── โหมด mock: จำลองเพื่อนจากกระดานจัดอันดับตัวอย่าง ให้เห็น toast/แจ้งเตือนทำงานจริงโดยไม่ต้องมี backend
   สุ่มไม่เกิน 1 เหตุการณ์ต่อรอบ poll (โอกาส ~35%) — รอบแรกไม่สุ่ม (เปิดแอปมาไม่ควรมี toast เด้งทันที) */
let mockPolls = 0
const MOCK_EVENT_CHANCE = 0.35

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function mockRecentEvents(): ProgressEvent[] {
  mockPolls += 1
  if (mockPolls === 1 || Math.random() > MOCK_EVENT_CHANCE) return []
  const friend = pick(MOCK_LEADERBOARD_PLAYERS)
  const user = { id: friend.id, username: friend.username, avatarUrl: null }
  const base = { id: `mock-ev-${Date.now()}`, createdAt: new Date().toISOString(), user }
  const roll = Math.random()
  if (roll < 0.5) {
    const quest = pick(ALL_QUESTS)
    return [{ ...base, type: 'QUEST_COMPLETED', payload: { questCode: quest.code, questTitle: quest.titleTh } }]
  }
  const db = getDb()
  const owned = new Set(db.inventory.map((i) => i.shopItemId))
  // ของพิเศษ/หายากได้ด้วยไอเทมแลกซื้อเท่านั้น — เพื่อนมอบให้ได้แค่ของธรรมดา
  const giftable = Object.entries(DECORATION_ITEM_META).filter(([code, meta]) => meta.category !== 'special' && !owned.has(code) && !EXCHANGE_REQUIREMENTS[code])
  if (roll < 0.8 || giftable.length === 0) return [{ ...base, type: 'LEVEL_UP', payload: { level: friend.level + 1 } }]
  // ใส่ไอเทมเข้ากระเป๋าจริง (mockDb) — แจ้งเตือนต้องตรงกับของที่ได้ ไม่ใช่ข้อความลอยๆ
  const [itemCode, meta] = pick(giftable)
  updateDb((d) => {
    d.inventory.push({ id: `local-${itemCode}`, userId: d.user.id, shopItemId: itemCode, isEquipped: false, purchasedAt: base.createdAt })
  })
  return [{ ...base, type: 'ITEM_UNLOCKED', payload: { itemCode, itemName: meta.nameTh, recipientId: db.user.id } }]
}
