import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BADGE_ICONS, ITEM_ICONS } from '../../config/iconAssets'
import { EXCHANGE_REQUIREMENTS, exchangeCardLabel, tierLabel } from '../../config/exchangeItems'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './ShopItemDialog.css'

/*============================================================================*\
  ShopItemDialog — กดไอเทมในร้านแล้วขึ้นป็อปอัพกระจกฝ้า (glassmorphism) แยกจากหน้าร้านชัดเจน
  ────────────────────────────────────────────────────────────────────────────
  ของธรรมดา: รูปใหญ่ + ชื่อ + ราคา → [ยกเลิก] [ซื้อ]
  ของพิเศษ/หายาก: "แลกซื้อ<ชื่อ>" + เหรียญ + การ์ดแลกซื้อ (Item.png) มี/ต้องใช้ → [ยกเลิก] [แลกซื้อ]
    - การ์ดไม่พอ → หน้าแจ้ง "จำนวนการ์ดแลกซื้อไม่เพียงพอ" Item.png กลางจอ + บอกว่าขาดอีกกี่ใบ
    - แลกสำเร็จ → ไอเทมลอยขึ้นมา แล้วข้อความ "ยินดีด้วย คุณได้รับของพิเศษ/ของหายาก …" ปุ่มตกลงด้านล่าง
\*============================================================================*/

export interface ShopDialogItem {
  id: string
  emoji: string
  nameTh: string
  name: string
  price: number
}

type Stage = 'detail' | 'need-tokens' | 'celebrate'

interface ShopItemDialogProps {
  item: ShopDialogItem
  coins: number
  tokensOwned: number
  /** คืนข้อความ error หรือ null ถ้าสำเร็จ */
  onBuy: (item: ShopDialogItem) => Promise<string | null>
  /** คืน { error, missing } — missing = จำนวนการ์ดที่ยังขาด (เซิร์ฟเวอร์ตัดสิน) */
  onExchange: (item: ShopDialogItem) => Promise<{ error: string | null; missing?: number }>
  onClose: () => void
}

function ItemVisual({ item, className }: { item: ShopDialogItem; className: string }) {
  const img = ITEM_ICONS[item.id]
  return img
    ? <img src={img} alt={item.nameTh} className={className} />
    : <span className={`${className} shop-dialog__emoji`} aria-hidden="true">{item.emoji}</span>
}

export default function ShopItemDialog({ item, coins, tokensOwned, onBuy, onExchange, onClose }: ShopItemDialogProps) {
  const req = EXCHANGE_REQUIREMENTS[item.id]
  const [stage, setStage] = useState<Stage>('detail')
  const [missing, setMissing] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealText, setRevealText] = useState(false)
  useEscapeKey(onClose)

  // ฉากยินดีด้วย: ไอเทมลอยขึ้นก่อน แล้วค่อยขึ้นข้อความ + ปุ่มตกลง
  useEffect(() => {
    if (stage !== 'celebrate') return
    const id = window.setTimeout(() => setRevealText(true), 1200)
    return () => window.clearTimeout(id)
  }, [stage])

  const handlePrimary = async () => {
    setError(null)
    if (req) {
      if (tokensOwned < req.tokens) { setMissing(req.tokens - tokensOwned); setStage('need-tokens'); return }
      setBusy(true)
      const res = await onExchange(item)
      setBusy(false)
      if (res.missing) { setMissing(res.missing); setStage('need-tokens'); return }
      if (res.error) { setError(res.error); return }
      setStage('celebrate')
      return
    }
    setBusy(true)
    const err = await onBuy(item)
    setBusy(false)
    if (err) { setError(err); return }
    onClose()
  }

  const tokenLabel = req ? exchangeCardLabel(item.id) : ''

  return createPortal(
    <div className="shop-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-dialog-title" onClick={stage === 'celebrate' ? undefined : onClose}>
      <div className={`shop-dialog__card shop-dialog__card--${stage}`} onClick={(e) => e.stopPropagation()}>
        {stage === 'detail' && (
          <>
            {req && <span className={`shop-dialog__tier shop-dialog__tier--${req.tier.toLowerCase()}`}>{tierLabel(req.tier)}</span>}
            <ItemVisual item={item} className="shop-dialog__hero" />
            <h2 id="shop-dialog-title" className="shop-dialog__title">{req ? `แลกซื้อ${item.nameTh}` : item.nameTh}</h2>
            <p className="shop-dialog__sub">{item.name}</p>

            <div className="shop-dialog__costs">
              <div className="shop-dialog__cost">
                <img src={BADGE_ICONS.coins} alt="" />
                <span>{item.price.toLocaleString()} เหรียญ</span>
                {coins < item.price && <em className="shop-dialog__lack">มี {coins.toLocaleString()}</em>}
              </div>
              {req && (
                <div className="shop-dialog__cost shop-dialog__cost--token">
                  <img src={BADGE_ICONS.item} alt="" />
                  <span>{tokenLabel} × {req.tokens}</span>
                  <em className={tokensOwned >= req.tokens ? 'shop-dialog__have' : 'shop-dialog__lack'}>มี {tokensOwned}/{req.tokens}</em>
                </div>
              )}
            </div>
            {req && tokensOwned < req.tokens && (
              <p className="shop-dialog__hint">การ์ดแลกซื้อเป็นรางวัลสุ่มจากการทำเควสประจำวันอย่างสม่ำเสมอ</p>
            )}
            {error && <p className="shop-dialog__error" role="alert">{error}</p>}

            <div className="shop-dialog__actions">
              <button type="button" className="soft-btn soft-btn--ghost" onClick={onClose}>ยกเลิก</button>
              <button type="button" className="soft-btn soft-btn--gold" onClick={() => { void handlePrimary() }} disabled={busy}>
                {busy ? 'กำลังดำเนินการ…' : req ? 'แลกซื้อ' : 'ซื้อ'}
              </button>
            </div>
          </>
        )}

        {stage === 'need-tokens' && (
          <>
            <img src={BADGE_ICONS.item} alt="" className="shop-dialog__token-hero" />
            <h2 id="shop-dialog-title" className="shop-dialog__title">จำนวนการ์ดแลกซื้อไม่เพียงพอ</h2>
            <p className="shop-dialog__body">ต้องทำภารกิจเพื่อรับการ์ดแลกซื้อ</p>
            <p className="shop-dialog__need">คุณต้องหา<b>{tokenLabel}</b> อีก <b>{missing}</b> ใบ</p>
            <p className="shop-dialog__hint">ทำเควสประจำวันต่อเนื่อง แล้วลุ้นรับการ์ดแลกซื้อ</p>
            <div className="shop-dialog__actions">
              <button type="button" className="soft-btn soft-btn--gold" onClick={onClose}>ตกลง</button>
            </div>
          </>
        )}

        {stage === 'celebrate' && (
          <>
            <div className="shop-dialog__rise" aria-hidden="true">
              <span className="shop-dialog__glow" />
              <ItemVisual item={item} className="shop-dialog__hero shop-dialog__hero--rise" />
            </div>
            <div className={`shop-dialog__congrats${revealText ? ' shop-dialog__congrats--show' : ''}`}>
              <h2 id="shop-dialog-title" className="shop-dialog__title">ยินดีด้วย!</h2>
              <p className="shop-dialog__body">คุณได้รับ{req ? tierLabel(req.tier) : 'ไอเทม'} <b>{item.nameTh}</b></p>
              <div className="shop-dialog__actions">
                <button type="button" className="soft-btn soft-btn--gold" onClick={onClose} disabled={!revealText}>ตกลง</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
