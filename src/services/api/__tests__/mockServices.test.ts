// @vitest-environment jsdom
/*============================================================================*\
  mockServices.test.ts — ฟังก์ชัน service ที่หน้าจอใช้ (โหมด mock): รายการสินค้า / เควส + สถานะ / ซื้อ-สวมใส่
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('mock services', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'mock')
    window.localStorage.clear()
  })
  afterEach(() => { vi.unstubAllEnvs(); window.localStorage.clear() })

  it('getShopItems คืนรายการจาก mockData แยก 3 หมวด', async () => {
    const { getShopItems } = await import('../shop.api')
    const { MOCK_SHOP_ITEMS } = await import('../../mock/mockData')
    const items = await getShopItems()
    expect(items).toEqual(MOCK_SHOP_ITEMS)
    expect(items.statues.length).toBeGreaterThan(0)
  })

  it('getQuests: เริ่มต้นทุกเควส pending → ทำสำเร็จแล้วสถานะเป็น completed', async () => {
    const quest = await import('../quest.api')
    const before = await quest.getQuests()
    expect(before.every((q) => q.status === 'pending')).toBe(true)
    await quest.completeQuest({ questCode: 'phys-hydration-drop' })
    const after = await quest.getQuests()
    expect(after.find((q) => q.code === 'phys-hydration-drop')?.status).toBe('completed')
  })

  it('ซื้อไอเทม → เหรียญลด ไอเทมเข้าคลัง → สวมใส่ได้', async () => {
    const db = await import('../../mock/mockDb')
    db.updateDb((d) => { d.user = { ...d.user, coins: 1_000 } })
    const shop = await import('../shop.api')
    const { user } = await shop.buyItem('frog-guard', 500)
    expect(user.coins).toBe(500)
    const inventory = await shop.toggleEquip('frog-guard')
    expect(inventory.find((i) => i.shopItemId === 'frog-guard')?.isEquipped).toBe(true)
  })
})
