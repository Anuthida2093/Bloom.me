import type { ReactNode, MouseEvent } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Z_INDEX } from '../../config/zIndex'

/**
 * PanelModal — เหมือน Overlay ใน SettingsModal.jsx แต่กว้างกว่า (maxWidth 560)
 * เพราะใช้ห่อ content แบบ panel (QuestSection/ShopSection) ที่ออกแบบมาให้มีพื้นที่
 * มากกว่า modal ปกติทั่วไป — ไม่ไปแก้ Overlay เดิมเพราะใช้ร่วมกับ modal อื่นอยู่
 */
interface PanelModalProps {
  children: ReactNode
  onClose?: () => void
}

export default function PanelModal({ children, onClose = () => {} }: PanelModalProps) {
  // [ข้อกำหนดข้อ 4] ล็อก scroll ของ body ตอน modal เปิด — แก้ต้นเหตุอาการต้นไม้ "ขยาย"
  // ตอนเปิดคลังไอเทม/เควส/ร้านค้า (ดูรายละเอียดใน useLockBodyScroll.ts)
  useLockBodyScroll()
  // [a11y] กด ESC ปิดได้
  useEscapeKey(onClose)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg-modal)', backdropFilter: 'blur(6px)',
        zIndex: Z_INDEX.fullScreenSection, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px', overflowY: 'auto',
      }}
      onClick={(e: MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-card)', borderRadius: 28, padding: '20px 18px', width: '100%',
          maxWidth: 560, boxShadow: 'var(--sh-modal)', border: '1px solid var(--border-mid)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          title="ปิด"
          style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 99,
            border: '1.5px solid var(--border-mid)', background: 'var(--bg-card)', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
          }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}