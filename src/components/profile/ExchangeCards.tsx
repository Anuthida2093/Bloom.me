import { BADGE_ICONS, ITEM_ICONS } from '../../config/iconAssets'
import { DECORATION_ITEM_META } from '../../config/decorationItems'
import { EXCHANGE_REQUIREMENTS, exchangeCardLabel, exchangeItemName, tierLabel } from '../../config/exchangeItems'
import './ProfileTokens.css'

/*============================================================================*\
  ExchangeCards — "การ์ดแลกซื้อไอเทม" ในคลังไอเทม (เก็บเป็นการ์ด ไม่ใช่ตัวไอเทมตรงๆ)
  ────────────────────────────────────────────────────────────────────────────
  หน้าตาการ์ดสะสม: กรอบทอง + รูปไอเทมปลายทาง + "การ์ดแลกซื้อ<ชื่อ>" + จำนวนใบ (ตัวเลข)
  ปุ่ม [แลกซื้อ] ใต้การ์ด → ไปป็อปอัปสินค้าในร้านค้าทันที
\*============================================================================*/

function ItemArt({ code, className }: { code: string; className: string }) {
  const img = ITEM_ICONS[code]
  return img
    ? <img src={img} alt="" className={className} />
    : <span className={`${className} exchange-card__emoji`} aria-hidden="true">{DECORATION_ITEM_META[code]?.emoji ?? '🎁'}</span>
}

function CardFace({ code, count }: { code: string; count: number }) {
  const req = EXCHANGE_REQUIREMENTS[code]
  return (
    <span className={`exchange-card exchange-card--${(req?.tier ?? 'RARE').toLowerCase()}`}>
      {/* [แก้ตามที่ระบุ] จำนวนที่มีเป็นตัวเลขตรงๆ (ได้ 1 = "1", ได้ 7 = "7") ไม่ใช่ที่มี/ที่ต้องใช้ */}
      <span className="exchange-card__count">{count}</span>
      <img src={BADGE_ICONS.item} alt="" className="exchange-card__seal" />
      <span className="exchange-card__art"><ItemArt code={code} className="exchange-card__art-img" /></span>
      <span className="exchange-card__name">{exchangeCardLabel(code)}</span>
      {req && <span className="exchange-card__tier">{tierLabel(req.tier)}</span>}
    </span>
  )
}

interface ExchangeCardsProps {
  cards: [string, number][]
  /** ไปหน้าร้านค้าแล้วเปิดป็อปอัปสินค้านั้นทันที */
  onOpenShopItem?: (itemCode: string) => void
}

/** การ์ดแลกซื้อในคลังไอเทม (แท็บ "ทั้งหมด"/"การ์ดแลกซื้อไอเทม") — ยังไม่มีการ์ด = ไม่แสดงอะไร
 *  แต่ละใบ: รูปไอเทม · "การ์ดแลกซื้อ<ชื่อ>" · จำนวนที่มี · ปุ่ม [แลกซื้อ] → ป็อปอัปสินค้าในร้าน */
export default function ExchangeCards({ cards, onOpenShopItem }: ExchangeCardsProps) {
  if (cards.length === 0) return null
  return (
    <div className="profile-tokens">
      <div className="profile-tokens__title">🎴 การ์ดแลกซื้อไอเทม</div>
      <div className="profile-tokens__grid">
        {cards.map(([code, count]) => (
          <div key={code} className="profile-tokens__cell">
            <CardFace code={code} count={count} />
            <button
              type="button"
              className="profile-tokens__exchange"
              onClick={() => onOpenShopItem?.(code)}
              aria-label={`แลกซื้อ${exchangeItemName(code)} (มีการ์ด ${count} ใบ)`}
            >
              แลกซื้อ
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
