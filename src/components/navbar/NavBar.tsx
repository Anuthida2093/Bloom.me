import { useNavigate } from 'react-router-dom'
import { DEFAULT_USER_DATA, type UserData } from '../../types'
import './NavBar.css'

interface NavBarProps {
  userData?: UserData
  isLoggedIn?: boolean
  isGuest?: boolean
  onLogout?: () => void
  /** [ใหม่] ย้ายมาจาก ActionMenuBar เดิม (ปุ่ม ⚙️ ในแถบ 5 ปุ่มล่างจอ) — ตอนนี้แถบล่างเหลือ
   *  4 ปุ่ม (Home/เควส/ร้านค้า/โปรไฟล์) เท่านั้น ปุ่มตั้งค่าย้ายมาเป็นวงกลมมุมขวาบนแทน */
  onOpenSettings?: () => void
}

/**
 * NavBar — กลับไปเรียบง่ายแบบ V1: โลโก้ซ้าย + ปุ่มตั้งค่า/โปรไฟล์ขวา
 * HUD (MBTI/EXP/Coins/Streak) ย้ายไป .game-top-hud ใน Dashboard.tsx
 * คลังไอเทม ย้ายไปอยู่ในหน้าโปรไฟล์ (เปิดผ่าน ActionMenuBar ปุ่ม "โปรไฟล์") แทน
 */
export default function NavBar({
  userData = DEFAULT_USER_DATA,
  isLoggedIn = false,
  isGuest = false,
  onLogout = () => {},
  onOpenSettings = () => {},
}: NavBarProps) {
  const navigate = useNavigate()

  return (
    <nav className="top-navbar">
      <div className="navbar-logo">
        <span>🌱</span>
        <span className="hide-mobile">ARBOR HORIZON</span>
      </div>

      <div className="navbar-right-cluster">
        {(isLoggedIn || isGuest) && (
          <button className="navbar-settings-btn" title="ตั้งค่า" onClick={onOpenSettings}>
            ⚙️
          </button>
        )}

        {/* [หมายเหตุ] ปุ่มวงกลมนี้ชื่อ class ว่า profile-btn มาแต่เดิม (ก่อนมีหน้าโปรไฟล์จริง) แต่
            ทำหน้าที่ "ออกจากระบบ" ไม่ใช่เปิดหน้าโปรไฟล์ — หน้าโปรไฟล์จริงเปิดผ่านปุ่ม "โปรไฟล์"
            ใน ActionMenuBar ด้านล่างจอแทน (ดู Dashboard.tsx onOpenProfile) ไม่ได้เปลี่ยนชื่อ class
            ในรอบนี้เพื่อลด diff ที่ไม่จำเป็น */}
        {isLoggedIn || isGuest ? (
          <button
            className="profile-btn"
            title={isLoggedIn ? `${userData.username} — คลิกออกจากระบบ` : 'โหมดทดลองเล่น'}
            onClick={() => { if (isLoggedIn) { onLogout(); navigate('/') } }}
          >
            {userData.username.slice(0, 1) || '?'}
          </button>
        ) : (
          <button className="profile-btn profile-btn--login" onClick={() => navigate('/')}>
            🔑
          </button>
        )}
      </div>
    </nav>
  )
}
