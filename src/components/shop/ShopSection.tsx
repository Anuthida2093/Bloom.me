import { useState } from 'react'
import type { InventoryItem } from '../../types'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useAudio } from '../../context/AudioContext'
import { BADGE_ICONS, ITEM_ICONS } from '../../config/iconAssets'
import { useLanguage } from '../../context/LanguageContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ShopItemDialog, { type ShopDialogItem } from './ShopItemDialog'
import CategoryFilter from './CategoryFilter'
import { EXCHANGE_REQUIREMENTS } from '../../config/exchangeItems'
import { useProgression } from '../../hooks/useProgression'
import { exchangeItem } from '../../services/api/progression.api'
import { ApiError } from '../../services/http'
import { queryKeys } from '../../services/queryKeys'
import { getShopItems, INSUFFICIENT_COINS_MESSAGE } from '../../services/api/shop.api'
import { MOCK_SHOP_ITEMS, type MockShopItem } from '../../services/mock/mockData'
import PageTour from '../tour/PageTour'

const BG_28 = '#FFF9CC'
const BG_29 = '#FFE566'

interface ShopCategoryDef {
  id: string
  label: string
  emoji: string
}

const CATEGORIES: ShopCategoryDef[] = [
  { id: 'statues', label: 'รูปปั้นกระถาง', emoji: '🗿' },
  { id: 'hangings', label: 'ของแขวนกิ่งไม้', emoji: '🎐' },
  { id: 'postits', label: 'ลายโพสอิทสะสม', emoji: '🗒️' },
]


/* รายการสินค้ามาจาก getShopItems() (services/api/shop.api.ts) — ข้อมูลจำลองอยู่ที่ services/mock/mockData.ts
   (MOCK_SHOP_ITEMS: ราคา/หมวด/ความหายากของไอเทมทั้งหมดเดิมที่เคยอยู่ในไฟล์นี้) โหมด live ใช้ราคาจาก backend */
type ShopItem = MockShopItem

interface ShopSectionProps {
  /** [ตัวแปรตรง backend] เดิมรับ state.user.coins — ตอนนี้รับตรงจาก UserData.coins */
  coins?: number
  /** [ตัวแปรตรง backend] เดิมรับ state.ownedItems/placedItems (array ที่แปลงมาแล้ว) —
   *  ตอนนี้รับ InventoryItem[] ตรงๆ ตาม docs/DATA_DICTIONARY.md (UserItem model) แล้วเช็ค
   *  owned/equipped เองจาก shopItemId + isEquipped ในนี้เลย */
  inventoryData?: InventoryItem[]
  /** คืนข้อความ error (เช่นเหรียญไม่พอ) หรือ null เมื่อซื้อสำเร็จ */
  onBuy?: (itemId: string, price: number) => Promise<string | null> | void
  onEquip?: (itemId: string) => void
  /** [ข้อกำหนดข้อ 2] ปิดร้านค้า — Dashboard.tsx เรนเดอร์ component นี้ตรงๆ แบบ full-screen
   *  overlay เหมือน QuestSection แล้ว (ไม่ได้ครอบด้วย PanelModal อีกต่อไป) */
  onClose?: () => void
  /** เปิดร้านมาที่ไอเทมนี้ทันที (หมวดของมัน + ป็อปอัพรายละเอียด) — มาจากปุ่มการ์ดแลกซื้อในคลังไอเทม */
  initialItemId?: string | null
}

const findShopItem = (items: Record<string, ShopItem[]>, id: string | null | undefined) => {
  if (!id) return null
  for (const [category, list] of Object.entries(items)) {
    const item = list.find((i) => i.id === id)
    if (item) return { category, item }
  }
  return null
}

export default function ShopSection({ coins = 0, inventoryData = [], onBuy = () => {}, onEquip = () => {}, onClose, initialItemId = null }: ShopSectionProps) {
  useLockBodyScroll()
  useEscapeKey(() => onClose?.())
  const { t } = useLanguage()
  const { playGameSound } = useAudio()
  // รายการสินค้า: โหลดผ่าน service (mock = mockData.ts · live = GET /api/shop) — ระหว่างโหลดใช้ชุดจำลองไปก่อน ไม่กระพริบ
  const { data: shopItems = MOCK_SHOP_ITEMS } = useQuery({ queryKey: queryKeys.shopItems, queryFn: getShopItems, placeholderData: MOCK_SHOP_ITEMS })
  // shopCategory เป็นตัวเลือก UI ล้วนๆ ไม่มี field ไหนใน backend ตรงกับสิ่งนี้ — local state
  const [shopCategory, setShopCategory] = useState(() => findShopItem(shopItems, initialItemId)?.category ?? 'statues')
  /** ไอเทมที่กดดูอยู่ — ทุกการซื้อผ่านป็อปอัพ (รูปใหญ่ + ราคา + ยกเลิก/ซื้อ) ไม่ซื้อทันทีจากการ์ด */
  const [selected, setSelected] = useState<ShopDialogItem | null>(() => {
    const found = findShopItem(shopItems, initialItemId)
    return found && !inventoryData.some((i) => i.shopItemId === found.item.id) ? found.item : null
  })
  const progression = useProgression()
  const queryClient = useQueryClient()
  const currentItems = shopItems[shopCategory as keyof typeof shopItems] ?? []

  // [ใหม่] ห่อ onBuy ด้วยเสียงรับรางวัล/ซื้อของ — ตามที่ระบุ "ShopSection.tsx: Call
  // playGameSound('reward-claim') when ... buying an item"
  const handleBuy = async (item: ShopDialogItem): Promise<string | null> => {
    const error = await onBuy(item.id, item.price)
    if (error) return error
    playGameSound('reward-claim')
    return null
  }

  /** แลกซื้อของพิเศษ/หายาก — เหรียญ + การ์ดแลกซื้อ (เซิร์ฟเวอร์เป็นผู้ตัดสินจำนวนที่ขาด) */
  const handleExchange = async (item: ShopDialogItem): Promise<{ error: string | null; missing?: number }> => {
    try {
      await exchangeItem(item.id, item.price)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
      playGameSound('reward-claim')
      return { error: null }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_CARDS') {
        const missing = (error.detail as { error?: { missing?: number } } | undefined)?.error?.missing
        return { error: null, missing: missing ?? EXCHANGE_REQUIREMENTS[item.id]?.tokens ?? 1 }
      }
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_COINS') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.me }) // ดึงยอดเหรียญจริงมาแสดง
        return { error: INSUFFICIENT_COINS_MESSAGE }
      }
      return { error: error instanceof ApiError ? error.userMessage : 'แลกซื้อไม่สำเร็จ ลองอีกครั้ง' }
    }
  }

  return (
    // [ข้อกำหนดข้อ 2] Full Screen Overlay เหมือน QuestSection เป๊ะ — พื้นทึบเต็มจอ เลื่อนได้ มีปุ่มปิดของตัวเอง
    // [แก้ตามที่ระบุ] ทั้งหน้าร้านใช้ฟอนต์เดียวกับหน้า Welcome (--font-display) ปุ่มสืบทอดด้วย
    <div className="shop-page" style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', overflowY: 'auto', fontFamily: 'var(--font-display)' }}>
      <style>{`.shop-page button { font-family: inherit; }`}</style>
      <PageTour tourId="shop" />
      {/* [เพิ่มตามที่ระบุ] ปุ่มปิด (กากบาท) มุมขวาบน — แบบเดียวกับหน้าโปรไฟล์/ตั้งค่า */}
      <button
        onClick={() => onClose?.()}
        title={t('common.close')}
        aria-label={t('common.close')}
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 20, width: 44, height: 44, borderRadius: 99,
          border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--sh-card)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <img src={BADGE_ICONS.close} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
      </button>
    <section id="shop" style={{ padding: '72px 20px calc(var(--gpf-safe-bottom, 90px) + 24px)', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* [แก้ตามที่ระบุ] รูปร้านค้าขึ้นก่อน แล้วค่อยเป็นชื่อร้านบรรทัดถัดไป — ชื่อ/คำอธิบาย
              ดำในธีมสว่าง ขาวในธีมมืด (--text) */}
          <img src={BADGE_ICONS.store} alt="" style={{ width: 150, height: 150, objectFit: 'contain', display: 'block', margin: '0 auto 6px', filter: 'drop-shadow(0 6px 12px var(--glass-b-20))' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--text)' }}>{t('shop.title')}</h2>
          <p style={{ color: 'var(--text)', fontSize: 15, marginTop: 4 }}>ใช้เหรียญจากเควสเสริมมาตกแต่งต้นไม้ให้สวยงาม</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${BG_28}, ${BG_29})`, borderRadius: 99, padding: '8px 22px', marginTop: 12, boxShadow: 'var(--sh-coin)', border: '1.5px solid var(--coin)' }}>
            <img src={BADGE_ICONS.coins} className="icon-img" style={{ width: 38, height: 38, margin: '-6px 0' }} alt="" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--b700)' }}>{coins.toLocaleString()} เหรียญ</span>
          </div>
        </div>

        {/* [แก้ตามที่ระบุ — 2.4] แทนแท็บหมวดที่ตัดบรรทัดบนจอแคบ: จำนวนไอเทม + ปุ่มตัวกรอง (แบบเดียวกันทุกขนาดจอ)
            กดตัวกรอง → ตัวเลือก 3 หมวด (แสดงจำนวนของแต่ละหมวด) */}
        <div data-tour="shop-filter">
        <CategoryFilter
          count={currentItems.length}
          options={CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, count: (shopItems[cat.id as keyof typeof shopItems] ?? []).length }))}
          value={shopCategory}
          onChange={setShopCategory}
          ariaLabel="เลือกหมวดสินค้า"
        />
        </div>

        {/* Items grid */}
        <div data-tour="shop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {currentItems.map(item => {
            const owned = inventoryData.some(i => i.shopItemId === item.id)
            const equipped = inventoryData.some(i => i.shopItemId === item.id && i.isEquipped)
            const canAfford = coins >= item.price
            const exchangeReq = EXCHANGE_REQUIREMENTS[item.id]
            const tokensOwned = progression.exchangeCards[item.id] ?? 0
            const openDialog = () => { if (!owned) setSelected(item) }
            return (
              <div
                key={item.id}
                role={owned ? undefined : 'button'}
                tabIndex={owned ? undefined : 0}
                aria-label={owned ? undefined : `${exchangeReq ? 'แลกซื้อ' : 'ซื้อ'}${item.nameTh}`}
                onClick={openDialog}
                onKeyDown={(e) => { if (e.key === 'Enter') openDialog() }}
                style={{
                  // การ์ดพื้นอ่อนตายตัวทั้ง 2 ธีม (ชื่อไอเทมเป็นสีดำเสมอ) — เดิม --g50/--g100 กลายเป็นสีเข้มตอนธีมมืด
                  background: owned ? 'linear-gradient(135deg, var(--fixed-white), var(--leaf-soft))' : 'var(--fixed-white)',
                  borderRadius: 20, padding: '16px 10px', textAlign: 'center',
                  // [แก้ตามที่ระบุ] ทุกการ์ดมีขอบทอง — ไอเทมหายากยังมีวงม่วงซ้อนด้านนอกให้แยกระดับได้
                  border: '2px solid color-mix(in srgb, var(--coin) 70%, var(--g600))',
                  boxShadow: item.rarity === '🟡 พิเศษ' ? `0 0 0 2px var(--coin), var(--sh-card)` : item.rarity === '🟣 หายาก' ? `0 0 0 2px var(--purple), var(--sh-card)` : 'var(--sh-card)',
                  transition: 'transform .15s', cursor: 'pointer', position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                {/* Rarity tag */}
                <span className="tag" style={{ position: 'absolute', top: 10, right: 10, background: item.rarityBg, color: item.rarityColor, fontSize: 9 }}>{item.rarity}</span>
                {equipped && <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 700, background: 'var(--g600)', color: 'var(--fixed-white)', borderRadius: 99, padding: '2px 7px' }}>ใช้อยู่</span>}

                {/* [แก้ตามที่ระบุ — ข้อ 14] ขยายรูปไอเทม 50px→72px ให้เด่นชัดขึ้น (ลด padding
                    การ์ดลงเล็กน้อยเพื่อชดเชยพื้นที่) ใช้ไฟล์ภาพจริงถ้ามี (จับคู่ตาม item.id ใน
                    ITEM_ICONS) ไม่มีก็ fallback เป็น emoji เดิม — ดู src/config/iconAssets.ts */}
                <div style={{ fontSize: 72, marginBottom: 8, filter: 'drop-shadow(0 5px 10px var(--glass-b-18)) drop-shadow(0 2px 4px var(--glass-b-12))', lineHeight: 1.1 }}>
                  {ITEM_ICONS[item.id]
                    ? <img src={ITEM_ICONS[item.id]} alt={item.nameTh} loading="lazy" decoding="async" style={{ width: 92, height: 92, objectFit: 'contain', margin: '0 auto' }} />
                    : item.emoji}
                </div>

                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--fixed-black)', marginBottom: 2 }}>{item.nameTh}</div>
                <div style={{ fontSize: 10, color: 'var(--n300)', marginBottom: exchangeReq && !owned ? 6 : 12 }}>{item.name}</div>
                {exchangeReq && !owned && (
                  // ของพิเศษ/หายาก: ต้องมีการ์ดแลกซื้อ — บอกสถานะล็อกชัดเจนบนการ์ด
                  <div className="shop-card__token-req" title={`ต้องใช้การ์ดแลกซื้อ ${exchangeReq.tokens} ใบ`}>
                    <span aria-hidden="true">{tokensOwned >= exchangeReq.tokens ? '🔓' : '🔒'}</span>
                    <img src={BADGE_ICONS.item} alt="การ์ดแลกซื้อ" />
                    <span>{tokensOwned}/{exchangeReq.tokens}</span>
                  </div>
                )}

                {owned ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEquip(item.id) }}
                    style={{ width: '100%', padding: '8px', border: `1.5px solid ${equipped ? 'var(--g600)' : 'var(--n200)'}`, borderRadius: 'var(--r-sm)', background: equipped ? 'var(--g100)' : 'var(--fixed-white)', fontFamily: 'var(--font-display)', fontSize: 13, color: equipped ? 'var(--g700)' : 'var(--n500)', cursor: 'pointer' }}>
                    {equipped ? '✓ ถอดออก' : '🎀 สวมใส่'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelected(item) }}
                    style={{
                      width: '100%', padding: '8px', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      background: canAfford ? 'linear-gradient(135deg, var(--coin), var(--exp))' : 'var(--n100)',
                      color: canAfford ? 'var(--b700)' : 'var(--n300)',
                      fontFamily: 'var(--font-display)', fontSize: 13,
                      boxShadow: canAfford ? 'var(--sh-coin)' : 'none',
                    }}>
                    <img src={BADGE_ICONS.coins} className="icon-img" style={{ width: 24, height: 24, margin: '-4px 2px -4px 0' }} alt="" /> {item.price.toLocaleString()}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
    {selected && (
      <ShopItemDialog
        key={selected.id}
        item={selected}
        coins={coins}
        tokensOwned={progression.exchangeCards[selected.id] ?? 0}
        onBuy={handleBuy}
        onExchange={handleExchange}
        onClose={() => setSelected(null)}
      />
    )}
    <style>{`
      .shop-card__token-req {
        display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px;
        padding: 2px 8px; border-radius: 99px; font-size: 12px; color: #6b4a00;
        background: #FFF9C4; box-shadow: inset 0 0 0 1.5px #f5b301;
      }
      .shop-card__token-req img { width: 20px; height: 20px; object-fit: contain; }

    `}</style>
    </div>
  )
}