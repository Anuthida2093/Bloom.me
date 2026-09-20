import type { NotificationItem } from '../../hooks/useNotifications'
import { BADGE_ICONS } from '../../config/iconAssets'

interface NotificationPanelProps {
  items: NotificationItem[]
  onOpenQuest: (tab: NonNullable<NotificationItem['questTab']>) => void
  onOpenPost: (postId: string) => void
  glass?: boolean
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
export default function NotificationPanel({ items, onOpenQuest, onOpenPost, glass = false }: NotificationPanelProps) {
  return (
    <div className={`${glass ? 'card glass' : 'card'} no-scroll notification-panel`} style={{ width: 300, maxWidth: '80vw', flexShrink: 0, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
      <div style={{ fontFamily: 'Fredoka One', fontSize: 22, color: 'var(--text)', padding: '2px 6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={BADGE_ICONS.notification} className="icon-img--lg" alt="" />
        แจ้งเตือน
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>ยังไม่มีแจ้งเตือน</div>
      ) : (
        items.map((n) => {
          const clickable = !!n.questTab || !!n.postId
          const handleClick = () => {
            if (n.questTab) onOpenQuest(n.questTab)
            else if (n.postId) onOpenPost(n.postId)
          }
          return (
            <div
              key={n.id}
              onClick={clickable ? handleClick : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 1, background: 'transparent',
                padding: '1px 1px', borderRadius: 12,
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background .15s ease',
              }}
              onMouseEnter={clickable ? (e) => { e.currentTarget.style.background = 'var(--n50)' } : undefined}
              onMouseLeave={clickable ? (e) => { e.currentTarget.style.background = 'transparent' } : undefined}
            >
              {n.iconIsImage ? (
                <img src={n.icon} alt="" style={{ width: 80, height: 70, objectFit: 'contain', flexShrink: 0, marginTop: 1 }} />
              ) : (
                <span style={{ fontSize: 55, lineHeight: 1, flexShrink: 1, marginTop: 1 }}>{n.icon}</span>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.5 }}>{n.text}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{timeAgo(n.createdAt)}</div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
