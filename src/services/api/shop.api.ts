import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { InventoryItem, UserData } from '../../types'

/*============================================================================*\
  shop.api.ts — [ไฟล์ใหม่] ซื้อ/สวมใส่ไอเทมตกแต่ง
  ────────────────────────────────────────────────────────────────────────────
  buyItem คืน user กลับมาด้วยเสมอ เพราะการซื้อหักเหรียญ — ถ้าไม่คืนมา
  ยอดเหรียญบนหน้าจอจะไม่ตรงกับของจริงจนกว่าจะ refetch รอบถัดไป
\*============================================================================*/

export interface BuyResult { item: InventoryItem; user: UserData }

export async function getInventory(): Promise<InventoryItem[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().inventory }
  return http.get<InventoryItem[]>('/inventory')
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
  return http.post<BuyResult>('/shop/buy', { shopItemId })
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
  return http.patch<InventoryItem[]>(`/inventory/${shopItemId}/equip`, {})
}