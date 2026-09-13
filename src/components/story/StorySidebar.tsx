import { useUser } from '../../context/UserContext'
import { useSocial } from '../../context/SocialContext'
import type { SearchUserResult } from '../../services/api/social.api'

/*============================================================================*\
  StorySidebar — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] คอลัมน์ขวา (หน้า 1-2 ของ wireframe)
  ────────────────────────────────────────────────────────────────────────────
  สลับ 2 โหมดตาม query/focus จาก StoryHeader:
    • query ว่าง + ไม่ focus  → grid ปุ่ม 6 ช่อง (ค่าเริ่มต้น)
    • query ว่าง + focus     → "ล่าสุด" (recent search)
    • query ไม่ว่าง          → ผลค้นหาจริงที่กรองจากคำค้น [ตามที่ระบุ — ไม่ใช่โชว์ recent
      เฉยๆ ตลอดแบบใน wireframe หน้า 2 ซึ่งเป็นแค่ mockup คร่าวๆ]
\*============================================================================*/

export type StoryView =
  | 'profile' | 'friends' | 'anonymousPosts' | 'likedPosts' | 'contentSettings' | 'activity'

interface StorySidebarProps {
  query: string
  searchFocused: boolean
  onNavigate: (view: StoryView) => void
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/* [แก้รอบนี้ — ข้อ 12] ตัด "รีโพสต์" ออกจาก grid ทั้งหมด (ฟีเจอร์ถูกตัดทิ้งทั้งเฟส) เหลือ
 * 5 ปุ่ม — "กิจกรรม" ย้ายมาเป็น view ปกติในนี้แทนการยิง callback แยก (ข้อ 14 ทำเป็นหน้าเต็มจอ
 * เหมือนหน้าอื่นๆ ในกริดนี้แล้ว ไม่ต้องมี prop onOpenActivity แยกอีกต่อไป) */
const GRID_ITEMS: { view: StoryView; icon: string; label: string }[] = [
  { view: 'friends', icon: '👥', label: 'เพื่อน' },
  { view: 'anonymousPosts', icon: '🕶️', label: 'โพสต์ปิดโปรไฟล์' },
  { view: 'activity', icon: '🔔', label: 'กิจกรรม' },
  { view: 'likedPosts', icon: '❤️', label: 'ที่ถูกใจ' },
  { view: 'contentSettings', icon: '⚙️', label: 'การตั้งค่าเนื้อหา' },
]

export default function StorySidebar({ query, searchFocused, onNavigate }: StorySidebarProps) {
  const { userData } = useUser()
  const {
    searchResults, isSearching, recentSearches,
    addRecentSearch, removeRecentSearch, clearRecentSearches,
  } = useSocial()

  const trimmed = query.trim()
  const mode: 'grid' | 'recent' | 'results' = trimmed ? 'results' : searchFocused ? 'recent' : 'grid'

  const handlePickResult = (result: SearchUserResult) => {
    addRecentSearch(result)
  }

  if (mode === 'grid') {
    return (
      <>
        <button className="story-sidebar__profile-card" onClick={() => onNavigate('profile')}>
          <div className="story-avatar">{initialOf(userData.username)}</div>
          <div style={{ fontWeight: 700 }}>{userData.username}</div>
        </button>
        <div className="story-grid">
          {GRID_ITEMS.map((item) => (
            <button key={item.view} className="story-grid-btn" onClick={() => onNavigate(item.view)}>
              <span className="story-grid-btn__icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </>
    )
  }

  if (mode === 'recent') {
    return (
      <div>
        <div className="story-search__head">
          <span className="story-search__head-label">ล่าสุด</span>
          {recentSearches.length > 0 && (
            <button className="story-search__edit-link" onClick={clearRecentSearches}>แก้ไข</button>
          )}
        </div>
        {recentSearches.length === 0 ? (
          <div className="story-search-empty">ยังไม่มีประวัติการค้นหา</div>
        ) : (
          recentSearches.map((r) => (
            <div key={r.id} className="story-search-row">
              <div className="story-avatar story-avatar--sm">{initialOf(r.username)}</div>
              <span className="story-search-row__name">{r.username}</span>
              <button className="story-search-row__remove" onClick={() => removeRecentSearch(r.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    )
  }

  // mode === 'results'
  return (
    <div>
      <div className="story-search__head">
        <span className="story-search__head-label">ผลการค้นหา</span>
      </div>
      {isSearching && <div className="story-search-empty">กำลังค้นหา...</div>}
      {!isSearching && searchResults.length === 0 && (
        <div className="story-search-empty">ไม่พบผู้ใช้ที่ตรงกับ "{trimmed}"</div>
      )}
      {!isSearching && searchResults.map((r) => (
        <button key={r.id} className="story-search-row" style={{ width: '100%', border: 'none', textAlign: 'left' }} onClick={() => handlePickResult(r)}>
          <div className="story-avatar story-avatar--sm">{initialOf(r.username)}</div>
          <span className="story-search-row__name">{r.username}</span>
        </button>
      ))}
    </div>
  )
}
