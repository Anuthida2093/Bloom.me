import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { InventoryItem, UserData } from '../../types'
import { toInventoryItem } from './adapters'
import { getMe } from './user.api'

/*============================================================================*\
  shop.api.ts — [ไฟล์ใหม่] ซื้อ/สวมใส่ไอเทมตกแต่ง
  ────────────────────────────────────────────────────────────────────────────
  buyItem คืน user กลับมาด้วยเสมอ เพราะการซื้อหักเหรียญ — ถ้าไม่คืนมา
  ยอดเหรียญบนหน้าจอจะไม่ตรงกับของจริงจนกว่าจะ refetch รอบถัดไป
\*============================================================================*/

export interface BuyResult { item: InventoryItem; user: UserData }

export async function getInventory(): Promise<InventoryItem[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().inventory }
  const raw = await http.get<Record<string, unknown>[]>('/shop/inventory/me')
  return raw.map(toInventoryItem)
}

export async function buyItem(shopItemId: string, price: number): Promise<BuyResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const db = updateDb((d) => {
      if (d.inventory.some((i) => i.shopItemId === shopItemId)) return
      if (d.user.coins < price) return
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