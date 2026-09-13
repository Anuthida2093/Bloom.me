import Overlay from './Overlay'
import Surface from './Surface'
import Button from './Button'
import './ui.css'

/*============================================================================*\
  GameAlert — [ไฟล์ใหม่] แทนที่ window.alert() ของเบราว์เซอร์
  ────────────────────────────────────────────────────────────────────────────
  window.alert()/confirm() คือกล่องระบบของเบราว์เซอร์ หน้าตาไม่เข้ากับธีมเกมเลย
  และบล็อก main thread ทั้งหน้าจอจนกว่าจะกดตกลง — ตัวนี้ใช้ Overlay/Surface/Button
  ของระบบเดิม (ดู ui/Overlay.tsx, ui/Surface.tsx, ui/Button.tsx) จึงได้ทั้งดีไซน์
  ที่ตรงกับส่วนอื่นของแอปและ a11y (focus trap, ESC ปิดได้) มาโดยไม่ต้องเขียนใหม่
\*============================================================================*/

interface GameAlertProps {
  open: boolean
  message: string
  icon?: string
  onClose: () => void
}

export default function GameAlert({ open, message, icon = '✨', onClose }: GameAlertProps) {
  return (
    <Overlay open={open} onClose={onClose} labelledBy="game-alert-message">
      <Surface variant="chrome" radius="lg" pad="lg" className="ui-game-alert">
        <div className="ui-game-alert__icon" aria-hidden="true">{icon}</div>
        <p id="game-alert-message" className="ui-game-alert__message">{message}</p>
        <Button variant="primary" block onClick={onClose}>ตกลง</Button>
      </Surface>
    </Overlay>
  )
}
