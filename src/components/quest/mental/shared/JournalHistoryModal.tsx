import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { JournalEntryRecord } from '../../../../types'
import { useTypewriter } from '../../../../hooks/useTypewriter'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import { playSfx, stopSfx } from '../../../../utils/audioPlayer'
import type { ParchmentTheme } from './ParchmentJournalEditor'
import { BADGE_ICONS } from '../../../../config/iconAssets'
import '../../../leaderboard/leaderboardRow.css'

const C_1 = '#C7A34F'
const C_2 = '#F3E6C8'
const C_3 = '#2D2013'
const C_4 = '#FFD166'
const C_5 = '#FFF3D6'
const C_6 = '#4A2C0A'

interface JournalHistoryModalProps {
  theme: ParchmentTheme
  /** สีเน้นเดิมของแต่ละเควส — เก็บไว้ให้ผู้เรียกเดิมไม่ต้องแก้ (หน้าตาใหม่ใช้โทนกระดานจัดอันดับ) */
  accent?: string
  title: string
  entries: JournalEntryRecord[]
  onClose: () => void
}

const THEME_ACCENT: Record<ParchmentTheme, { gold: string; paper: string; ink: string }> = {
  mystic: { gold: C_1, paper: C_2, ink: C_3 },
  golden: { gold: C_4, paper: C_5, ink: C_6 },
}

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`
}

/**
 * JournalHistoryModal — ประวัติบันทึกของ "ไดอะรี่ของฉัน" และ "คำขอบคุณ" (ใช้ร่วมกัน)
 * [แก้ตามที่ระบุ] เปิดเป็นหน้าเต็มจอแบบหน้าตั้งค่า (portal ไปที่ body — เดิมเป็น position:absolute
 * ในกล่องแม่ พอเปิดจากหน้าโปรไฟล์ที่เลื่อนยาวจึงไปโผล่ด้านบนสุดของหน้า มองไม่เห็น = "เปิดไม่ได้")
 * กรอบ/สีแบบกระดานจัดอันดับ มีปุ่มกากบาทปิด แต่ละรายการแสดง ชื่อเรื่อง · วันที่ · เวลา
 * แตะรายการเพื่ออ่านฉบับเต็ม (สลับอ่าน "ต้นฉบับ"/"AI สรุปใหม่" + แชร์ได้)
 */
export default function JournalHistoryModal({ theme, title, entries, onClose }: JournalHistoryModalProps) {
  const colors = THEME_ACCENT[theme]
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [readingEntry, setReadingEntry] = useState<JournalEntryRecord | null>(null)

  useEscapeKey(() => { if (readingEntry) setReadingEntry(null); else onClose() })

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

  return createPortal(
    <div className="journal-history" role="dialog" aria-label={title}>
      <div className="journal-history__inner">
        <div className="journal-history__top">
          <div className="lb-banner journal-history__banner">{title}</div>
          <button onClick={onClose} title="ปิด" aria-label="ปิด" className="journal-history__close">
            <img src={BADGE_ICONS.close} alt="" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!readingEntry ? (
            <motion.div key="list" className="journal-history__panel lb-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเรื่องหรือเนื้อหา..."
                className="journal-history__search-input"
                aria-label="ค้นหาบันทึก"
              />

              <div className="journal-history__filters">
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="journal-history__select" aria-label="เดือน">
                  <option value="all">ทุกเดือน</option>
                  {MONTHS_TH.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="journal-history__select" aria-label="ปี">
                  <option value="all">ทุกปี</option>
                  {availableYears.map((y) => <option key={y} value={y}>{y + 543}</option>)}
                </select>
              </div>

              <div className="journal-history__list">
                {filteredEntries.length === 0 ? (
                  <p className="journal-history__empty">ยังไม่มีบันทึกในช่วงนี้</p>
                ) : (
                  filteredEntries.map((entry) => (
                    <button key={entry.id} className="journal-history__item" onClick={() => { playSfx('CARD_FLIP'); setReadingEntry(entry) }}>
                      <span className="journal-history__item-title">{entry.title || 'บันทึกไม่มีชื่อ'}</span>
                      <span className="journal-history__item-meta">
                        <span>{formatDate(entry.createdAt)}</span>
                        <span>เวลา {formatTime(entry.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <StorybookReader key="reader" colors={colors} entry={readingEntry} onBack={() => setReadingEntry(null)} />
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .journal-history {
          position: fixed; inset: 0; z-index: 900;
          background: var(--bg);
          overflow-y: auto; scrollbar-width: none;
          padding: 26px 16px calc(var(--gpf-safe-bottom, 90px) + 16px);
          font-family: var(--font-display);
        }
        .journal-history::-webkit-scrollbar { display: none; }
        [data-theme="dark"] .journal-history { background: var(--g900); }
        .journal-history__inner { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
        .journal-history__top { position: relative; display: flex; justify-content: center; align-items: center; min-height: 44px; }
        .journal-history__banner { font-size: var(--fs-lg); padding: 8px 26px; max-width: calc(100% - 120px); white-space: normal; text-align: center; }
        /* [แก้ตามที่ระบุ] กากบาทชิดมุมขวาบนสุดของจอเสมอทุกขนาดจอ (ไม่อิงคอลัมน์เนื้อหา 640px) */
        .journal-history__close { position: fixed; top: 16px; right: 16px; z-index: 2; background: none; border: none; padding: 0; cursor: pointer; }
        .journal-history__close img { width: 36px; height: 36px; object-fit: contain; display: block; }

        .journal-history__panel { padding: 18px; border-radius: 22px; display: flex; flex-direction: column; gap: 12px; }
        .journal-history :is(.journal-history__search-input, .journal-history__select) {
          width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 12px; outline: none;
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 60%, transparent);
          background: color-mix(in srgb, var(--fixed-white) 55%, transparent);
          color: var(--lb-card-text); font-family: inherit; font-size: var(--fs-sm);
        }
        [data-theme="dark"] .journal-history :is(.journal-history__search-input, .journal-history__select) { background: color-mix(in srgb, var(--g900) 55%, transparent); }
        .journal-history__search-input::placeholder { color: var(--lb-card-text-sub); opacity: .75; }
        .journal-history__select option { color: var(--n900); background: var(--fixed-white); }
        .journal-history__filters { display: flex; gap: 8px; }

        .journal-history__list { display: flex; flex-direction: column; gap: 10px; }
        .journal-history__empty { text-align: center; color: var(--lb-card-text-sub); font-size: var(--fs-sm); padding: 24px 0; }
        .journal-history__item {
          display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 12px 14px; width: 100%;
          border-radius: 14px; cursor: pointer; font-family: inherit;
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 55%, transparent);
          background: color-mix(in srgb, var(--fixed-white) 45%, transparent);
          transition: transform .15s ease, border-color .15s ease;
        }
        [data-theme="dark"] .journal-history__item { background: color-mix(in srgb, var(--g900) 45%, transparent); }
        .journal-history__item:hover { border-color: var(--lb-gold-edge); transform: translateY(-1px); }
        .journal-history__item-title { font-size: var(--fs-md); color: var(--lb-card-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .journal-history__item-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: var(--fs-xs); color: var(--lb-card-text-sub); }
      `}</style>
    </div>,
    document.body,
  )
}

interface StorybookReaderProps {
  colors: { gold: string; paper: string; ink: string }
  entry: JournalEntryRecord
  onBack: () => void
}

function StorybookReader({ colors, entry, onBack }: StorybookReaderProps) {
  const [viewMode, setViewMode] = useState<'original' | 'reframed'>('reframed')
  const [showSparkle, setShowSparkle] = useState(true)
  const text = viewMode === 'reframed' ? entry.aiReframedText : entry.originalText
  const { displayedText, isDone } = useTypewriter(text, 22, 250, () => playSfx('KEYPRESS'), () => stopSfx('KEYPRESS'))

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
    <motion.div className="storybook-reader lb-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
      {showSparkle && (
        <div className="storybook-reader__sparkles" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="storybook-reader__sparkle" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${i * 0.08}s` }}>✨</span>
          ))}
        </div>
      )}

      <div className="storybook-reader__meta">
        <span>{formatDate(entry.createdAt)}</span>
        <span>เวลา {formatTime(entry.createdAt)}</span>
      </div>

      <div className="storybook-reader__paper" style={{ background: colors.paper }}>
        <h3 className="storybook-reader__paper-title" style={{ color: colors.ink }}>{entry.title}</h3>
        <p className="storybook-reader__paper-text" style={{ color: colors.ink }}>
          {displayedText}
          {!isDone && <span className="storybook-reader__caret" style={{ background: colors.ink }} />}
        </p>
      </div>

      <div className="storybook-reader__toggle" role="tablist">
        <button role="tab" aria-selected={viewMode === 'original'} className={viewMode === 'original' ? 'storybook-reader__toggle-btn storybook-reader__toggle-btn--active' : 'storybook-reader__toggle-btn'} onClick={() => setViewMode('original')}>ต้นฉบับ</button>
        <button role="tab" aria-selected={viewMode === 'reframed'} className={viewMode === 'reframed' ? 'storybook-reader__toggle-btn storybook-reader__toggle-btn--active' : 'storybook-reader__toggle-btn'} onClick={() => setViewMode('reframed')}>AI สรุปใหม่</button>
      </div>

      <div className="storybook-reader__actions">
        <button className="lb-btn lb-btn--ghost" onClick={onBack}>กลับไปรายการ</button>
        <button className="lb-btn" onClick={handleShare}>แชร์</button>
      </div>

      <style>{`
        .storybook-reader { width: 100%; display: flex; flex-direction: column; gap: 14px; position: relative; padding: 18px; border-radius: 22px; }
        .storybook-reader__meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: var(--fs-sm); color: var(--lb-card-text-sub); }

        .storybook-reader__sparkles { position: absolute; inset: 0; pointer-events: none; z-index: 2; overflow: hidden; }
        .storybook-reader__sparkle { position: absolute; top: -10px; font-size: 18px; animation: storybookSparkleFall 1.3s ease-in both; }
        @keyframes storybookSparkleFall { 0% { opacity: 0; transform: translateY(-10px) scale(.5); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(220px) scale(1.1); } }

        .storybook-reader__paper { border-radius: 12px; padding: 26px 24px; box-shadow: 0 10px 30px var(--glass-b-25); min-height: 42vh; border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 60%, transparent); }
        .storybook-reader__paper-title { font-family: var(--font-display); font-size: var(--fs-lg); margin-bottom: 12px; }
        .storybook-reader__paper-text { font-family: Georgia, var(--font-display), serif; font-size: 16px; line-height: 1.9; white-space: pre-wrap; }
        .storybook-reader__caret { display: inline-block; width: 2px; height: 15px; margin-left: 2px; vertical-align: middle; animation: storybookCaretBlink .9s step-end infinite; }
        @keyframes storybookCaretBlink { 50% { opacity: 0; } }

        .storybook-reader__toggle {
          display: flex; align-self: center; gap: 4px; padding: 4px; border-radius: 99px;
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 55%, transparent);
          background: color-mix(in srgb, var(--fixed-white) 40%, transparent);
        }
        [data-theme="dark"] .storybook-reader__toggle { background: color-mix(in srgb, var(--g900) 45%, transparent); }
        .storybook-reader__toggle-btn { min-height: 38px; padding: 7px 18px; border: none; border-radius: 99px; background: transparent; color: var(--lb-card-text-sub); font-family: inherit; font-size: var(--fs-sm); cursor: pointer; }
        .storybook-reader__toggle-btn--active { background: var(--lb-btn-bg); color: var(--lb-btn-text); }
        .storybook-reader__actions { display: flex; gap: 12px; }
        .storybook-reader__actions .lb-btn { flex: 1; }

        @media (prefers-reduced-motion: reduce) {
          .storybook-reader__sparkle, .storybook-reader__caret { animation: none; }
        }
      `}</style>
    </motion.div>
  )
}
