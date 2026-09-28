import type { ReactNode } from 'react'
import { useUser } from '../../context/UserContext'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  StorySidebar — คอลัมน์ขวา (หน้า 1 ของ wireframe): การ์ดโปรไฟล์ + ปุ่มเมนู
  [แก้ตามที่ระบุ] ผลค้นหา/ประวัติค้นหาย้ายไปแสดงใต้ช่อง Search (StorySearchDropdown.tsx)
  แถบนี้จึงแสดงเมนู (เพื่อน/ที่ถูกใจ/ฯลฯ) ตลอด ไม่ถูกผลค้นหาบังอีก
\*============================================================================*/

export type StoryView =
  | 'feed' | 'profile' | 'friends' | 'chat' | 'anonymousPosts' | 'likedPosts' | 'contentSettings' | 'activity'

interface StorySidebarProps {
  onNavigate: (view: StoryView) => void
  /** หน้าที่เปิดอยู่ (ไฮไลต์ปุ่มเมนู) */
  active?: StoryView
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/* [แก้รอบนี้ — ข้อ 12] ตัด "รีโพสต์" ออกจาก grid ทั้งหมด (ฟีเจอร์ถูกตัดทิ้งทั้งเฟส) เหลือ
 * 5 ปุ่ม — "กิจกรรม" เป็น view ปกติในนี้ (หน้าเต็มจอเหมือนหน้าอื่นๆ ในกริดนี้) */
/* [แก้ตามที่ระบุ] ทุกเมนูเปิดแสดงแทนที่หน้าฟีด → มีปุ่ม "ฟีด" ไว้กลับ · เพิ่ม "แชท" ต่อจาก "เพื่อน" */
const GRID_ITEMS: { view: StoryView; icon: ReactNode; label: string }[] = [
  { view: 'feed', icon: '🏡', label: 'ฟีด' },
  { view: 'friends', icon: '👥', label: 'เพื่อน' },
  { view: 'chat', icon: '💬', label: 'แชท' },
  { view: 'anonymousPosts', icon: '🕶️', label: 'โพสต์ปิดโปรไฟล์' },
  { view: 'activity', icon: '🔔', label: 'กิจกรรม' },
  { view: 'likedPosts', icon: '❤️', label: 'ที่ถูกใจ' },
  { view: 'contentSettings', icon: <img src={BADGE_ICONS.settings} className="icon-img" alt="" />, label: 'การตั้งค่าเนื้อหา' },
]

export default function StorySidebar({ onNavigate, active }: StorySidebarProps) {
  const { userData } = useUser()

  return (
    <>
      <button className="story-sidebar__profile-card" onClick={() => onNavigate('profile')}>
        <div className="story-avatar">{initialOf(userData.username)}</div>
        <div style={{ fontWeight: 700 }}>{userData.username}</div>
      </button>
      <div className="story-grid">
        {GRID_ITEMS.map((item) => (
          <button key={item.view} className={`story-grid-btn${active === item.view ? ' is-active' : ''}`} onClick={() => onNavigate(item.view)} aria-current={active === item.view ? 'page' : undefined}>
            {/* [แก้ตามที่ระบุ] ไม่ใส่อีโมจิหน้าเมนู */}
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
