import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MapDef } from '../../../../types.journey'
import { OPEN_SHOP_ITEM_EVENT, type StepChestReward } from '../../../../config/stepChest'
import { BADGE_ICONS, ITEM_ICONS } from '../../../../config/iconAssets'
import { DECORATION_ITEM_META } from '../../../../config/decorationItems'
import { exchangeItemName } from '../../../../config/exchangeItems'
import { useAppContext } from '../../../../context/AppContext'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import { playSfx } from '../../../../utils/audioPlayer'
import { withLivePath } from './journeyPathMath'
import './StepChest.css'

/*============================================================================*\
  StepChest — หีบสมบัติ 1 ใบที่เส้นชัยของทริปวันนี้ (แทนกล่อง/จุดสำรวจรายจุดเดิมทั้งหมด)
  ────────────────────────────────────────────────────────────────────────────
  StepChestMarker: หีบบนแผนที่ (เหนือตัวละครที่ปลายทาง) แตะ → เปิดป็อปอัปทันที (ระหว่างรอเซิร์ฟเวอร์ = หีบสั่น)
  StepChestPopup: ผลจากเซิร์ฟเวอร์ (progression.api → openStepChest) — หน้าเว็บไม่สุ่มเอง
    - การ์ดแลกซื้อ: การ์ดสี่เหลี่ยมจัตุรัสด้านบน + แสงรัศมีด้านหลัง ไม่มีกรอบ ปุ่ม [แลกซื้อ] [กลับ] เท่านั้น
    - รางวัลอื่น: กระดาษม้วนค่อยๆ คลี่ลงมา
\*============================================================================*/

export function StepChestMarker({ mapDef, onOpen, disabled }: { mapDef: MapDef; onOpen: () => void; disabled?: boolean }) {
  const { x, y } = withLivePath(mapDef).exitPct
  return (
    <button
      type="button"
      className="step-chest-marker"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onOpen}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={disabled}
      aria-label="เปิดหีบสมบัติ"
    >
      <span aria-hidden="true">🎁</span>
    </button>
  )
}

const SCROLL_VIEW: Record<Exclude<StepChestReward['kind'], 'EXCHANGE_CARD'>, { icon: string; title: (n: number) => string; text: string }> = {
  BONUS_COINS: { icon: BADGE_ICONS.coins, title: (n) => `เหรียญโบนัส +${n}`, text: 'เข้ากระเป๋าเรียบร้อยแล้ว' },
  WATER_DROPS: { icon: BADGE_ICONS.water, title: (n) => `หยดน้ำ +${n}`, text: 'เอาไปรดน้ำต้นไม้ที่หน้าแรกได้เลย' },
  BONUS_EXP: { icon: BADGE_ICONS.exp, title: (n) => `EXP โบนัส +${n}`, text: 'ต้นไม้ของคุณเติบโตขึ้นอีกนิดแล้ว' },
}

interface StepChestPopupProps {
  /** null = กำลังรอเซิร์ฟเวอร์ */
  reward: StepChestReward | null
  error: string | null
  onClose: () => void
  onRetry: () => void
}

export function StepChestPopup({ reward, error, onClose, onRetry }: StepChestPopupProps) {
  const { settings } = useAppContext()
  useEscapeKey(() => { if (reward || error) onClose() })

  useEffect(() => {
    if (!reward) return
    const sfx = { volume: settings.sfxVolume, enabled: settings.soundEnabled }
    playSfx(reward.kind === 'EXCHANGE_CARD' ? 'REWARD_CLAIM' : 'PAPER_CRUMPLE', sfx)
  }, [reward, settings.sfxVolume, settings.soundEnabled])

  let body: React.ReactNode
  if (error) {
    body = (
      <div className="step-chest-error lb-card">
        <p>{error}</p>
        <div className="step-chest-card__actions">
          <button type="button" className="step-chest-btn" onClick={onRetry}>ลองอีกครั้ง</button>
          <button type="button" className="step-chest-btn step-chest-btn--ghost" onClick={onClose}>กลับ</button>
        </div>
      </div>
    )
  } else if (!reward) {
    body = <div className="step-chest-loading" role="status" aria-label="กำลังเปิดหีบ"><span aria-hidden="true">🎁</span></div>
  } else if (reward.kind === 'EXCHANGE_CARD') {
    const code = reward.cardItemCode ?? ''
    const img = ITEM_ICONS[code]
    body = (
      <div className="step-chest-card-stage">
        <div className="step-chest-burst" aria-hidden="true" />
        <div className="step-chest-card" aria-label={code ? `การ์ดแลกซื้อ${exchangeItemName(code)}` : 'การ์ดแลกซื้อไอเทม'}>
          {img
            ? <img src={img} alt="" className="step-chest-card__img" />
            : <span className="step-chest-card__emoji" aria-hidden="true">{DECORATION_ITEM_META[code]?.emoji ?? '🎴'}</span>}
          <span className="step-chest-card__label">การ์ดแลกซื้อไอเทม</span>
        </div>
        <div className="step-chest-card__actions">
          <button
            type="button"
            className="step-chest-btn"
            onClick={() => { onClose(); if (code) window.dispatchEvent(new CustomEvent(OPEN_SHOP_ITEM_EVENT, { detail: code })) }}
          >
            แลกซื้อ
          </button>
          <button type="button" className="step-chest-btn step-chest-btn--ghost" onClick={onClose}>กลับ</button>
        </div>
      </div>
    )
  } else {
    const view = SCROLL_VIEW[reward.kind]
    body = (
      <div className="chest-scroll">
        <div className="chest-scroll__rod" aria-hidden="true" />
        <div className="chest-scroll__paper">
          <div className="chest-scroll__inner">
            <div className="chest-scroll__visual"><img src={view.icon} alt="" /></div>
            <h2 className="chest-scroll__title">{view.title(reward.amount)}</h2>
            <p className="chest-scroll__text">{view.text}</p>
            <button type="button" className="chest-scroll__btn" onClick={onClose}>รับรางวัล</button>
          </div>
        </div>
        <div className="chest-scroll__rod" aria-hidden="true" />
      </div>
    )
  }

  return createPortal(
    <div className="step-chest-overlay" role="dialog" aria-modal="true" aria-label="หีบสมบัติ">
      {body}
    </div>,
    document.body,
  )
}
