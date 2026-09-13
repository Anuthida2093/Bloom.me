import { useNavigate } from 'react-router-dom'
import { DEFAULT_USER_DATA, type UserData } from '../../types'
import { BADGE_ICONS } from '../../config/iconAssets'
import './NavBar.css'

interface NavBarProps {
  userData?: UserData
  isLoggedIn?: boolean
  isGuest?: boolean
  /** [ใหม่] ย้ายมาจาก ActionMenuBar เดิม (ปุ่ม ⚙️ ในแถบ 5 ปุ่มล่างจอ) — ตอนนี้แถบล่างเหลือ
   *  4 ปุ่ม (Home/เควส/ร้านค้า/โปรไฟล์) เท่านั้น ปุ่มตั้งค่าย้ายมาเป็นวงกลมมุมขวาบนแทน */
  onOpenSettings?: () => void
  /** [แก้ตามที่ระบุ] ปุ่มวงกลมมุมขวาบน (profile-btn) เดิมกด "ครั้งเดียว" ทำหน้าที่ออกจาก
   *  ระบบตรงๆ (เรียก onLogout แล้ว navigate('/')) — ตอนนี้เปลี่ยนหน้าที่เป็นเปิดหน้าตั้งค่า
   *  โปรไฟล์แทน (ปุ่มออกจากระบบยังอยู่ในหน้าตั้งค่าหลักตามเดิม ไม่เกี่ยวกับปุ่มนี้อีกต่อไป
   *  จึงตัด onLogout prop ทิ้งจากไฟล์นี้ทั้งหมด — ไม่มีใครเรียกใช้แล้ว) */
  onOpenProfileSettings?: () => void
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
  onOpenSettings = () => {},
  onOpenProfileSettings = () => {},
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

        {/* [แก้ตามที่ระบุ] ปุ่มวงกลมนี้ชื่อ class ว่า profile-btn มาแต่เดิม (ก่อนมีหน้าโปรไฟล์จริง)
            เดิมทำหน้าที่ "ออกจากระบบ" — ตอนนี้เปลี่ยนเป็นเปิดหน้าตั้งค่าโปรไฟล์โดยตรง (ผ่าน
            SettingsModal ที่มี initialSubModal='profile' อยู่แล้วจากงานก่อนหน้า — ดู
            Dashboard.tsx onOpenProfileSettings) ปุ่มออกจากระบบยังอยู่ในหน้าตั้งค่าหลักเหมือนเดิม
            ไม่ได้เปลี่ยนชื่อ class ในรอบนี้เพื่อลด diff ที่ไม่จำเป็น */}
        {/* [แก้ตามที่ระบุ] ปุ่มนี้เคยโชว์ตัวอักษรแรกของชื่อผู้ใช้/🔑 เป็นวงกลม — ตอนนี้ใช้รูป
            profile.png จริงแทนทั้ง 2 สถานะ (ไม่มีไฟล์แยกสำหรับ "กดเพื่อเข้าสู่ระบบ" ในตาราง
            ไอคอนที่มี จึงใช้รูปเดียวกัน แยกความหมายด้วย title/onClick แทน) */}
        {isLoggedIn || isGuest ? (
          <button
            className="profile-btn"
            title="ตั้งค่าโปรไฟล์"
            onClick={onOpenProfileSettings}
          >
            <img src={BADGE_ICONS.profile} alt={userData.username || 'โปรไฟล์'} />
          </button>
        ) : (
          <button className="profile-btn profile-btn--login" title="เข้าสู่ระบบ" onClick={() => navigate('/')}>
            <img src={BADGE_ICONS.profile} alt="เข้าสู่ระบบ" />
          </button>
        )}
      </div>
    </nav>
  )
}
