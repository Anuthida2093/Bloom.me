interface StoryHeaderProps {
  query: string
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
  query, onQueryChange, onFocus, onBlur, onOpenActivity, onToggleMobileSidebar, onClose,
}: StoryHeaderProps) {
  return (
    <div className="story-header">
      <span className="story-header__title">Story</span>
      <div className="story-header__search">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search"
        />
        <span className="story-header__search-icon">🔍</span>
      </div>
      <button className="story-header__icon-btn" title="กิจกรรม" onClick={onOpenActivity}>🔔</button>
      <button className="story-header__icon-btn show-tablet" title="เมนู" onClick={onToggleMobileSidebar}>☰</button>
      {/* [แก้ข้อ 4] ปุ่มปิดมาตรฐาน — ทรงเดียวกับปุ่มปิดของ ProfilePage.tsx (วงกลมพื้นการ์ด+เงา
          ไม่ใช่วงกลมทึบเข้มแบบกระดิ่ง/แฮมเบอร์เกอร์) แทนที่ปุ่ม Home ลอยกลางจอที่ตัดออกแล้ว */}
      <button className="story-header__close-btn" title="ปิด" onClick={onClose}>✕</button>
    </div>
  )
}
