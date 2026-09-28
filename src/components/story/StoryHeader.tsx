import { useRef } from 'react'
import { BADGE_ICONS } from '../../config/iconAssets'
import StorySearchDropdown from './StorySearchDropdown'

interface StoryHeaderProps {
  query: string
  /** ช่องค้นหากำลังโฟกัส — แสดงกล่องผลค้นหา/ประวัติใต้ช่อง */
  searchFocused: boolean
  onQueryChange: (q: string) => void
  onFocus: () => void
  onBlur: () => void
  onOpenActivity: () => void
  onToggleMobileSidebar: () => void
  onClose: () => void
}

/*============================================================================*\
  StoryHeader — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] แถบหัวข้อย่อย: "Story" + ช่องค้นหา + กระดิ่ง +
  hamburger (หน้า 1 ของ wireframe) — กระดิ่งเปิดแผงกิจกรรมเดียวกับปุ่ม "กิจกรรม" ใน sidebar
  (แอปนี้ยังไม่มีระบบแจ้งเตือนแยกต่างหาก — กิจกรรม = แจ้งเตือนในความหมายเดียวกัน)
  hamburger สลับเปิด/ปิด sidebar แบบ drawer บนจอแคบ (<900px)
\*============================================================================*/
export default function StoryHeader({
  query, searchFocused, onQueryChange, onFocus, onBlur, onOpenActivity, onToggleMobileSidebar, onClose,
}: StoryHeaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  return (
    <div className="story-header">
      <span className="story-header__title">Story</span>
      <div className="story-header__search">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search"
        />
        <span className="story-header__search-icon">🔍</span>
        {searchFocused && (
          <StorySearchDropdown query={query} onPicked={() => { onQueryChange(''); inputRef.current?.blur() }} />
        )}
      </div>
      <button className="story-header__icon-btn" title="กิจกรรม" onClick={onOpenActivity}>🔔</button>
      {/* [แก้ตามที่ระบุ] สามขีดแสดงทุกขนาดจอ — จอแคบ: เปิด/ปิดเมนูแบบลิ้นชัก · จอกว้าง (โน้ตบุ๊ก): ซ่อน/แสดงแถบเมนูข้าง */}
      <button className="story-header__icon-btn" title="เมนู" aria-label="เมนู" onClick={onToggleMobileSidebar}>☰</button>
      {/* [แก้ข้อ 4] ปุ่มปิดมาตรฐาน — ทรงเดียวกับปุ่มปิดของ ProfilePage.tsx (วงกลมพื้นการ์ด+เงา
          ไม่ใช่วงกลมทึบเข้มแบบกระดิ่ง/แฮมเบอร์เกอร์) แทนที่ปุ่ม Home ลอยกลางจอที่ตัดออกแล้ว */}
      <button className="story-header__close-btn" title="ปิด" onClick={onClose}><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>
    </div>
  )
}
