import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { BADGE_ICONS } from '../../config/iconAssets'
import type { PostItData } from '../../types'
import { loadPostItArchive } from '../../utils/postitArchive'
import '../leaderboard/leaderboardRow.css'

interface PostItHistoryModalProps {
  userId: string
  /** โพสอิทที่ยังติดอยู่บนต้นไม้ตอนนี้ — แสดงรวมในประวัติด้วย (ป้าย "ติดอยู่บนต้นไม้") */
  onTreePostIts: PostItData[]
  onClose: () => void
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

interface Row {
  id: string
  content: string
  color: string
  /** วันที่ใช้เรียง/กรอง — วันเขียน (ถ้ารู้) ไม่งั้นวันที่เก็บ */
  date: string | null
  savedAt: string | null
  onTree: boolean
}

/**
 * PostItHistoryModal — [ใหม่ตามที่ระบุ] ประวัติโพสอิท (หน้าโปรไฟล์ → ประวัติการเขียน)
 * หน้าเต็มจอแบบเดียวกับประวัติไดอะรี่/เทกระเป๋าความจำ — ค้นหา + กรองเดือน/ปี + วันที่/เวลา
 * รวมทั้งโพสอิทที่ "เก็บเข้าประวัติ" แล้ว และที่ยังติดอยู่บนต้นไม้
 */
export default function PostItHistoryModal({ userId, onTreePostIts, onClose }: PostItHistoryModalProps) {
  useEscapeKey(onClose)
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const rows = useMemo<Row[]>(() => {
    const archived = loadPostItArchive(userId).map((a) => ({
      id: a.id, content: a.content, color: a.color, date: a.createdAt ?? a.savedAt, savedAt: a.savedAt, onTree: false,
    }))
    const onTree = onTreePostIts.map((p) => ({
      id: p.id, content: p.content, color: p.color, date: p.createdAt ?? null, savedAt: null, onTree: true,
    }))
    return [...onTree, ...archived].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [userId, onTreePostIts])

  const availableYears = useMemo(() => {
    const years = new Set(rows.filter((r) => r.date).map((r) => new Date(r.date as string).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [rows])

  const filtered = rows.filter((r) => {
    const d = r.date ? new Date(r.date) : null
    const monthOk = monthFilter === 'all' || (d !== null && d.getMonth() === monthFilter)
    const yearOk = yearFilter === 'all' || (d !== null && d.getFullYear() === yearFilter)
    const q = searchQuery.trim().toLowerCase()
    return monthOk && yearOk && (q === '' || r.content.toLowerCase().includes(q))
  })

  return createPortal(
    <div className="postit-history" role="dialog" aria-label="ประวัติโพสอิท">
      <button className="postit-history__close" onClick={onClose} title="ปิด" aria-label="ปิด">
        <img src={BADGE_ICONS.close} alt="" />
      </button>
      <div className="postit-history__inner">
        <div className="postit-history__top">
          <div className="lb-banner postit-history__banner">ประวัติโพสอิท</div>
        </div>
        <div className="postit-history__panel lb-card">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาข้อความในโพสอิท..."
            className="postit-history__field"
            aria-label="ค้นหาโพสอิท"
          />
          <div className="postit-history__filters">
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="postit-history__field" aria-label="เดือน">
              <option value="all">ทุกเดือน</option>
              {MONTHS_TH.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="postit-history__field" aria-label="ปี">
              <option value="all">ทุกปี</option>
              {availableYears.map((y) => <option key={y} value={y}>{y + 543}</option>)}
            </select>
          </div>

          <div className="postit-history__list">
            {rows.length === 0 && <p className="postit-history__empty">ยังไม่มีโพสอิท — เขียนความรู้สึกตอนเช็คอินอารมณ์รายวันแล้วจะได้โพสอิทติดบนต้นไม้</p>}
            {rows.length > 0 && filtered.length === 0 && <p className="postit-history__empty">ไม่พบโพสอิทในช่วงนี้</p>}
            {filtered.map((r) => (
              <div key={r.id} className="postit-history__item">
                <div className="postit-history__note" style={{ background: r.color }}>"{r.content}"</div>
                <div className="postit-history__meta">
                  {r.date ? <span>{formatDate(r.date)} · {formatTime(r.date)}</span> : <span>ไม่ทราบวันที่</span>}
                  <span className={`postit-history__tag${r.onTree ? ' is-tree' : ''}`}>
                    {r.onTree ? 'ติดอยู่บนต้นไม้' : `เก็บแล้ว${r.savedAt ? ` ${formatDate(r.savedAt)}` : ''}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .postit-history {
          position: fixed; inset: 0; z-index: 900; background: var(--bg);
          overflow-y: auto; scrollbar-width: none; font-family: var(--font-display);
          padding: 26px 16px calc(var(--gpf-safe-bottom, 90px) + 16px);
        }
        .postit-history::-webkit-scrollbar { display: none; }
        [data-theme="dark"] .postit-history { background: var(--g900); }
        .postit-history__close { position: fixed; top: 16px; right: 16px; z-index: 2; background: none; border: none; padding: 0; cursor: pointer; }
        .postit-history__close img { width: 36px; height: 36px; object-fit: contain; display: block; }
        .postit-history__inner { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
        .postit-history__top { display: flex; justify-content: center; align-items: center; min-height: 44px; }
        .postit-history__banner { max-width: calc(100% - 120px); white-space: normal; text-align: center; }
        .postit-history__panel { padding: 18px; border-radius: 22px; display: flex; flex-direction: column; gap: 12px; }
        .postit-history__field {
          width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 12px; outline: none;
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 60%, transparent);
          background: color-mix(in srgb, var(--fixed-white) 55%, transparent);
          color: var(--lb-card-text); font-family: inherit; font-size: var(--fs-sm);
        }
        [data-theme="dark"] .postit-history__field { background: color-mix(in srgb, var(--g900) 55%, transparent); }
        .postit-history__field::placeholder { color: var(--lb-card-text-sub); opacity: .75; }
        .postit-history__field option { color: var(--n900); background: var(--fixed-white); }
        .postit-history__filters { display: flex; gap: 8px; }
        .postit-history__list { display: flex; flex-direction: column; gap: 12px; }
        .postit-history__empty { text-align: center; color: var(--lb-card-text-sub); font-size: var(--fs-sm); padding: 24px 0; line-height: 1.6; }
        .postit-history__item {
          display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 14px;
          background: color-mix(in srgb, var(--fixed-white) 42%, transparent);
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 55%, transparent);
        }
        [data-theme="dark"] .postit-history__item { background: color-mix(in srgb, var(--g900) 45%, transparent); }
        .postit-history__note {
          padding: 12px 14px; border-radius: 6px; font-size: 15px; line-height: 1.7; font-style: italic;
          color: var(--fixed-black); box-shadow: 0 3px 8px var(--glass-b-20); white-space: pre-wrap;
        }
        .postit-history__meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: var(--fs-xs); color: var(--lb-card-text-sub); }
        .postit-history__tag {
          padding: 2px 10px; border-radius: 99px; border: 1px solid color-mix(in srgb, var(--lb-gold-edge) 60%, transparent);
          color: var(--lb-card-text);
        }
        .postit-history__tag.is-tree { background: var(--lb-btn-bg); color: var(--lb-btn-text); }
      `}</style>
    </div>,
    document.body,
  )
}
