import { useSocial } from '../../context/SocialContext'
import type { SearchUserResult } from '../../services/api/social.api'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  StorySearchDropdown — [แก้ตามที่ระบุ] ผลค้นหา/ประวัติค้นหา แสดงเป็นรายการ "ใต้ช่อง Search"
  ────────────────────────────────────────────────────────────────────────────
  เดิมผลค้นหาไปแทนที่เมนูในแถบข้าง (สามขีด) ทำให้ปุ่ม เพื่อน/ที่ถูกใจ/ฯลฯ หายไประหว่างค้นหา
  ตอนนี้แถบข้างแสดงเมนูตลอด ส่วนการค้นหาเด้งเป็นกล่องใต้ช่องค้นหาแทน:
    • ช่องว่าง + โฟกัสอยู่ → "ล่าสุด" (ประวัติค้นหา)
    • มีคำค้น            → ผลค้นหาจริง — แตะชื่อเพื่อเปิดโปรไฟล์ (เช็คความเป็นส่วนตัวให้เอง)
  ใช้ onMouseDown + preventDefault ทุกปุ่ม ไม่ให้ช่องค้นหาเสียโฟกัส (กล่องหาย) ก่อนคลิกทำงาน
\*============================================================================*/

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

interface StorySearchDropdownProps {
  query: string
  onPicked: () => void
}

export default function StorySearchDropdown({ query, onPicked }: StorySearchDropdownProps) {
  const {
    searchResults, isSearching, recentSearches,
    addRecentSearch, removeRecentSearch, clearRecentSearches, requestViewProfile,
  } = useSocial()
  const trimmed = query.trim()

  const openProfile = (result: SearchUserResult) => {
    addRecentSearch(result)
    requestViewProfile(result.id, result.username)
    onPicked()
  }

  const keepFocus = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div className="story-search-dropdown" onMouseDown={keepFocus} role="listbox">
      {!trimmed ? (
        <>
          <div className="story-search__head">
            <span className="story-search__head-label">ล่าสุด</span>
            {recentSearches.length > 0 && (
              <button className="story-search__edit-link" onClick={clearRecentSearches}>ล้างทั้งหมด</button>
            )}
          </div>
          {recentSearches.length === 0 ? (
            <div className="story-search-empty">ยังไม่มีประวัติการค้นหา</div>
          ) : (
            recentSearches.map((r) => (
              <div key={r.id} className="story-search-row">
                <button className="story-search-row__main" onClick={() => openProfile(r)}>
                  <div className="story-avatar story-avatar--sm">{initialOf(r.username)}</div>
                  <span className="story-search-row__name">{r.username}</span>
                </button>
                <button className="story-search-row__remove" onClick={() => removeRecentSearch(r.id)} title="ลบ" aria-label="ลบออกจากประวัติการค้นหา"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <div className="story-search__head">
            <span className="story-search__head-label">ผลการค้นหา</span>
          </div>
          {isSearching && <div className="story-search-empty">กำลังค้นหา...</div>}
          {!isSearching && searchResults.length === 0 && (
            <div className="story-search-empty">ไม่พบผู้ใช้ที่ตรงกับ "{trimmed}"</div>
          )}
          {!isSearching && searchResults.map((r) => (
            <div key={r.id} className="story-search-row">
              <button className="story-search-row__main" onClick={() => openProfile(r)} role="option">
                <div className="story-avatar story-avatar--sm">{initialOf(r.username)}</div>
                <span className="story-search-row__name">{r.username}</span>
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
