import { useEffect, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { QUEST_TABS, type QuestTabId } from '../../config/questCatalog'
import { BADGE_ICONS, QUEST_TAB_ICONS } from '../../config/iconAssets'
import './ActionMenuBar.css'

/** [แก้ตามที่ระบุ] เอา 'inventory' (ย้ายไปอยู่ในหน้าโปรไฟล์) และ 'settings' (ย้ายไปเป็นปุ่ม
 * ในคลัสเตอร์ปุ่มลอยขวาของหน้า Home แทน) ออกจากแถบนี้ เหลือ 4 ปุ่ม: home / quests / shop / profile */
export type NavKey = 'quests' | 'shop' | 'home' | 'story' | 'profile'

interface ActionMenuBarProps {
  /** [แก้ตามที่ระบุ] ไอคอนที่ถูกเลือกไว้ต้องมาจาก Dashboard (อิงจาก modal ที่เปิดอยู่จริง)
   *  ไม่ใช่ state ในตัวเองอีกต่อไป — กันปัญหาปุ่มไม่ sync กับหน้าจอจริงเวลาโมดัลถูกเปิด/ปิด
   *  จากที่อื่นที่ไม่ใช่การกดปุ่มนี้ (เช่น ปุ่มเช็คอินอารมณ์ในแผงขวา, ทูลทิปไพ่ทิพย์) */
  active: NavKey
  onOpenQuestCategory: (tab: QuestTabId) => void
  onOpenShop: () => void
  onOpenProfile: () => void
  /** [แก้ตามที่ระบุ] ปุ่มสตอรี่ย้ายจากมุมซ้ายล่างของหน้า Home มาอยู่ในแถบนี้ ข้างโปรไฟล์ */
  onOpenStory: () => void
  onGoHome: () => void
  /** [แก้บั๊ก] เรียกทันทีที่กดปุ่ม "เควส" (ก่อนกางเมนูลอย 3 ปุ่ม) ให้ Dashboard ปิดแผงหลักอื่น
   *  ที่ค้างอยู่ (ร้านค้า/โปรไฟล์) กันเนื้อหาเก่าโชว์ค้างอยู่หลังเมนูลอย */
  onQuestsMenuOpen?: () => void
  activeQuestCount?: number
}

const NAV_ITEMS: { key: NavKey; icon: string; label: string }[] = [
  { key: 'quests', icon: '📋', label: 'เควส' },
  { key: 'shop', icon: '🛍️', label: 'ร้านค้า' },
  { key: 'home', icon: '🏠', label: 'หน้าแรก' },   // [แก้ตามที่ระบุ] ปุ่ม Home อยู่ตรงกลางแถบ (ปุ่มที่ 3 จาก 5)
  { key: 'story', icon: '📖', label: 'สตอรี่' },
  { key: 'profile', icon: '👤', label: 'โปรไฟล์' },
]

/** [แก้ตามที่ระบุ] แทนอีโมจิของปุ่มลอยล่างจอด้วยรูปจริง — คงฟิลด์ icon (emoji) ไว้ใน
 *  NAV_ITEMS เป็น alt text/fallback เฉยๆ ไม่ได้ลบทิ้ง */
const NAV_ICON_IMAGES: Partial<Record<NavKey, string>> = {
  quests: BADGE_ICONS.questTab,
  shop: BADGE_ICONS.store,
  home: BADGE_ICONS.home,
  profile: BADGE_ICONS.profile,
}

/** ActionMenuBar — Liquid Navigation Bar แบบ V1
 *  [แก้ตามที่ระบุ] เอา active ออกจาก local state — รับมาจาก Dashboard โดยตรงแทน
 *  เพื่อให้ไอคอนที่ไฮไลต์ตรงกับหน้าจอที่แสดงจริงเสมอ ไม่ว่าจะเปิด/ปิดโมดัลจากทางไหน */
export default function ActionMenuBar({
  active, onOpenQuestCategory, onOpenShop, onOpenProfile, onOpenStory, onGoHome,
  onQuestsMenuOpen, activeQuestCount = 0,
}: ActionMenuBarProps) {
  const [showQuestMenu, setShowQuestMenu] = useState(false)
  const { t } = useLanguage()

  /* [แก้ตามที่ระบุ] เมนูเลือกหมวดเควส (3 ตัวเลือก) เปิดค้างอยู่แล้วไปแตะที่อื่น — ต้นไม้ หน้า Home
     หรือปุ่มอื่นๆ — ให้ปิดเองอัตโนมัติ (แตะในเมนู/แถบเมนูนี้เองไม่นับ ปุ่มเควสสลับเปิด-ปิดตามเดิม) */
  useEffect(() => {
    if (!showQuestMenu) return
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('.action-menu-container')) return
      setShowQuestMenu(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showQuestMenu])

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
    if (key === 'story') onOpenStory()
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
          {QUEST_TABS.map((tab) => {
            // [อัปเดตรอบนี้] ทั้ง 3 หมวดมีไฟล์รูปจริงครบแล้ว (ดู iconAssets.ts) — tab.emoji
            // เหลือไว้เป็น fallback เฉยๆ เผื่ออนาคตมีหมวดใหม่ที่ยังไม่มีไฟล์
            const tabIcon = QUEST_TAB_ICONS[tab.id]
            return (
              <button key={tab.id} onClick={() => handlePickCategory(tab.id)}>
                {tabIcon ? <img src={tabIcon} className="icon-img" alt="" /> : tab.emoji} {t(`questTab.${tab.id}`)}
              </button>
            )
          })}
        </div>
      )}

      <div className="liquid-nav-bar" style={{ '--active-index': activeIndex } as React.CSSProperties}>
        <div className="nav-indicator" />
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.key} className={active === item.key ? 'active' : ''}>
              {/* role="button" → ได้ยินเสียงคลิกกลางของระบบ (AudioContext) เหมือนปุ่มอื่น */}
              <a role="button" tabIndex={0} onClick={() => handleClick(item.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(item.key) } }}>
                <span className="nav-icon">
                  {NAV_ICON_IMAGES[item.key]
                    ? <img src={NAV_ICON_IMAGES[item.key]} className="icon-img" alt={t(`nav.${item.key}`)} />
                    : <span className="nav-icon-emoji" aria-hidden="true">{item.icon}</span>}
                </span>
                {item.key === 'quests' && activeQuestCount > 0 && (
                  <span className="nav-badge">{activeQuestCount}</span>
                )}
                <span className="nav-text">{t(`nav.${item.key}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
