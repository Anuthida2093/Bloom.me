import type { CSSProperties, ReactNode } from 'react'
import './ui.css'

/*============================================================================*\
  Surface — [ไฟล์ใหม่] พื้นผิวลอยมาตรฐานของทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  เดิมแต่ละไฟล์เขียนพื้นผิวของตัวเอง: บางที่ใช้คลาส .card, บางที่ .glass,
  บางที่เขียน background/backdrop-filter/border เป็น inline style สดๆ
  ผลคือความโปร่ง เงา และความมนของขอบ ไม่ตรงกันสักหน้า

  variant:
    chrome  — โลก UI สว่าง (NavBar, ร้านค้า, ตั้งค่า, leaderboard)
    glass   — chrome แบบโปร่งลอยเหนือพื้นหลัง (แผงลอยข้างจอบน Dashboard)
    aether  — โลกฉากเวทมนตร์ (กรอบเขียว, ไพ่ทิพย์, แดชบอร์ดสุขภาพใจ)
    rune    — aether ที่มีขอบเรืองแสง ใช้เน้นจุดเดียวในหน้า ห้ามใช้พร่ำเพรื่อ
\*============================================================================*/

export type SurfaceVariant = 'chrome' | 'glass' | 'aether' | 'rune'
export type SurfaceRadius = 'sm' | 'md' | 'lg' | 'xl' | 'pill'

interface SurfaceProps {
  children: ReactNode
  variant?: SurfaceVariant
  radius?: SurfaceRadius
  /** ระยะขอบใน (padding) — 0 = ไม่ใส่ padding ให้เลย จัดการเอง */
  pad?: 0 | 'sm' | 'md' | 'lg'
  glow?: boolean
  className?: string
  style?: CSSProperties
  as?: 'div' | 'section' | 'article' | 'aside'
}

export default function Surface({
  children,
  variant = 'chrome',
  radius = 'lg',
  pad = 'md',
  glow = false,
  className = '',
  style,
  as: Tag = 'div',
}: SurfaceProps) {
  const classes = [
    'ui-surface',
    `ui-surface--${variant}`,
    `ui-surface--r-${radius}`,
    pad !== 0 ? `ui-surface--pad-${pad}` : '',
    glow ? 'ui-surface--glow' : '',
    className,
  ].filter(Boolean).join(' ')

  return <Tag className={classes} style={style}>{children}</Tag>
}