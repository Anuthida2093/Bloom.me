import { createPortal } from 'react-dom'
import { OWL_AVATAR_ICON } from '../../../../config/iconAssets'
import '../../../shop/ShopItemDialog.css'
import './RestReminder.css'

/*============================================================================*\
  RestReminderPopup — ป็อปอัปแจ้งเตือนการพักผ่อน (เปิด-ปิดได้) ใช้ร่วมกันระหว่าง
  "ผู้พิทักษ์การพักผ่อน" (ตัวจับเวลาพัก) และ "หยั่งรากลึก" (ครบช่วงจดจ่อ / ครบช่วงพัก)
    kind 'rest'  = ครบเวลาอ่าน/จดจ่อ → ได้เวลาพัก N นาที
    kind 'back'  = พักครบแล้ว → กลับมาเรียนต่อได้
\*============================================================================*/

export type RestReminderKind = 'rest' | 'back'

interface RestReminderPopupProps {
  kind: RestReminderKind
  restMinutes: number
  onClose: () => void
}

export default function RestReminderPopup({ kind, restMinutes, onClose }: RestReminderPopupProps) {
  return createPortal(
    <div className="shop-dialog" role="alertdialog" aria-modal="true" aria-labelledby="rest-reminder-title" style={{ zIndex: 3000 }} onClick={onClose}>
      <div className="shop-dialog__card" onClick={(e) => e.stopPropagation()}>
        <div className={`rest-owl${kind === 'back' ? ' rest-owl--awake' : ''}`} aria-hidden="true">
          <img src={OWL_AVATAR_ICON} alt="" className="rest-owl__img" />
          {kind === 'rest' && <span className="rest-owl__zzz">Zzz</span>}
        </div>
        <h2 id="rest-reminder-title" className="shop-dialog__title">
          {kind === 'rest' ? `ได้เวลาพัก ${restMinutes} นาทีแล้ว` : 'พักครบแล้ว!'}
        </h2>
        <p className="shop-dialog__body">
          {kind === 'rest'
            ? 'วางหนังสือ หลับตา ยืดเส้น หรือเดินเล่น — ห้ามเล่นมือถือนะ สมองกำลังจัดเก็บสิ่งที่เรียนมา'
            : 'สมองได้พักฟื้นแล้ว พร้อมกลับมาจดจ่อรอบต่อไป'}
        </p>
        <div className="shop-dialog__actions">
          <button type="button" className="soft-btn soft-btn--gold" onClick={onClose} autoFocus>
            {kind === 'rest' ? 'เริ่มพัก' : 'ตกลง'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
