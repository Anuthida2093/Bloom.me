import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { BADGE_ICONS } from '../../config/iconAssets'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './RewardBurst.css'

/*============================================================================*\
  RewardBurst — หน้าจอ "ได้รับรางวัล" แบบไม่มีกรอบ/การ์ด (ใช้ร่วมกันทุกจุดที่ได้รางวัล)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ] แสดงแค่รูปรางวัล (ใหญ่) + ข้อความจำนวน (ตัวใหญ่) มีแสงจ้าแผ่รัศมีด้านหลัง
  ไม่มีป็อปอัป/กรอบ/ขอบ · ปุ่ม "ตกลง" กึ่งกลางด้านล่าง · กากบาทมุมขวาบน (ไม่มีกรอบเช่นกัน)
\*============================================================================*/

export interface RewardBurstItem {
  key: string
  /** path รูป หรือ อีโมจิ (ข้อความสั้น) */
  image: string
  /** ข้อความจำนวน เช่น "+20" / "×1" */
  amount: string
  /** ชื่อสั้นๆ อ่านออกเสียง (screen reader) */
  label: string
}

const isImagePath = (s: string) => s.includes('/') || s.includes('.')

export default function RewardBurst({ items, onClose, zIndex = 3000, note }: {
  items: RewardBurstItem[]
  onClose: () => void
  zIndex?: number
  /** บรรทัดเล็กใต้รางวัล (ไม่ใส่ = ไม่มี) */
  note?: ReactNode
}) {
  useEscapeKey(onClose)
  return createPortal(
    <div className="reward-burst" role="dialog" aria-modal="true" aria-label="ได้รับรางวัล" style={{ zIndex }}>
      <button type="button" className="reward-burst__x" onClick={onClose} aria-label="ปิด">
        <img src={BADGE_ICONS.close} alt="" />
      </button>
      <div className="reward-burst__stage">
        <div className="reward-burst__rays" aria-hidden="true" />
        <div className="reward-burst__glow" aria-hidden="true" />
        <div className={`reward-burst__items${items.length > 1 ? ' reward-burst__items--multi' : ''}`}>
          {items.map((it, i) => (
            <div key={it.key} className="reward-burst__item" style={{ animationDelay: `${0.12 + i * 0.12}s` }} aria-label={`${it.label} ${it.amount}`}>
              {isImagePath(it.image)
                ? <img src={it.image} alt="" className="reward-burst__img" />
                : <span className="reward-burst__emoji" aria-hidden="true">{it.image}</span>}
              <span className="reward-burst__amount">{it.amount}</span>
            </div>
          ))}
        </div>
        {note && <p className="reward-burst__note">{note}</p>}
      </div>
      <button type="button" className="reward-burst__ok" onClick={onClose}>ตกลง</button>
    </div>,
    document.body,
  )
}
