import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { JournalEntryRecord } from '../../../../types'
import { useTypewriter } from '../../../../hooks/useTypewriter'
import { playSfx } from '../../../../utils/audioPlayer'
import type { ParchmentTheme } from './ParchmentJournalEditor'
import { BADGE_ICONS } from '../../../../config/iconAssets'

const C_1 = '#C7A34F'
const C_2 = '#F3E6C8'
const C_3 = '#2D2013'
const C_4 = '#FFD166'
const C_5 = '#FFF3D6'
const C_6 = '#4A2C0A'

interface JournalHistoryModalProps {
  theme: ParchmentTheme
  accent: string
  title: string
  entries: JournalEntryRecord[]
  onClose: () => void
}

const THEME_ACCENT: Record<ParchmentTheme, { gold: string; paper: string; ink: string }> = {
  mystic: { gold: C_1, paper: C_2, ink: C_3 },
  golden: { gold: C_4, paper: C_5, ink: C_6 },
}

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/**
 * JournalHistoryModal — [ใช้ร่วมกัน] ประวัติบันทึกของทั้ง Reframer Journal และ
 * Gratitude Shield — รายการ + ตัวกรองเดือน/ปี → คลิกแล้วเปิดเป็น storybook reader
 * (ข้อความพิมพ์ตัวเองแบบ typewriter, ประกายเวทมนตร์ + เสียง wing.mp3 ตอนเริ่มอ่าน,
 * ปุ่มสลับอ่าน "ต้นฉบับ"/"AI สรุปใหม่", ปุ่มแชร์)
 */
export default function JournalHistoryModal({ theme, accent, title, entries, onClose }: JournalHistoryModalProps) {
  const colors = THEME_ACCENT[theme]
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  // [ใหม่ — ตรวจสอบกับ UX_UI.pdf แล้วพบว่ามีช่องค้นหาที่โค้ดเดิมไม่มี] ค้นหาจากหัวข้อ/เนื้อหา
  const [searchQuery, setSearchQuery] = useState('')
  const [readingEntry, setReadingEntry] = useState<JournalEntryRecord | null>(null)

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => new Date(e.createdAt).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [entries])

  const filteredEntries = entries
    .filter((e) => {
      const d = new Date(e.createdAt)
      const monthOk = monthFilter === 'all' || d.getMonth() === monthFilter
      const yearOk = yearFilter === 'all' || d.getFullYear() === yearFilter
      const searchOk = searchQuery.trim() === '' || (e.title + e.originalText).toLowerCase().includes(searchQuery.trim().toLowerCase())
      return monthOk && yearOk && searchOk
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="journal-history">
      <button onClick={onClose} title="ปิด" className="journal-history__close"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>

      <AnimatePresence mode="wait">
        {!readingEntry ? (
          <motion.div key="list" className="journal-history__panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="journal-history__title" style={{ color: colors.gold }}>📜 {title}</h2>

            {/* [ใหม่ — ตาม UX_UI.pdf] ช่องค้นหาจากหัวข้อ/เนื้อหาบันทึก — ของเดิมมีแค่ตัวกรอง
                เดือน/ปี ยังไม่มีช่องค้นหาข้อความเลย */}
            <div className="journal-history__search-wrap">
              <span className="journal-history__search-icon">🔍</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา..."
                className="journal-history__search-input"
              />
            </div>

            <div className="journal-history__filters">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="journal-history__select">
                <option value="all">ทุกเดือน</option>
                {MONTHS_TH.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="journal-history__select">
                <option value="all">ทุกปี</option>
                {availableYears.map((y) => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>

            <div className="journal-history__list">
              {filteredEntries.length === 0 ? (
                <p className="journal-history__empty">ยังไม่มีบันทึกในช่วงนี้</p>
              ) : (
                filteredEntries.map((entry) => {
                  const d = new Date(entry.createdAt)
                  return (
                    <button key={entry.id} className="journal-history__item" onClick={() => { playSfx('CARD_FLIP'); setReadingEntry(entry) }}>
                      <span className="journal-history__item-date">{d.getDate()} {MONTHS_TH[d.getMonth()]} {d.getFullYear() + 543}</span>
                      <span className="journal-history__item-title">{entry.title}</span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        ) : (
          <StorybookReader key="reader" accent={accent} colors={colors} entry={readingEntry} onBack={() => setReadingEntry(null)} />
        )}
      </AnimatePresence>

      <style>{`
        .journal-history {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  --lc-bg-2: rgba(5,10,8,.75);
  background: var(--lc-bg-2);
  backdrop-filter: blur(6px);
  overflow-y: auto;
}
        .journal-history__close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 99px; border: none; background: var(--glass-w-15); color: var(--fixed-white); cursor: pointer; font-size: 15px; z-index: 5; }

        .journal-history__panel {
  width: 100%;
  max-width: 480px;
  --lc-bg-1: rgba(20,15,10,.9);
  background: var(--lc-bg-1);
  border-radius: 24px;
  padding: 28px 24px;
  box-shadow: 0 30px 70px var(--glass-b-50);
}
        .journal-history__title { font-family: 'Fredoka One'; font-size: 18px; text-align: center; margin-bottom: 18px; }

        .journal-history__search-wrap {
          position: relative; margin-bottom: 12px;
        }
        .journal-history__search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          font-size: 13px; opacity: .6; pointer-events: none;
        }
        .journal-history__search-input {
          width: 100%; padding: 9px 12px 9px 34px; border-radius: 10px;
          border: 1px solid var(--glass-w-25); background: var(--glass-w-8);
          color: var(--fixed-white); font-size: 12.5px; font-family: Nunito; outline: none;
        }
        .journal-history__search-input::placeholder { color: var(--glass-w-45); }

        .journal-history__filters { display: flex; gap: 8px; margin-bottom: 16px; }
        .journal-history__select { flex: 1; padding: 9px 10px; border-radius: 10px; border: 1px solid var(--glass-w-25); background: var(--glass-w-8); color: var(--fixed-white); font-size: 12.5px; }

        .journal-history__list { display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; }
        .journal-history__empty { text-align: center; color: var(--glass-w-50); font-size: 13px; padding: 20px 0; }
        .journal-history__item {
          display: flex; flex-direction: column; gap: 3px; text-align: left; padding: 12px 14px;
          border-radius: 14px; border: 1px solid var(--glass-w-15); background: var(--glass-w-6);
          cursor: pointer; transition: background .15s ease;
        }
        .journal-history__item:hover { background: var(--glass-w-12); }
        .journal-history__item-date { font-size: 10.5px; color: var(--glass-w-55); font-weight: 700; }
        .journal-history__item-title { font-size: 13.5px; color: var(--fixed-white); }
      `}</style>
    </div>
  )
}

interface StorybookReaderProps {
  accent: string
  colors: { gold: string; paper: string; ink: string }
  entry: JournalEntryRecord
  onBack: () => void
}

function StorybookReader({ accent, colors, entry, onBack }: StorybookReaderProps) {
  const [viewMode, setViewMode] = useState<'original' | 'reframed'>('reframed')
  const [showSparkle, setShowSparkle] = useState(true)
  const text = viewMode === 'reframed' ? entry.aiReframedText : entry.originalText
  const { displayedText, isDone } = useTypewriter(text, 22, 250, () => playSfx('KEYPRESS'))

  useState(() => {
    // เล่นประกาย+เสียงกระพือปีกครั้งเดียวตอนเปิดอ่านครั้งแรก
    playSfx('WING')
    window.setTimeout(() => setShowSparkle(false), 1400)
  })

  const handleShare = async () => {
    const shareText = `${entry.title}\n\n${text}`
    if (navigator.share) {
      try { await navigator.share({ title: entry.title, text: shareText }) } catch { /* ผู้ใช้กดยกเลิกการแชร์ */ }
    } else {
      await navigator.clipboard.writeText(shareText).catch(() => {})
    }
  }

  return (
    <motion.div className="storybook-reader" initial={{ opacity: 0, rotateY: -15, scale: 0.9 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
      <button onClick={onBack} className="storybook-reader__back"><img src={BADGE_ICONS.back} className="icon-img" alt="" /> กลับ</button>

      {showSparkle && (
        <div className="storybook-reader__sparkles" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="storybook-reader__sparkle" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${i * 0.08}s` }}>✨</span>
          ))}
        </div>
      )}

      <div className="storybook-reader__paper" style={{ background: colors.paper }}>
        <h3 className="storybook-reader__paper-title" style={{ color: colors.ink }}>{entry.title}</h3>
        <p className="storybook-reader__paper-text" style={{ color: colors.ink }}>
          {displayedText}
          {!isDone && <span className="storybook-reader__caret" style={{ background: colors.ink }} />}
        </p>
      </div>

      <div className="storybook-reader__toolbar">
        <div className="storybook-reader__toggle">
          <button className={viewMode === 'original' ? 'storybook-reader__toggle-btn storybook-reader__toggle-btn--active' : 'storybook-reader__toggle-btn'} onClick={() => setViewMode('original')}>ต้นฉบับ</button>
          <button className={viewMode === 'reframed' ? 'storybook-reader__toggle-btn storybook-reader__toggle-btn--active' : 'storybook-reader__toggle-btn'} onClick={() => setViewMode('reframed')}>AI สรุปใหม่</button>
        </div>
        <button className="storybook-reader__share-btn" style={{ background: `linear-gradient(135deg, ${colors.gold}, ${accent})` }} onClick={handleShare}>📤 แชร์</button>
      </div>

      <style>{`
        .storybook-reader { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 14px; position: relative; }
        .storybook-reader__back { align-self: flex-start; background: none; border: none; color: var(--fixed-white); font-size: 13px; cursor: pointer; opacity: .8; }

        .storybook-reader__sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
        .storybook-reader__sparkle { position: absolute; top: -10px; font-size: 18px; animation: storybookSparkleFall 1.3s ease-in both; }
        @keyframes storybookSparkleFall { 0% { opacity: 0; transform: translateY(-10px) scale(.5); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(220px) scale(1.1); } }

        .storybook-reader__paper { border-radius: 12px; padding: 26px 24px; box-shadow: 0 24px 60px var(--glass-b-45); min-height: 200px; }
        .storybook-reader__paper-title { font-family: 'Fredoka One'; font-size: 16px; margin-bottom: 12px; }
        .storybook-reader__paper-text { font-family: Georgia, serif; font-size: 14px; line-height: 1.85; white-space: pre-wrap; }
        .storybook-reader__caret { display: inline-block; width: 2px; height: 15px; margin-left: 2px; vertical-align: middle; animation: storybookCaretBlink .9s step-end infinite; }
        @keyframes storybookCaretBlink { 50% { opacity: 0; } }

        .storybook-reader__toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .storybook-reader__toggle { display: flex; background: var(--glass-w-10); border-radius: 99px; padding: 4px; gap: 2px; }
        .storybook-reader__toggle-btn { padding: 7px 14px; border: none; border-radius: 99px; background: transparent; color: var(--glass-w-65); font-size: 11.5px; font-weight: 700; cursor: pointer; }
        .storybook-reader__toggle-btn--active {
  background: var(--glass-w-90);
  --lc-text-4: #2D2013;
  color: var(--lc-text-4);
}
        .storybook-reader__share-btn {
  padding: 9px 18px;
  border: none;
  border-radius: 99px;
  --lc-text-3: #3A2400;
  color: var(--lc-text-3);
  font-family: 'Fredoka One';
  font-size: 12.5px;
  cursor: pointer;
}

        @media (prefers-reduced-motion: reduce) {
          .storybook-reader__sparkle, .storybook-reader__caret { animation: none; }
        }
      `}</style>
    </motion.div>
  )
}