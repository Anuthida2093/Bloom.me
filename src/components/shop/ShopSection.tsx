import { useState } from 'react'
import type { InventoryItem } from '../../types'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useAudio } from '../../context/AudioContext'
import { BADGE_ICONS, ITEM_ICONS } from '../../config/iconAssets'

const C_1 = '#F0FBF4'
const C_2 = '#F0FBF4'
const C_3 = '#FFF9C4'
const C_4 = '#8B6000'
const C_5 = '#F5EDFF'
const C_6 = '#7B2FBE'
const C_7 = '#F0FBF4'
const C_8 = '#F5EDFF'
const C_9 = '#7B2FBE'
const C_10 = '#F0FBF4'
const C_11 = '#F0FBF4'
const C_12 = '#F5EDFF'
const C_13 = '#7B2FBE'
const C_14 = '#F5EDFF'
const C_15 = '#7B2FBE'
const C_16 = '#F0FBF4'
const C_17 = '#FFF9C4'
const C_18 = '#8B6000'
const C_19 = '#F0FBF4'
const C_20 = '#F0FBF4'
const C_21 = '#F5EDFF'
const C_22 = '#7B2FBE'
const C_23 = '#F5EDFF'
const C_24 = '#7B2FBE'
const C_25 = '#FFF9C4'
const C_26 = '#8B6000'
const C_27 = '#F0FBF4'
const BG_28 = '#FFF9CC'
const BG_29 = '#FFE566'
const C_30 = 'rgba(139,94,60,.4)'

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

interface ShopItem {
  id: string
  emoji: string
  nameTh: string
  name: string
  price: number
  rarity: string
  rarityBg: string
  rarityColor: string
}

/* [แก้รอบนี้ — เทียบราคา/หมวดกับตาราง 23 รายการในเอกสาร docx จริงทีละแถว ไม่ใช่จำมา]
   ราคา/หมวดของไอเทมเดิม 3 ตัวที่เอกสารระบุไว้ต่างจากของเดิมในระบบ ปรับให้ตรงเอกสาร:
     - lucky-clover (Clover) 300→200
     - fox-statue (สุนัขจิ้งจอก) 200→800
     - frog-guard (กบวิเศษ) 350→500
     - moon-charm (รูปเสี้ยวพระจันทร์) 150→100
     - magic-wand (ไม้เท้าเวทมนตร์) 550→150
     - calm-butterfly (ผีเสื้อ) ย้ายหมวด statues→postits, ราคา 600→800
     - crystal-ball (ลูกแก้ว) ย้ายหมวด hangings→postits, ราคา 700→1000
     - diamond-gem (เพชร) ย้ายหมวด hangings→postits, ราคา 1500→500
   ไอเทมที่เอกสารไม่ได้ระบุราคา/หมวด (jade-dragon, scholar-koala, gold-star, circus-bell,
   rainbow-swirl, butterfly-pat, flame-pattern, ocean-wave) คงราคา/หมวด/rarity เดิมไว้ทั้งหมด
   ไม่แตะ — ไม่ใช่ 1 ใน 23 รายการของเอกสารรอบนี้ rarity ของไอเทมใหม่ (🟡/🟣/⚪) เป็นการอนุมาน
   จากป้าย "หายาก"/ราคาในเอกสารเทียบกับ tier ที่ระบบมีอยู่แล้ว เอกสารเองไม่มีคอลัมน์ rarity ตรงๆ */
const ITEMS: Record<string, ShopItem[]> = {
  statues: [
    { id: 'frog-guard', emoji: '🐸', nameTh: 'กบผู้พิทักษ์', name: 'Frog Guard', price: 500, rarity: '⚪ ธรรมดา', rarityBg: C_1, rarityColor: 'var(--g600)' },
    { id: 'fox-statue', emoji: '🦊', nameTh: 'รูปปั้นจิ้งจอก', name: 'Fox Statue', price: 800, rarity: '⚪ ธรรมดา', rarityBg: C_2, rarityColor: 'var(--g600)' },
    { id: 'jade-dragon', emoji: '🐉', nameTh: 'มังกรหยก', name: 'Jade Dragon', price: 1200, rarity: '🟡 พิเศษ', rarityBg: C_3, rarityColor: C_4 },
    { id: 'scholar-koala', emoji: '🐨', nameTh: 'โคอาล่านักวิชาการ', name: 'Scholar Koala', price: 480, rarity: '⚪ ธรรมดา', rarityBg: C_7, rarityColor: 'var(--g600)' },
    { id: 'forest-unicorn', emoji: '🦄', nameTh: 'ยูนิคอร์นป่า', name: 'Forest Unicorn', price: 900, rarity: '🟣 หายาก', rarityBg: C_8, rarityColor: C_9 },
    // ── ใหม่จากเอกสาร (หมวด "รูปปั้นกระถาง") ──
    { id: 'fire-dragon', emoji: '🐲', nameTh: 'มังกรไฟ', name: 'Fire Dragon', price: 2500, rarity: '🟡 พิเศษ', rarityBg: C_3, rarityColor: C_4 },
    { id: 'cat-statue', emoji: '🐱', nameTh: 'แมว', name: 'Cat Statue', price: 500, rarity: '⚪ ธรรมดา', rarityBg: C_1, rarityColor: 'var(--g600)' },
    { id: 'rabbit-statue', emoji: '🐰', nameTh: 'กระต่าย', name: 'Rabbit Statue', price: 350, rarity: '⚪ ธรรมดา', rarityBg: C_2, rarityColor: 'var(--g600)' },
    { id: 'seedling-pot', emoji: '🪴', nameTh: 'กระถางต้นกล้า', name: 'Seedling Pot', price: 700, rarity: '⚪ ธรรมดา', rarityBg: C_7, rarityColor: 'var(--g600)' },
    { id: 'stone-statue', emoji: '🪨', nameTh: 'ก้อนหิน', name: 'Stone', price: 300, rarity: '⚪ ธรรมดา', rarityBg: C_1, rarityColor: 'var(--g600)' },
  ],
  hangings: [
    { id: 'gold-star', emoji: '⭐', nameTh: 'ดาวทอง', name: 'Gold Star', price: 250, rarity: '⚪ ธรรมดา', rarityBg: C_10, rarityColor: 'var(--g600)' },
    { id: 'moon-charm', emoji: '🌙', nameTh: 'จี้พระจันทร์', name: 'Moon Charm', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_11, rarityColor: 'var(--g600)' },
    { id: 'magic-wand', emoji: '🪄', nameTh: 'ไม้กายสิทธิ์', name: 'Magic Wand', price: 150, rarity: '🟣 หายาก', rarityBg: C_14, rarityColor: C_15 },
    { id: 'circus-bell', emoji: '🔔', nameTh: 'ระฆังวิเศษ', name: 'Magic Bell', price: 320, rarity: '⚪ ธรรมดา', rarityBg: C_16, rarityColor: 'var(--g600)' },
    // ── ใหม่จากเอกสาร (หมวด "ของแขวนกิ่งไม้") ──
    { id: 'pendant-charm', emoji: '📿', nameTh: 'จี้', name: 'Pendant Charm', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_10, rarityColor: 'var(--g600)' },
  ],
  postits: [
    { id: 'cherry-blossom', emoji: '🌸', nameTh: 'ซากุระ', name: 'Cherry Blossom', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_19, rarityColor: 'var(--g600)' },
    { id: 'rainbow-swirl', emoji: '🌈', nameTh: 'หมุนวนสายรุ้ง', name: 'Rainbow Swirl', price: 180, rarity: '⚪ ธรรมดา', rarityBg: C_20, rarityColor: 'var(--g600)' },
    { id: 'lucky-clover', emoji: '🍀', nameTh: 'ใบโคลเวอร์โชค', name: 'Lucky Clover', price: 200, rarity: '🟣 หายาก', rarityBg: C_21, rarityColor: C_22 },
    { id: 'butterfly-pat', emoji: '🦋', nameTh: 'ลายผีเสื้อ', name: 'Butterfly Pattern', price: 400, rarity: '🟣 หายาก', rarityBg: C_23, rarityColor: C_24 },
    { id: 'flame-pattern', emoji: '🔥', nameTh: 'ลายเปลวไฟ', name: 'Flame Pattern', price: 800, rarity: '🟡 พิเศษ', rarityBg: C_25, rarityColor: C_26 },
    { id: 'ocean-wave', emoji: '🌊', nameTh: 'คลื่นสมุทร', name: 'Ocean Wave', price: 220, rarity: '⚪ ธรรมดา', rarityBg: C_27, rarityColor: 'var(--g600)' },
    { id: 'calm-butterfly', emoji: '🦋', nameTh: 'ผีเสื้อสงบ', name: 'Calm Butterfly', price: 800, rarity: '🟣 หายาก', rarityBg: C_5, rarityColor: C_6 },
    { id: 'crystal-ball', emoji: '🔮', nameTh: 'ลูกแก้วคริสตัล', name: 'Crystal Ball', price: 1000, rarity: '🟣 หายาก', rarityBg: C_12, rarityColor: C_13 },
    { id: 'diamond-gem', emoji: '💎', nameTh: 'เพชรพลอย', name: 'Diamond Gem', price: 500, rarity: '⚪ ธรรมดา', rarityBg: C_19, rarityColor: 'var(--g600)' },
    // ── ใหม่จากเอกสาร (หมวด "ลายโพสอิทสะสม") ──
    { id: 'magic-parrot', emoji: '🦜', nameTh: 'นกแก้ววิเศษ', name: 'Magic Parrot', price: 2000, rarity: '🟡 พิเศษ', rarityBg: C_25, rarityColor: C_26 },
    { id: 'parrot', emoji: '🦜', nameTh: 'นกแก้ว', name: 'Parrot', price: 1000, rarity: '⚪ ธรรมดา', rarityBg: C_20, rarityColor: 'var(--g600)' },
    { id: 'white-dragon', emoji: '🐉', nameTh: 'มังกรขาว', name: 'White Dragon', price: 3000, rarity: '🟡 พิเศษ', rarityBg: C_17, rarityColor: C_18 },
    { id: 'glass-orb', emoji: '🥛', nameTh: 'แก้ว', name: 'Glass Orb', price: 550, rarity: '⚪ ธรรมดา', rarityBg: C_27, rarityColor: 'var(--g600)' },
    { id: 'magic-flame', emoji: '🔥', nameTh: 'ไฟวิเศษ', name: 'Magic Flame', price: 400, rarity: '⚪ ธรรมดา', rarityBg: C_19, rarityColor: 'var(--g600)' },
    { id: 'cherry-fruit', emoji: '🍒', nameTh: 'เชอรี่', name: 'Cherry', price: 150, rarity: '⚪ ธรรมดา', rarityBg: C_20, rarityColor: 'var(--g600)' },
    { id: 'ribbon-knot', emoji: '🎀', nameTh: 'โบว์', name: 'Ribbon Bow', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_23, rarityColor: 'var(--g600)' },
  ],
}

interface ShopSectionProps {
  /** [ตัวแปรตรง backend] เดิมรับ state.user.coins — ตอนนี้รับตรงจาก UserData.coins */
  coins?: number
  /** [ตัวแปรตรง backend] เดิมรับ state.ownedItems/placedItems (array ที่แปลงมาแล้ว) —
   *  ตอนนี้รับ InventoryItem[] ตรงๆ ตาม docs/DATA_DICTIONARY.md (UserItem model) แล้วเช็ค
   *  owned/equipped เองจาก shopItemId + isEquipped ในนี้เลย */
  inventoryData?: InventoryItem[]
  onBuy?: (itemId: string, price: number) => void
  onEquip?: (itemId: string) => void
  /** [ข้อกำหนดข้อ 2] ปิดร้านค้า — Dashboard.tsx เรนเดอร์ component นี้ตรงๆ แบบ full-screen
   *  overlay เหมือน QuestSection แล้ว (ไม่ได้ครอบด้วย PanelModal อีกต่อไป) */
  onClose?: () => void
}

export default function ShopSection({ coins = 0, inventoryData = [], onBuy = () => {}, onEquip = () => {}, onClose }: ShopSectionProps) {
  useLockBodyScroll()
  useEscapeKey(() => onClose?.())
  const { playGameSound } = useAudio()
  // shopCategory เป็นตัวเลือก UI ล้วนๆ ไม่มี field ไหนใน backend ตรงกับสิ่งนี้ — local state
  const [shopCategory, setShopCategory] = useState('statues')

  // [ใหม่] ห่อ onBuy ด้วยเสียงรับรางวัล/ซื้อของ — ตามที่ระบุ "ShopSection.tsx: Call
  // playGameSound('reward-claim') when ... buying an item"
  const handleBuyClick = (itemId: string, price: number) => {
    onBuy(itemId, price)
    playGameSound('reward-claim')
  }

  return (
    // [ข้อกำหนดข้อ 2] Full Screen Overlay เหมือน QuestSection เป๊ะ — พื้นทึบเต็มจอ เลื่อนได้ มีปุ่มปิดของตัวเอง
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'linear-gradient(180deg, var(--n50) 0%, var(--b50) 100%)', overflowY: 'auto' }}>
    <section id="shop" style={{ padding: '24px 20px 48px', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Fredoka One', fontSize: 34, color: 'var(--b700)' }}><img src={BADGE_ICONS.store} className="icon-img" alt="" /> ร้านตกแต่งต้นไม้</h2>
          <p style={{ color: 'var(--b500)', fontSize: 15, marginTop: 4 }}>ใช้เหรียญจากเควสเสริมมาตกแต่งต้นไม้ให้สวยงาม</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${BG_28}, ${BG_29})`, borderRadius: 99, padding: '8px 22px', marginTop: 12, boxShadow: 'var(--sh-coin)', border: '1.5px solid var(--coin)' }}>
            <img src={BADGE_ICONS.coins} className="icon-img" style={{ fontSize: 22 }} alt="" />
            <span style={{ fontFamily: 'Fredoka One', fontSize: 22, color: 'var(--b700)' }}>{coins.toLocaleString()} เหรียญ</span>
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setShopCategory(cat.id)}
              style={{
                padding: '10px 22px', border: 'none', borderRadius: 'var(--r-pill)', cursor: 'pointer',
                background: shopCategory === cat.id ? 'var(--b500)' : 'var(--fixed-white)',
                color: shopCategory === cat.id ? 'var(--fixed-white)' : 'var(--b700)',
                fontFamily: 'Fredoka One', fontSize: 15,
                boxShadow: shopCategory === cat.id ? `0 4px 14px ${C_30}` : 'var(--sh-card)',
                transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <span style={{ fontSize: 18 }}>{cat.emoji}</span>{cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {(ITEMS[shopCategory] ?? []).map(item => {
            const owned = inventoryData.some(i => i.shopItemId === item.id)
            const equipped = inventoryData.some(i => i.shopItemId === item.id && i.isEquipped)
            const canAfford = coins >= item.price
            return (
              <div
                key={item.id}
                style={{
                  background: owned ? 'linear-gradient(135deg, var(--g50), var(--g100))' : 'var(--fixed-white)',
                  borderRadius: 20, padding: '16px 10px', textAlign: 'center',
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
                    ? <img src={ITEM_ICONS[item.id]} alt={item.nameTh} style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto' }} />
                    : item.emoji}
                </div>

                <div style={{ fontFamily: 'Fredoka One', fontSize: 14, color: 'var(--n900)', marginBottom: 2 }}>{item.nameTh}</div>
                <div style={{ fontSize: 10, color: 'var(--n300)', marginBottom: 12 }}>{item.name}</div>

                {owned ? (
                  <button
                    type="button"
                    onClick={() => onEquip(item.id)}
                    style={{ width: '100%', padding: '8px', border: `1.5px solid ${equipped ? 'var(--g600)' : 'var(--n200)'}`, borderRadius: 'var(--r-sm)', background: equipped ? 'var(--g100)' : 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 13, color: equipped ? 'var(--g700)' : 'var(--n500)', cursor: 'pointer' }}>
                    {equipped ? '✓ ถอดออก' : '🎀 สวมใส่'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuyClick(item.id, item.price)}
                    disabled={!canAfford}
                    style={{
                      width: '100%', padding: '8px', border: 'none', borderRadius: 'var(--r-sm)', cursor: canAfford ? 'pointer' : 'not-allowed',
                      background: canAfford ? 'linear-gradient(135deg, var(--coin), var(--exp))' : 'var(--n100)',
                      color: canAfford ? 'var(--b700)' : 'var(--n300)',
                      fontFamily: 'Fredoka One', fontSize: 13,
                      boxShadow: canAfford ? 'var(--sh-coin)' : 'none',
                    }}>
                    <img src={BADGE_ICONS.coins} className="icon-img" alt="" /> {item.price.toLocaleString()}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
    </div>
  )
}