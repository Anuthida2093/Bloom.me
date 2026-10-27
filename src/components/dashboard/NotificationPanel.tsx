import type { NotificationItem } from '../../hooks/useNotifications'
import { BADGE_ICONS } from '../../config/iconAssets'
import InfoFramePanel from '../common/InfoFramePanel'
import FadeInText from '../welcome/FadeInText'
import { useLanguage } from '../../context/LanguageContext'

interface NotificationPanelProps {
  items: NotificationItem[]
  onOpenQuest: (tab: NonNullable<NotificationItem['questTab']>, questCode?: string) => void
  onOpenPost: (postId: string) => void
  onClose: () => void
  /** กดเปิดรายการ → ทำเครื่องหมายว่าอ่านแล้ว */
  onRead: (id: string) => void
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ชม.ที่แล้ว`
  const days = Math.floor(hours / 24)
  return `${days} วันที่แล้ว`
}

/**
 * NotificationPanel — [ไฟล์ใหม่ตามที่ระบุ] popup แจ้งเตือนรวม เปิดจากปุ่ม 🔔 ใน
 * .right-action-buttons ของ Dashboard.tsx — ใช้ className แบบเดียวกับ TreeStatsPanel.tsx
 * (.card.glass ที่มีอยู่แล้ว) ให้วางเป็นแผงข้าง .right-action-buttons ได้พอดีโดยไม่ต้อง
 * เขียน positioning ใหม่ (ใช้ .dashboard__panel.dashboard__panel--right ครอบเหมือนกัน)
 */
export default function NotificationPanel({ items, onOpenQuest, onOpenPost, onClose, onRead }: NotificationPanelProps) {
  const { t } = useLanguage()
  // [แก้ตามที่ระบุ] หน้าตาเดียวกับแผงข้อมูลต้นไม้: กรอบแบบกระดานจัดอันดับ ฟอนต์หน้า Welcome
  // รายการค่อยๆ ขึ้นมาทีละแถว จอเล็กเต็มจอ (InfoFramePanel)
  return (
    <InfoFramePanel
      className="notification-panel"
      banner={<><img src={BADGE_ICONS.notification} className="icon-img" alt="" /> {t('home.notifications')}</>}
      onClose={onClose}
    >
      {items.length === 0 ? (
        <div className="notification-panel__empty">{t('notif.empty')}</div>
      ) : (
        <div className="tree-of-life__tooltip-rows">
          {items.map((n, i) => {
            const clickable = !!n.questTab || !!n.postId
            const handleClick = () => {
              onRead(n.id)
              if (n.questTab) onOpenQuest(n.questTab, n.questCode)
              else if (n.postId) onOpenPost(n.postId)
            }
            return (
              <FadeInText key={n.id} delayMs={Math.min(i, 8) * 90}>
                <div
                  className={`tree-of-life__tooltip-row notification-panel__item notification-panel__item--${n.read ? 'read' : 'unread'}${clickable ? ' notification-panel__item--clickable' : ''}`}
                  onClick={clickable ? handleClick : () => onRead(n.id)}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === 'Enter') handleClick() } : undefined}
                  aria-label={n.read ? undefined : 'ยังไม่อ่าน'}
                >
                  {n.iconIsImage ? (
                    <img src={n.icon} alt="" className="notification-panel__icon" />
                  ) : (
                    <span className="notification-panel__icon notification-panel__icon--emoji">{n.icon}</span>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="notification-panel__text">{n.text}</div>
                    <div className="notification-panel__time">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              </FadeInText>
            )
          })}
        </div>
      )}
    </InfoFramePanel>
  )
}
