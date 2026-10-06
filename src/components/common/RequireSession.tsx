import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

/*============================================================================*\
  RequireSession — หน้า Home (/dashboard) ต้องเข้าระบบแล้ว หรือกำลังทดลองเล่นแบบผู้เยี่ยมชม
  ────────────────────────────────────────────────────────────────────────────
  [แก้บั๊ก] เดิมเปิด /dashboard ตรงๆ ตอนไม่ได้เข้าระบบ (เช่นหลังล้างข้อมูล/โทเคนหมดอายุ/รีเฟรชตอนเป็นผู้เยี่ยมชม)
  ยังแสดงหน้า Home ครึ่งๆ กลางๆ: ต้นไม้ขึ้น แต่ปุ่มตั้งค่า แถบเลเวล/เหรียญ และข่าวเพื่อน/แจ้งเตือนหายหมด
  (ทุกอย่างนั้นแสดงเฉพาะตอนเข้าระบบ) — ตอนนี้พากลับหน้าแรกให้เข้าระบบใหม่แทน
\*============================================================================*/

export default function RequireSession({ children }: { children: ReactNode }) {
  const { isLoggedIn, isGuest } = useAppContext()
  if (!isLoggedIn && !isGuest) return <Navigate to="/" replace />
  return <>{children}</>
}
