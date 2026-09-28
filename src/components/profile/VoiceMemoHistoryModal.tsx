import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BrainDumpRecord } from '../../types.mental'
import { getBrainDumpSessions } from '../../services/api/brainDump.api'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { BADGE_ICONS } from '../../config/iconAssets'
import '../leaderboard/leaderboardRow.css'

interface VoiceMemoHistoryModalProps {
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
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} นาที ${s} วิ` : `${s} วินาที`
}

/**
 * VoiceMemoHistoryModal — ประวัติเควส "เทกระเป๋าความจำผ่านเสียง" (หน้าโปรไฟล์ → ประวัติการเขียนบันทึก)
 * [แก้ตามที่ระบุ] หน้าเต็มจอแบบเดียวกับประวัติไดอะรี่ของฉัน — ช่องค้นหา + ตัวกรองเดือน/ปี
 * กากบาทชิดมุมขวาบนสุดของจอทุกขนาดจอ · แต่ละรอบ: หัวข้อ · วันที่ · เวลา · จำได้กี่หัวข้อ · ความยาว
 * แตะเพื่ออ่านสิ่งที่พูดทั้งหมด
 * ข้อมูล: mock = mockDb / live = GET /api/brain-dump/me (ดู services/api/brainDump.api.ts)
 */
export default function VoiceMemoHistoryModal({ onClose }: VoiceMemoHistoryModalProps) {
  useEscapeKey(onClose)
  const [sessions, setSessions] = useState<BrainDumpRecord[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    getBrainDumpSessions()
      .then((rows) => { if (!cancelled) setSessions(rows) })
      .catch(() => { if (!cancelled) setSessions([]) })
    return () => { cancelled = true }
  }, [])

  const availableYears = useMemo(() => {
    const years = new Set((sessions ?? []).map((s) => new Date(s.createdAt).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [sessions])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (sessions ?? [])
      .filter((s) => {
        const d = new Date(s.createdAt)
        const monthOk = monthFilter === 'all' || d.getMonth() === monthFilter
        const yearOk = yearFilter === 'all' || d.getFullYear() === yearFilter
        const searchOk = q === '' || (s.topics.join(' ') + ' ' + s.transcript).toLowerCase().includes(q)
        return monthOk && yearOk && searchOk
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [sessions, monthFilter, yearFilter, searchQuery])

  return createPortal(
    <div className="voice-history" role="dialog" aria-label="ประวัติเทกระเป๋าความจำผ่านเสียง">
      <button className="voice-history__close" onClick={onClose} title="ปิด" aria-label="ปิด">
        <img src={BADGE_ICONS.close} alt="" />
      </button>

      <div className="voice-history__inner">
        <div className="voice-history__top">
          <div className="lb-banner voice-history__banner">ประวัติเทกระเป๋าความจำผ่านเสียง</div>
        </div>

        <div className="voice-history__panel lb-card">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาหัวข้อหรือสิ่งที่พูด..."
            className="voice-history__field"
            aria-label="ค้นหาบันทึกเสียง"
          />
          <div className="voice-history__filters">
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="voice-history__field" aria-label="เดือน">
              <option value="all">ทุกเดือน</option>
              {MONTHS_TH.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="voice-history__field" aria-label="ปี">
              <option value="all">ทุกปี</option>
              {availableYears.map((y) => <option key={y} value={y}>{y + 543}</option>)}
            </select>
          </div>

          <div className="voice-history__list">
            {sessions === null && <p className="voice-history__empty">กำลังโหลด...</p>}
            {sessions?.length === 0 && (
              <p className="voice-history__empty">
                ยังไม่มีบันทึกเสียง — ลองเล่นเควส "เทกระเป๋าความจำผ่านเสียง" ในหมวดการเรียนรู้ดูนะ
              </p>
            )}
            {sessions && sessions.length > 0 && filtered.length === 0 && (
              <p className="voice-history__empty">ไม่พบบันทึกเสียงในช่วงนี้</p>
            )}
            {filtered.map((s) => {
              const open = openId === s.id
              return (
                <button key={s.id} className={`voice-history__item${open ? ' is-open' : ''}`} onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}>
                  <span className="voice-history__item-title">{s.topics.join(' · ') || 'ไม่ได้ระบุหัวข้อ'}</span>
                  <span className="voice-history__item-meta">
                    <span>{formatDate(s.createdAt)}</span>
                    <span>เวลา {formatTime(s.createdAt)}</span>
                    <span>จำได้ {s.recalledTopics.length}/{s.topics.length} หัวข้อ</span>
                    <span>{formatDuration(s.durationSec)}</span>
                  </span>
                  {open && (
                    <span className="voice-history__detail">
                      <span className="voice-history__detail-label">สิ่งที่คุณพูด</span>
                      <span className="voice-history__detail-text">{s.transcript || '—'}</span>
                      {s.missedTopics.length > 0 && (
                        <span className="voice-history__detail-missed">หัวข้อที่ลืม: {s.missedTopics.join(', ')}</span>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        /* เต็มจอแบบหน้าตั้งค่า — หน้าตาเดียวกับประวัติไดอะรี่ของฉัน (JournalHistoryModal.tsx) */
        .voice-history {
          position: fixed; inset: 0; z-index: 900; background: var(--bg);
          overflow-y: auto; scrollbar-width: none; font-family: var(--font-display);
          padding: 26px 16px calc(var(--gpf-safe-bottom, 90px) + 16px);
        }
        .voice-history::-webkit-scrollbar { display: none; }
        [data-theme="dark"] .voice-history { background: var(--g900); }
        /* กากบาทชิดมุมขวาบนสุดของจอเสมอทุกขนาดจอ */
        .voice-history__close { position: fixed; top: 16px; right: 16px; z-index: 2; background: none; border: none; padding: 0; cursor: pointer; }
        .voice-history__close img { width: 36px; height: 36px; object-fit: contain; display: block; }
        .voice-history__inner { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
        .voice-history__top { display: flex; justify-content: center; align-items: center; min-height: 44px; }
        .voice-history__banner { font-size: var(--fs-lg); padding: 8px 26px; max-width: calc(100% - 120px); white-space: normal; text-align: center; }

        .voice-history__panel { padding: 18px; border-radius: 22px; display: flex; flex-direction: column; gap: 12px; }
        .voice-history__field {
          width: 100%; min-height: 44px; padding: 10px 14px; border-radius: 12px; outline: none;
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 60%, transparent);
          background: color-mix(in srgb, var(--fixed-white) 55%, transparent);
          color: var(--lb-card-text); font-family: inherit; font-size: var(--fs-sm);
        }
        [data-theme="dark"] .voice-history__field { background: color-mix(in srgb, var(--g900) 55%, transparent); }
        .voice-history__field::placeholder { color: var(--lb-card-text-sub); opacity: .75; }
        .voice-history__field option { color: var(--n900); background: var(--fixed-white); }
        .voice-history__filters { display: flex; gap: 8px; }

        .voice-history__list { display: flex; flex-direction: column; gap: 10px; }
        .voice-history__empty { text-align: center; color: var(--lb-card-text-sub); font-size: var(--fs-sm); padding: 24px 0; }
        .voice-history__item {
          display: flex; flex-direction: column; gap: 4px; text-align: left; width: 100%; padding: 12px 14px;
          border-radius: 14px; cursor: pointer; font-family: inherit;
          background: color-mix(in srgb, var(--fixed-white) 45%, transparent);
          border: 1.5px solid color-mix(in srgb, var(--lb-gold-edge) 55%, transparent);
          transition: border-color .15s ease;
        }
        [data-theme="dark"] .voice-history__item { background: color-mix(in srgb, var(--g900) 45%, transparent); }
        .voice-history__item:hover, .voice-history__item.is-open { border-color: var(--lb-gold-edge); }
        .voice-history__item-title { font-size: var(--fs-md); color: var(--lb-card-text); }
        .voice-history__item-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: var(--fs-xs); color: var(--lb-card-text-sub); }
        .voice-history__detail {
          display: flex; flex-direction: column; gap: 6px; margin-top: 8px; padding-top: 10px;
          border-top: 1px dashed color-mix(in srgb, var(--lb-gold-edge) 60%, transparent);
        }
        .voice-history__detail-label { font-size: var(--fs-xs); color: var(--lb-card-text-sub); }
        .voice-history__detail-text { font-size: var(--fs-sm); color: var(--lb-card-text); white-space: pre-wrap; line-height: 1.8; }
        .voice-history__detail-missed { font-size: var(--fs-xs); color: var(--lb-card-text-sub); }
      `}</style>
    </div>,
    document.body,
  )
}
