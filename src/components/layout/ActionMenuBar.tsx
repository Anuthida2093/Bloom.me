import { useState } from 'react'
import { QUEST_TABS, type QuestTabId } from '../../config/questCatalog'
import './ActionMenuBar.css'

/** [แก้ตามที่ระบุ] เอา 'inventory' (ย้ายไปอยู่ในหน้าโปรไฟล์) และ 'settings' (ย้ายไปเป็นปุ่ม
 * วงกลมที่ NavBar มุมขวาบนแทน) ออกจากแถบนี้ เหลือ 4 ปุ่ม: home / quests / shop / profile */
export type NavKey = 'quests' | 'shop' | 'home' | 'profile'

interface ActionMenuBarProps {
  /** [แก้ตามที่ระบุ] ไอคอนที่ถูกเลือกไว้ต้องมาจาก Dashboard (อิงจาก modal ที่เปิดอยู่จริง)
   *  ไม่ใช่ state ในตัวเองอีกต่อไป — กันปัญหาปุ่มไม่ sync กับหน้าจอจริงเวลาโมดัลถูกเปิด/ปิด
   *  จากที่อื่นที่ไม่ใช่การกดปุ่มนี้ (เช่น ปุ่มเช็คอินอารมณ์ในแผงขวา, ทูลทิปไพ่ทิพย์) */
  active: NavKey
  onOpenQuestCategory: (tab: QuestTabId) => void
  onOpenShop: () => void
  onOpenProfile: () => void
  onGoHome: () => void
  /** [แก้บั๊ก] เรียกทันทีที่กดปุ่ม "เควส" (ก่อนกางเมนูลอย 3 ปุ่ม) ให้ Dashboard ปิดแผงหลักอื่น
   *  ที่ค้างอยู่ (ร้านค้า/โปรไฟล์) กันเนื้อหาเก่าโชว์ค้างอยู่หลังเมนูลอย */
  onQuestsMenuOpen?: () => void
  activeQuestCount?: number
}

const NAV_ITEMS: { key: NavKey; icon: string; label: string }[] = [
  { key: 'quests', icon: '📋', label: 'เควส' },
  { key: 'shop', icon: '🛍️', label: 'ร้านค้า' },
  { key: 'home', icon: '🏠', label: 'หน้าแรก' },
  { key: 'profile', icon: '👤', label: 'โปรไฟล์' },
]

/** ActionMenuBar — Liquid Navigation Bar แบบ V1
 *  [แก้ตามที่ระบุ] เอา active ออกจาก local state — รับมาจาก Dashboard โดยตรงแทน
 *  เพื่อให้ไอคอนที่ไฮไลต์ตรงกับหน้าจอที่แสดงจริงเสมอ ไม่ว่าจะเปิด/ปิดโมดัลจากทางไหน */
export default function ActionMenuBar({
  active, onOpenQuestCategory, onOpenShop, onOpenProfile, onGoHome,
  onQuestsMenuOpen, activeQuestCount = 0,
}: ActionMenuBarProps) {
  const [showQuestMenu, setShowQuestMenu] = useState(false)

  const handleClick = (key: NavKey) => {
    if (key === 'quests') {
      // [แก้บั๊กร้ายแรง — พบจากการทดสอบจริงผ่านเบราว์เซอร์] เดิมเรียก onQuestsMenuOpen?.()
      // (ซึ่งไปเรียก closeModal ของ UIContext ต่อ) จาก "ข้างใน" updater function ของ
      // setShowQuestMenu — React เรียก updater function ระหว่างเฟส render/reconciliation
      // ของ ActionMenuBar เอง การยิง setState ของ component อื่น (UIProvider) จากตรงนั้น
      // จึงเป็นการ "อัปเดต component หนึ่งระหว่างกำลัง render อีก component หนึ่ง" ตรงๆ —
      // เห็น error จริงใน console: "Cannot update a component (UIProvider) while
      // rendering a different component (ActionMenuBar)" ทุกครั้งที่กดปุ่มเควส แก้โดยย้าย
      // onQuestsMenuOpen?.() ออกมานอก updater ให้เรียกตรงๆ ใน event handler แทน (เช็ค
      // !showQuestMenu ซึ่งเป็นค่า "ก่อนสลับ" แทนตัวแปร next เดิม — ตรรกะเดียวกัน)
      const willOpen = !showQuestMenu
      setShowQuestMenu(willOpen)
      if (willOpen) onQuestsMenuOpen?.() // เปิดเมนู (ไม่ใช่ปิด) → ปิดแผงหลักอื่นที่ค้างอยู่ก่อน
      return
    }
    setShowQuestMenu(false)
    if (key === 'home') onGoHome()
    if (key === 'shop') onOpenShop()
    if (key === 'profile') onOpenProfile()
  }

  const handlePickCategory = (tab: QuestTabId) => {
    setShowQuestMenu(false)
    onOpenQuestCategory(tab)
  }

  const activeIndex = NAV_ITEMS.findIndex((i) => i.key === active)

  return (
    <div className="action-menu-container">
      {showQuestMenu && (
        <div className="quest-floating-menu">
          {QUEST_TABS.map((tab) => (
            <button key={tab.id} onClick={() => handlePickCategory(tab.id)}>
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="liquid-nav-bar" style={{ '--active-index': activeIndex } as React.CSSProperties}>
        <div className="nav-indicator" />
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.key} className={active === item.key ? 'active' : ''}>
              <a onClick={() => handleClick(item.key)}>
                <span className="nav-icon">{item.icon}</span>
                {item.key === 'quests' && activeQuestCount > 0 && (
                  <span className="nav-badge">{activeQuestCount}</span>
                )}
                <span className="nav-text">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
