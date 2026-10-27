import type { ReactNode } from 'react'
import './ui.css'

/*============================================================================*\
  SceneFrame — [ไฟล์ใหม่] กรอบฉากที่ป๊อปอัพลูกทุกตัวยึดเป็นขอบเขต
  ────────────────────────────────────────────────────────────────────────────
  ทำหน้าที่เดียวกับ .gameplay-frame เดิม แต่ยกออกมาเป็น primitive เพื่อให้
  ฉากอื่นในอนาคตใช้กติกาเดียวกันได้โดยไม่ต้องคัดลอก CSS ไปวาง

  หัวใจคือ position:relative + overflow:hidden — ลูกที่เป็น position:absolute
  inset:0 จะเต็มพอดีกรอบนี้ ไม่ทะลุออกไปเต็มหน้าจอ และไม่ล้นออกนอกกรอบ
\*============================================================================*/

interface SceneFrameProps {
  children: ReactNode
  className?: string
  /** โทนพื้นหลังของฉาก — 'none' ถ้าจะวางพื้นหลังเอง */
  tone?: 'forest' | 'dusk' | 'none'
}

export default function SceneFrame({ children, className = '', tone = 'none' }: SceneFrameProps) {
  return (
    <div className={`ui-scene-frame ui-scene-frame--${tone} ${className}`}>
      {children}
    </div>
  )
}