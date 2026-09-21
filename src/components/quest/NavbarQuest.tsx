import { useLayoutEffect, useRef, useState } from 'react'
import { QUEST_TABS, type QuestTabId } from '../../config/questCatalog'
import { BADGE_ICONS } from '../../config/iconAssets'

interface NavbarQuestProps {
  zoneTitle: string
  zoneSubtitle: string
  activeTab: QuestTabId
  onChangeTab: (tab: QuestTabId) => void
  coins: number
  streak: number
  onClose?: () => void
  /** [ใหม่] สถานะ + ตัวสลับเปิด-ปิด Quest Sidebar — ปุ่มอยู่ใน navbar เสมอ (ไม่ใช่ลอยเกาะ
   *  ขอบ sidebar) เพราะ sidebar เปลี่ยน layout ไปเป็นแถบแนวนอนบนมือถือ ถ้าปุ่มลอยเกาะขอบ
   *  sidebar จะต้องคำนวณตำแหน่งใหม่ทุก breakpoint — วางในนี้ที่เดียวจบ เข้าถึงได้ตลอดไม่ว่า
   *  sidebar จะย่อ/ขยายอยู่หรือไม่ */
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

/**
 * NavbarQuest — รวม header ทั้งหมดของระบบเควส (ปุ่มย่อ sidebar+ชื่อโซนซ้าย, แถบสลับ
 * หมวดกลาง, สถิติ+ปุ่มปิดขวา) โครงสร้าง breakpoint เดิม (3 แถวบนมือถือ, แถวเดียวบนจอกว้าง)
 * คงไว้ทั้งหมดตามที่ออกแบบไว้แล้ว — งานรอบนี้ปรับแค่ 2 เรื่อง:
 *   1) เพิ่มปุ่ม toggle sidebar (ซ้ายสุด ก่อนชื่อโซน)
 *   2) [Minimalist] ลดความเข้มของพื้นหลังกระจกและเงา ให้ดูโปร่ง สบายตาขึ้น โดยยังคง
 *      contrast พออ่านออกชัดตอนวางทับฉากพื้นหลังที่มีรายละเอียดเยอะ (ต้นไม้/scene)
 */
export default function NavbarQuest({
  zoneTitle, zoneSubtitle, activeTab, onChangeTab, coins, streak, onClose,
  isSidebarCollapsed, onToggleSidebar,
}: NavbarQuestProps) {
  return (
    <div className="navbar-quest">
      <div className="navbar-quest__row navbar-quest__row--top">
        <div className="navbar-quest__left">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="navbar-quest__sidebar-toggle"
            title={isSidebarCollapsed ? 'แสดงแถบเควส' : 'ซ่อนแถบเควส'}
            aria-label={isSidebarCollapsed ? 'แสดงแถบเควส' : 'ซ่อนแถบเควส'}
            aria-pressed={isSidebarCollapsed}
          >
            {isSidebarCollapsed ? '▶' : '◀'}
          </button>

          <div className="navbar-quest__title-block">
            <div className="navbar-quest__title">🌲 {zoneTitle}</div>
            <div className="navbar-quest__subtitle">{zoneSubtitle}</div>
          </div>
        </div>

        {/* บนจอกว้าง แท็บสลับหมวดมาอยู่ตรงกลางแถวเดียวกับหัวเรื่อง — บนมือถือ ย้ายลงไปเป็นแถวของตัวเองข้างล่าง (ดู .navbar-quest__row--tabs) */}
        <div className="navbar-quest__tabs-slot navbar-quest__tabs-slot--desktop">
          <QuestTabSwitcher activeTab={activeTab} onChange={onChangeTab} />
        </div>

        <div className="navbar-quest__right">
          <span className="navbar-quest__stat-pill">🔥 {streak}วัน</span>
          {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 3] อีก root cause ที่รอบก่อน grep ไม่เจอ — ป้ายยอดเหรียญนี้
              ลอยอยู่บน navbar ของ "ทุกหน้าเควส" (จุดแรกที่เห็นทันทีตอนเปิดเควสไหนก็ได้) เป็น
              balance display เหมือน HUD บน Dashboard จึงคงลำดับ "รูปนำหน้าตัวเลข" ไว้เหมือน HUD
              (ต่างจาก popup รางวัลที่เพิ่งได้รับซึ่งให้ตัวเลขนำหน้ารูปตามที่ระบุ) */}
          <span className="navbar-quest__stat-pill"><img src={BADGE_ICONS.coins} className="icon-img" alt="" /> {coins.toLocaleString()}</span>
          {onClose && (
            <button onClick={onClose} title="ปิด" className="navbar-quest__close-btn">✕</button>
          )}
        </div>
      </div>

      {/* แถวแท็บสำหรับมือถือเท่านั้น (ซ่อนบนจอกว้างด้วย CSS เพราะมีอันในแถวบนแล้ว) */}
      <div className="navbar-quest__row navbar-quest__row--tabs navbar-quest__row--mobile-only">
        <QuestTabSwitcher activeTab={activeTab} onChange={onChangeTab} />
      </div>

      <style>{`
        .navbar-quest {
  flex-shrink: 1;
  --lc-bg-1: rgba(10, 78, 59, 0.75);
  background: var(--lc-bg-1);
  border-bottom: 1px solid var(--glass-w-8);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
}
        .navbar-quest__row {
          display: flex; align-items: center; gap: 0px;
          padding: 12px 16px;
        }
        .navbar-quest__row--top { justify-content: space-between; }

        .navbar-quest__left { display: flex; align-items: center; gap: 0px; min-width: 0; }

        .navbar-quest__sidebar-toggle {
          flex-shrink: 14; width: 30px; height: 30px; border-radius: 10px;
          border: 1px solid var(--glass-w-16); background: var(--glass-w-8);
          color: var(--fixed-white); font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s ease, transform .15s ease;
        }
        .navbar-quest__sidebar-toggle:hover { background: var(--glass-w-18); }
        .navbar-quest__sidebar-toggle:active { transform: scale(.92); }

        .navbar-quest__title-block { min-width: 0; }
        .navbar-quest__title {
          font-family: 'Fredoka One'; font-size: 18px; color: var(--fixed-white);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .navbar-quest__subtitle { font-size: 12.5px; color: var(--glass-w-72); margin-top: 2px; }
        .navbar-quest__tabs-slot { display: flex; justify-content: center; flex: 1; min-width: 0; }
        .navbar-quest__right { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }

        /* [Minimalist] เพิ่มเส้นขอบบางๆ ให้ pill ดูมีขอบเขตชัดขึ้นแทนลอยตัวเฉยๆ */
        .navbar-quest__stat-pill {
          background: var(--glass-w-12); border: 1px solid var(--glass-w-14);
          border-radius: 999px; padding: 4px 8px; /* เดิม 4px 8px — ลด padding ซ้ายขวาให้ pill แคบลงเล็กน้อย */
          font-size: 16px; font-weight: 600; color: var(--fixed-white); white-space: nowrap;
        }
        .navbar-quest__close-btn {
          width: 10px; height: 10px; border-radius: 999px; border: 5px solid var(--glass-w-14);
          background: var(--glass-w-10); color: var(--fixed-white); cursor: pointer; font-size: 20px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background .15s ease, transform .15s ease;
        }
        .navbar-quest__close-btn:hover { background: var(--glass-w-22); transform: scale(1.05); }
        .navbar-quest__close-btn:active { transform: scale(.94); }

        /* ── มือถือ (< 768px): 3 แถว ── */
        .navbar-quest__row--mobile-only { display: flex; padding-top: 0; }
        .navbar-quest__tabs-slot--desktop { display: none; }
        .navbar-quest__title { font-size: 16px; }
        .navbar-quest__subtitle { display: none; } /* ตัดบรรทัดรองบนจอแคบมากกันแถวสูงเกินไป */
        .navbar-quest__row--tabs { overflow-x: auto; }

        /* ── แท็บเล็ต/โน้ตบุ๊ค (>= 768px): แถวเดียว ── */
        @media (min-width: 768px) {
          .navbar-quest__row--mobile-only { display: none; }
          .navbar-quest__tabs-slot--desktop { display: flex; }
          .navbar-quest__title { font-size: 18px; }
          .navbar-quest__subtitle { display: block; }
          .navbar-quest { height: 80px; }
          .navbar-quest__row--top { padding-top: 10px; padding-bottom: 0; height: 65px; }
        }
      `}</style>
    </div>
  )
}

interface QuestTabSwitcherProps {
  activeTab: QuestTabId
  onChange: (tab: QuestTabId) => void
}

/**
 * QuestTabSwitcher — แถบสลับหมวด (sliding indicator ลื่นไหล, ตัวอักษร 18px, ไอคอนเด้งตอน
 * active) [Minimalist] ลดความเข้มของพื้นหลัง/เงาลงเล็กน้อยให้ดูโปร่งสบายตาขึ้น โครงสร้าง
 * และ interaction ทั้งหมดเหมือนเดิมทุกอย่าง (ของเดิมออกแบบมาดีอยู่แล้ว ไม่แตะ logic)
 */
function QuestTabSwitcher({ activeTab, onChange }: QuestTabSwitcherProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const btnRefs = useRef<Partial<Record<QuestTabId, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const btn = btnRefs.current[activeTab]
    const container = containerRef.current
    if (!btn || !container) return
    const btnRect = btn.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setIndicator({ left: btnRect.left - containerRect.left, width: btnRect.width })
  }, [activeTab])

  const activeTabDef = QUEST_TABS.find((t) => t.id === activeTab) ?? QUEST_TABS[0]

  return (
    <div ref={containerRef} className="quest-tab-switcher">
      <div
        className="quest-tab-switcher__indicator"
        style={{ left: indicator.left, width: indicator.width, background: activeTabDef.accent }}
      />
      {QUEST_TABS.map((t) => {
        const isActive = t.id === activeTab
        return (
          <button
            key={t.id}
            ref={(el) => { btnRefs.current[t.id] = el }}
            type="button"
            onClick={() => onChange(t.id)}
            className={isActive ? 'quest-tab-switcher__btn quest-tab-switcher__btn--active' : 'quest-tab-switcher__btn'}
          >
            <span key={isActive ? `${t.id}-active` : t.id} className={isActive ? 'quest-tab-switcher__icon quest-tab-switcher__icon--pop' : 'quest-tab-switcher__icon'}>
              {t.emoji}
            </span>
            {t.label}
          </button>
        )
      })}

      <style>{`
        .quest-tab-switcher {
          position: relative;
          display: flex; gap: 4px; flex-wrap: nowrap;
          background: var(--glass-b-24); backdrop-filter: blur(10px);
          border: 1px solid var(--glass-w-8);
          border-radius: 999px; padding: 6px;
          box-shadow: 0 6px 18px var(--glass-b-22);
          animation: questTabSwitcherFadeIn .4s cubic-bezier(.22,1,.36,1) both;
          width: fit-content; max-width: 100%;
        }
        .quest-tab-switcher__indicator {
          position: absolute; top: 6px; bottom: 6px;
          border-radius: 999px;
          transition: left .35s cubic-bezier(.22,1,.36,1), width .35s cubic-bezier(.22,1,.36,1), background .25s ease;
          box-shadow: 0 3px 10px var(--glass-b-28);
          z-index: 0;
        }
        .quest-tab-switcher__btn {
          position: relative; z-index: 1;
          padding: 9px 18px; border: none; border-radius: 999px; background: transparent;
          color: var(--glass-w-70); font-family: 'Fredoka One'; font-size: 18px; cursor: pointer;
          white-space: nowrap; display: flex; align-items: center; gap: 7px;
          transition: color .25s ease;
        }
        .quest-tab-switcher__btn--active { color: var(--fixed-white); }
        .quest-tab-switcher__btn:hover:not(.quest-tab-switcher__btn--active) { color: var(--glass-w-95); }

        .quest-tab-switcher__icon { display: inline-block; font-size: 18px; }
        .quest-tab-switcher__icon--pop { animation: questTabIconPop .45s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes questTabIconPop {
          0%   { transform: scale(.4) rotate(-15deg); }
          60%  { transform: scale(1.3) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes questTabSwitcherFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .quest-tab-switcher__btn { padding: 8px 12px; font-size: 14px; }
          .quest-tab-switcher__icon { font-size: 14px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .quest-tab-switcher, .quest-tab-switcher__indicator, .quest-tab-switcher__icon--pop { animation: none; transition: none; }
        }
      `}</style>
    </div>
  )
}