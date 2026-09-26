import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { EASE_OUT_SOFT_CSS } from '../../config/motion'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'

interface WelcomeMessageCyclerProps {
  /** ประโยคที่จะวนแสดง — เป็น ReactNode ได้ (เช่น ข้อความ + รูปไอคอนแทรกท้ายประโยค) */
  messages: ReactNode[]
  /** เวลาจางเข้า/จางออก (ms) */
  fadeMs?: number
  /** เวลาค้างข้อความไว้ให้อ่านหลังจางเข้าเสร็จ (ms) */
  holdMs?: number
  style?: CSSProperties
}

/**
 * WelcomeMessageCycler — แสดงข้อความทีละประโยค: จางเข้า → ค้างไว้ → จางออก → ประโยคถัดไป (วนลูป)
 * ────────────────────────────────────────────────────────────────────────────
 * ต่างจาก useTypewriter (พิมพ์ทีละตัวอักษร) — ตัวนี้สลับ "ทั้งประโยค" ด้วย CSS opacity transition
 * ความสูงกล่องจองไว้คงที่ (minHeight) เพื่อไม่ให้ปุ่มด้านล่างกระตุกขึ้นลงตามความยาวประโยค
 */
export default function WelcomeMessageCycler({
  messages,
  fadeMs = 600,
  holdMs = 2800,
  style,
}: WelcomeMessageCyclerProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (messages.length === 0) return
    // จางเข้าหลังหน่วงสั้นๆ (ให้เบราว์เซอร์ render opacity 0 ก่อน transition จึงจะทำงาน)
    // ใช้ setTimeout ไม่ใช่ requestAnimationFrame — rAF ไม่ทำงานเลยตอนแท็บถูกซ่อน ข้อความจะค้างที่ opacity 0
    const fadeInAt = setTimeout(() => setVisible(true), 30)
    if (messages.length === 1) return () => clearTimeout(fadeInAt)

    const fadeOutAt = setTimeout(() => setVisible(false), fadeMs + holdMs)
    const nextAt = setTimeout(() => setIndex((i) => (i + 1) % messages.length), fadeMs * 2 + holdMs)
    return () => {
      clearTimeout(fadeInAt)
      clearTimeout(fadeOutAt)
      clearTimeout(nextAt)
    }
  }, [index, messages.length, fadeMs, holdMs])

  return (
    <p
      aria-live="off"
      style={{
        // ตั้ง 20px ตรงนี้เลย ไม่พึ่ง font-size ที่สืบทอดจากกล่องแม่ (หน้า Welcome ไม่มีการ์ดครอบแล้ว)
        fontSize: 20,
        // จองความสูงไว้ 3 บรรทัด — ประโยคยาวสุด (โดยเฉพาะภาษาอังกฤษบนจอแคบ) ไม่ดันปุ่มด้านล่างให้กระตุก
        minHeight: '4.8em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        lineHeight: 1.6,
        ...style,
      }}
    >
      <span
        style={{
          opacity: visible ? 1 : 0,
          transform: visible || reducedMotion ? 'none' : 'translateY(4px)',
          transition: reducedMotion ? 'none' : `opacity ${fadeMs}ms ${EASE_OUT_SOFT_CSS}, transform ${fadeMs}ms ${EASE_OUT_SOFT_CSS}`,
        }}
      >
        {messages[index]}
      </span>
    </p>
  )
}
