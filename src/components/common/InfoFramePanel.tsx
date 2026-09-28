import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BADGE_ICONS } from '../../config/iconAssets'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useLanguage } from '../../context/LanguageContext'
import '../leaderboard/leaderboardRow.css'
import '../tree/TreeOfLife.css'

interface InfoFramePanelProps {
  /** ข้อความบนป้ายม้วนกระดาษที่ลอยบนขอบกรอบ เช่น "🌳 ข้อมูลต้นไม้" */
  banner: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * InfoFramePanel — กรอบแผงข้อมูลในคอลัมน์ขวาของหน้า Home (ใช้ร่วม: ข้อมูลต้นไม้, แจ้งเตือน)
 * ────────────────────────────────────────────────────────────────────────────
 * หน้าตาแบบกระดานจัดอันดับ (.lb-frame): ขอบทอง + ป้ายหัวข้อ + แผ่นเนื้อหาทึบ
 * สว่าง = เขียวอ่อน/ตัวหนังสือดำ, มืด = เขียวเข้ม/ตัวหนังสือขาวทั้งหมด (ดู TreeOfLife.css)
 * จอกว้าง: อยู่ในคอลัมน์ขวา / จอเล็ก ≤768px: เต็มจอแบบหน้าตั้งค่า (portal ไป body ใต้แถบเมนูล่าง)
 */
export default function InfoFramePanel({ banner, onClose, children, className = '' }: InfoFramePanelProps) {
  const fullscreen = useMediaQuery('(max-width: 768px)')
  const { t } = useLanguage()

  const panel = (
    <div className={`tree-of-life__tooltip tree-info-panel lb-frame ${className}`} onClick={(e) => e.stopPropagation()}>
      <div className="lb-frame__banner">{banner}</div>
      <button className="tree-of-life__tooltip-close" title={t('common.close')} aria-label={t('common.close')} onClick={onClose}>
        <img src={BADGE_ICONS.close} className="icon-img" alt="" />
      </button>
      <div className="lb-frame__sheet tree-of-life__tooltip-sheet">{children}</div>
    </div>
  )

  return fullscreen
    ? createPortal(<div className="tree-of-life__tooltip-screen" onClick={(e) => e.stopPropagation()}>{panel}</div>, document.body)
    : panel
}
