import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { EASE_OUT_SOFT_CSS } from '../../config/motion'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

interface FadeInTextProps {
  children: ReactNode
  /** หน่วงก่อนเริ่มจางเข้า (ms) — ใช้เรียงข้อความให้ขึ้นทีละบรรทัด */
  delayMs?: number
  /** เวลาจางเข้า (ms) — ค่าเดียวกับ WelcomeMessageCycler */
  fadeMs?: number
  as?: 'div' | 'p' | 'span' | 'h2'
  className?: string
  style?: CSSProperties
}

/**
 * FadeInText — ข้อความ "ค่อยๆ ขึ้นมา" แบบรายละเอียดหน้า Welcome (WelcomeMessageCycler) แต่ขึ้น
 * ครั้งเดียวแล้วค้างไว้ ไม่วนสลับ: จางจากโปร่งใส + เลื่อนขึ้น 4px ด้วยจังหวะเดียวกันเป๊ะ
 * ผู้ใช้: ป็อบอัพเช็คอินอารมณ์ (MoodCheckIn.tsx), ป็อบอัพข้อมูลต้นไม้ (TreeOfLife.tsx)
 */
export default function FadeInText({ children, delayMs = 0, fadeMs = 600, as: Tag = 'div', className, style }: FadeInTextProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 30 + delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs])

  const shown = visible || reducedMotion
  return (
    <Tag
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(4px)',
        transition: reducedMotion ? 'none' : `opacity ${fadeMs}ms ${EASE_OUT_SOFT_CSS}, transform ${fadeMs}ms ${EASE_OUT_SOFT_CSS}`,
      }}
    >
      {children}
    </Tag>
  )
}
