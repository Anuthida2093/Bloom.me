import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

/*============================================================================*\
  Button — [ไฟล์ใหม่] ปุ่มมาตรฐานของทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  เดิมปุ่มถูกเขียนใหม่ทุกไฟล์ด้วย inline style ซึ่งทำให้:
    • ไม่มี :hover / :active / :focus-visible (inline style ทำไม่ได้)
    • ไม่รู้จักโหมดมืด
    • ขนาด ความมน และเงา ไม่ตรงกันเลยสักปุ่ม
  ปุ่มนี้แก้ทั้งสามข้อในตัวเดียว และรองรับคีย์บอร์ดครบตั้งแต่ต้น

  variant:
    primary — การกระทำหลักของหน้า (1 ปุ่มต่อหน้าเท่านั้น)
    soft    — การกระทำรอง
    ghost   — ยกเลิก / ปิด / ข้าม
    rune    — ปุ่มในฉากเวทมนตร์ (ขอบเรืองแสง)
    danger  — การกระทำที่ย้อนกลับไม่ได้
\*============================================================================*/

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'rune' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** ขยายเต็มความกว้างของพาเรนต์ */
  block?: boolean
  /** ไอคอนนำหน้าข้อความ — ควรเป็น <img>/<svg> ไม่ใช่ emoji เมื่อขึ้นโปรดักชัน */
  leading?: ReactNode
}

export default function Button({
  children, variant = 'soft', size = 'md', block = false, leading,
  className = '', type = 'button', ...rest
}: ButtonProps) {
  const classes = [
    'ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`,
    block ? 'ui-btn--block' : '', className,
  ].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {leading && <span className="ui-btn__leading">{leading}</span>}
      {children}
    </button>
  )
}