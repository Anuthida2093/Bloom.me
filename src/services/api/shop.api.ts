import { http, API_MODE, ApiError, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { InventoryItem, UserData } from '../../types'
import { toInventoryItem } from './adapters'
import { getMe } from './user.api'
import { MOCK_SHOP_ITEMS, type MockShopItem, type ShopCategoryId } from '../mock/mockData'

/*============================================================================*\
  shop.api.ts — [ไฟล์ใหม่] ซื้อ/สวมใส่ไอเทมตกแต่ง
  ────────────────────────────────────────────────────────────────────────────
  buyItem คืน user กลับมาด้วยเสมอ เพราะการซื้อหักเหรียญ — ถ้าไม่คืนมา
  ยอดเหรียญบนหน้าจอจะไม่ตรงกับของจริงจนกว่าจะ refetch รอบถัดไป
\*============================================================================*/

export interface BuyResult { item: InventoryItem; user: UserData }

export type ShopCatalog = Record<ShopCategoryId, MockShopItem[]>

/** GET /api/shop — รายการสินค้าในร้าน แยกตามหมวด
 *  mock: ข้อมูลจำลอง (services/mock/mockData.ts → MOCK_SHOP_ITEMS)
 *  live: ราคา/สถานะเปิดขายมาจาก backend (จับคู่ด้วย ShopItem.code) — ชื่อไทย/อีโมจิ/ป้ายความหายากยังใช้ของหน้าเว็บ
 *        (backend ไม่มีฟิลด์เหล่านี้) ไอเทมที่ backend ไม่มี code ตรงกันยังแสดงด้วยราคาในชุดจำลอง */
export async function getShopItems(): Promise<ShopCatalog> {
  if (API_MODE === 'mock') { await mockDelay(80); return MOCK_SHOP_ITEMS }
  const rows = await http.get<{ code?: string | null; price: number; isActive?: boolean }[]>('/shop')
  const byCode = new Map(rows.filter((r) => r.code).map((r) => [r.code as string, r]))
  const merge = (list: MockShopItem[]) => list
    .filter((it) => byCode.get(it.id)?.isActive !== false)
    .map((it) => (byCode.has(it.id) ? { ...it, price: byCode.get(it.id)!.price } : it))
  return { statues: merge(MOCK_SHOP_ITEMS.statues), hangings: merge(MOCK_SHOP_ITEMS.hangings), postits: merge(MOCK_SHOP_ITEMS.postits) }
}

export async function getInventory(): Promise<InventoryItem[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().inventory }
  const raw = await http.get<Record<string, unknown>[]>('/shop/inventory/me')
  return raw.map(toInventoryItem)
}

/** [แก้ตามที่ระบุ — 2.4] ข้อความเมื่อเหรียญไม่พอ (backend ตอบ 400 INSUFFICIENT_COINS) — ใช้ทั้งซื้อและแลกซื้อ */
export const INSUFFICIENT_COINS_MESSAGE = 'จำนวนเหรียญของคุณไม่เพียงพอ'

export async function buyItem(shopItemId: string, price: number): Promise<BuyResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    // ตรงกับ backend: เหรียญไม่พอ → 400 INSUFFICIENT_COINS (ไม่ใช่เงียบแล้วคืนผลเหมือนซื้อสำเร็จ)
    const current = getDb()
    if (!current.inventory.some((i) => i.shopItemId === shopItemId) && current.user.coins < price) {
      throw new ApiError(400, INSUFFICIENT_COINS_MESSAGE, { error: { code: 'INSUFFICIENT_COINS' } })
    }
    const db = updateDb((d) => {
      if (d.inventory.some((i) => i.shopItemId === shopItemId)) return
      d.user = { ...d.user, coins: d.user.coins - price }
      d.inventory.push({
        id: `local-${shopItemId}`, userId: d.user.id, shopItemId,
        isEquipped: false, purchasedAt: new Date().toISOString(),
      })
    })
    const item = db.inventory.find((i) => i.shopItemId === shopItemId) as InventoryItem
    return { item, user: db.user }
  }
  // backend: POST /api/shop/:id/purchase → { userItem, user } (user เป็น select ย่อย
  // id/level/exp/coins/streak) — ดึงโปรไฟล์เต็มซ้ำอีกครั้งให้แคชฝั่งหน้าเว็บครบทุก field
  const res = await http.post<{ userItem: Record<string, unknown> }>(`/shop/${shopItemId}/purchase`)
  return { item: toInventoryItem(res.userItem), user: await getMe() }
}

export async function toggleEquip(shopItemId: string): Promise<InventoryItem[]> {
  if (API_MODE === 'mock') {
    await mockDelay(120)
    return updateDb((d) => {
      d.inventory = d.inventory.map((i) =>
        i.shopItemId === shopItemId ? { ...i, isEquipped: !i.isEquipped } : i,
      )
    }).inventory
  }
  // backend: PATCH /api/shop/inventory/:userItemId/equip { isEquipped } — ใช้ id ของแถว
  // user_items (ไม่ใช่ shopItemId) และต้องบอกสถานะปลายทางชัดๆ ไม่ใช่ toggle
  const inventory = await getInventory()
  const owned = inventory.find((i) => i.shopItemId === shopItemId)
  if (!owned) return inventory
  await http.patch(`/shop/inventory/${owned.id}/equip`, { isEquipped: !owned.isEquipped })
  return getInventory()
}