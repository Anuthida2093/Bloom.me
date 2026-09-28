import Overlay from './Overlay'
import '../leaderboard/leaderboardRow.css'
import './ui.css'

/*============================================================================*\
  GameAlert — [ไฟล์ใหม่] แทนที่ window.alert() ของเบราว์เซอร์
  ────────────────────────────────────────────────────────────────────────────
  window.alert()/confirm() คือกล่องระบบของเบราว์เซอร์ หน้าตาไม่เข้ากับธีมเกมเลย
  และบล็อก main thread ทั้งหน้าจอจนกว่าจะกดตกลง — ตัวนี้ใช้ Overlay ของระบบเดิม
  (focus trap, ESC ปิดได้)
  [แก้ตามที่ระบุ] หน้าตาเป็นการ์ดแบบกระดานจัดอันดับ: พื้นเขียวไล่เฉด ขอบทอง ป้ายหัวการ์ด
  ปุ่ม "ตกลง" แบบปุ่มป้ายกระดาน ตัวหนังสือดำ (สว่าง) / ขาว (มืด)
\*============================================================================*/

interface GameAlertProps {
  open: boolean
  message: string
  icon?: string
  /** รูปไอคอน (เช่น รูปเควส) — ใส่แล้วแสดงแทนอีโมจิ `icon` */
  iconImg?: string
  /** ข้อความบนป้ายหัวการ์ด (ไม่ใส่ = "แจ้งเตือน") */
  title?: string
  onClose: () => void
}

export default function GameAlert({ open, message, icon = '✨', iconImg, title = 'แจ้งเตือน', onClose }: GameAlertProps) {
  return (
    <Overlay open={open} onClose={onClose} labelledBy="game-alert-message">
      <div className="ui-game-alert lb-card">
        <div className="lb-banner ui-game-alert__banner">{title}</div>
        {iconImg
          ? <img src={iconImg} alt="" className="ui-game-alert__icon-img" />
          : <div className="ui-game-alert__icon" aria-hidden="true">{icon}</div>}
        <p id="game-alert-message" className="ui-game-alert__message">{message}</p>
        <button type="button" className="lb-btn lb-btn--wide" onClick={onClose}>ตกลง</button>
      </div>
    </Overlay>
  )
}
