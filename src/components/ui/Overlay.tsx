import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { backdropEnter, modalEnter } from '../../config/motion'
import './ui.css'

/*============================================================================*\
  Overlay — [ไฟล์ใหม่] พื้นหลังมืด + จัดกลาง + ล็อกสกอลล์ + ESC + focus trap
  ────────────────────────────────────────────────────────────────────────────
  เดิมโมดัลทุกตัวเขียนสี่อย่างนี้เองซ้ำๆ กันหมด และเกือบทุกตัวลืม focus trap
  (กด Tab แล้วโฟกัสหลุดไปอยู่หลังโมดัล ผู้ใช้คีย์บอร์ดจะหลงทางทันที)

  contain="screen" — ครอบทั้งหน้าจอ (โมดัลปกติ)
  contain="parent" — ครอบเฉพาะพาเรนต์ที่เป็น position:relative
                     (ใช้กับป๊อปอัพในกรอบเขียว ที่ห้ามทะลุออกนอกกรอบ)
\*============================================================================*/

interface OverlayProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** ปิดเมื่อคลิกพื้นหลัง — ปิดไว้สำหรับงานที่ห้ามออกกลางคัน เช่น แบบคัดกรอง */
  closeOnBackdrop?: boolean
  contain?: 'screen' | 'parent'
  zIndex?: number
  labelledBy?: string
  className?: string
}

export default function Overlay({
  open, onClose, children,
  closeOnBackdrop = true, contain = 'screen', zIndex, labelledBy, className = '',
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  // [แก้บั๊กร้ายแรง] Overlay mount ค้างตลอด (สลับแค่ prop `open`) เพื่อให้ framer-motion
  // เล่นแอนิเมชัน exit ได้ — ต้องส่ง `open` เข้า useLockBodyScroll ตรงๆ ไม่งั้น body จะถูก
  // ล็อก (position:fixed) ทันทีที่ component ไหนก็ตามที่ใช้ Overlay/GameAlert mount ขึ้นมา
  // แม้ตอนนั้น dialog จะยังไม่เปิดเลยก็ตาม (ดู useLockBodyScroll.ts สำหรับรายละเอียดเต็ม)
  useLockBodyScroll(open)
  useEscapeKey(onClose, open)

  // focus trap — วนโฟกัสอยู่ในโมดัลเท่านั้น และคืนโฟกัสให้ปุ่มเดิมเมื่อปิด
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="overlay"
          className={`ui-overlay ui-overlay--${contain} ${className}`}
          style={zIndex !== undefined ? { zIndex } : undefined}
          onClick={closeOnBackdrop ? onClose : undefined}
          {...backdropEnter}
        >
          <m.div
            ref={panelRef}
            className="ui-overlay__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            {...modalEnter}
          >
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}