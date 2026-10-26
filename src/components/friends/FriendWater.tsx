import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BADGE_ICONS } from '../../config/iconAssets'
import { useFriendWater } from '../../hooks/useFriendWater'
import type { FriendWaterSummary, WaterStatus } from '../../utils/friendWater'
import './FriendWater.css'

/*============================================================================*\
  FriendWater — [ใหม่ตามที่ระบุ] รดน้ำต้นไม้ให้เพื่อน (คล้ายระบบเติมไฟ — กติกาที่ utils/friendWater.ts)
  ────────────────────────────────────────────────────────────────────────────
  - WaterDropButton: ปุ่มหยดน้ำใต้ปุ่มข้อมูลต้นไม้ (หน้าดูต้นไม้เพื่อน) + ตัวเลขจำนวนวันใต้หยดน้ำ
      ฟ้าเต็ม = วันนี้รดครบทั้งคู่ · ฟ้าครึ่ง = เรารดแล้ว รอเพื่อน · เทา = วันนี้ยังไม่รด
      ดับ (กู้คืนได้) = เลยเที่ยงคืนไป 1 วันที่ไม่ครบคู่ · หายถาวร = ขาดครบ 2 วัน
  - FriendWaterCan: บัวรดน้ำเหนือต้นไม้เพื่อน — แตะบัว = รดน้ำ
  - RecoverWaterPopup: ป็อบอัพกู้คืนหยดน้ำ (กดหยดน้ำตอนดับ)
  - AddFriendButton: ยังไม่เป็นเพื่อน → ปุ่มเพิ่มเพื่อนแทนปุ่มหยดน้ำ
  - WaterStreakBadge: หยดน้ำ+จำนวนวันข้างชื่อในห้องแชท — แตะดูสถานะ + ปุ่มรดน้ำต้นไม้ (พาไปหน้าต้นไม้เพื่อน)
  - WaterStreakChip: หยดน้ำ+จำนวนวันท้ายแถวในรายชื่อแชท (เฉพาะคนที่เคยรดน้ำให้)
\*============================================================================*/

const STATUS_LABEL: Record<WaterStatus, string> = {
  none: 'ยังไม่ได้รดน้ำให้กัน',
  full: 'วันนี้รดน้ำให้กันครบแล้ว',
  half: 'คุณรดน้ำแล้ว รอเพื่อนรดกลับก่อนเที่ยงคืน',
  grey: 'วันนี้ยังไม่ได้รดน้ำให้กัน',
  broken: 'หยดน้ำดับแล้ว! กู้คืนได้ภายในวันนี้',
  dead: 'หยดน้ำหายไปแล้ว เริ่มรดน้ำให้กันใหม่ได้เลย',
}

/** หยดน้ำ SVG — ชั้นเทาด้านล่าง ชั้นฟ้าทับ (ครึ่ง = ตัดเหลือครึ่งล่าง) */
export function WaterDrop({ status, size = 40 }: { status: WaterStatus; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const body = 'M20 3 C20 3 5 20 5 30 A15 15 0 0 0 35 30 C35 20 20 3 20 3 Z'
  return (
    <svg viewBox="0 0 40 48" width={size} height={size * 1.2} className={`fw-drop fw-drop--${status}`} aria-hidden="true">
      <defs>
        <linearGradient id={`fwb-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#9be3ff" />
          <stop offset="1" stopColor="#2f8fe8" />
        </linearGradient>
        <linearGradient id={`fwg-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#d4d9de" />
          <stop offset="1" stopColor="#8b939c" />
        </linearGradient>
        <clipPath id={`fwc-${uid}`}>
          <rect className="fw-drop__level" x="0" y={status === 'half' ? 25 : 0} width="40" height="48" />
        </clipPath>
      </defs>
      <path d={body} fill={`url(#fwg-${uid})`} stroke="#6d757e" strokeWidth="2.4" strokeLinejoin="round" />
      <path
        className="fw-drop__blue"
        d={body}
        fill={`url(#fwb-${uid})`}
        stroke="#1f6fb8"
        strokeWidth="2.4"
        strokeLinejoin="round"
        clipPath={`url(#fwc-${uid})`}
      />
      {status === 'half' && <path d="M5.5 25 Q12.5 22.5 20 25 T34.5 25" fill="none" stroke="#e9f8ff" strokeWidth="1.6" opacity="0.9" />}
      {status === 'broken' && <path d="M21 14 L17 23 L23 27 L18 37" fill="none" stroke="#5d656e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      <ellipse cx="13.5" cy="27" rx="3.2" ry="5.5" fill="#fff" opacity="0.7" transform="rotate(20 13.5 27)" />
      <circle cx="14" cy="36" r="1.8" fill="#fff" opacity="0.55" />
    </svg>
  )
}

interface WaterDropButtonProps {
  summary: FriendWaterSummary | null
  friendName: string
  onClick: () => void
  /** เปลี่ยนค่า = เล่นเอฟเฟกต์ประกายฟ้า + หยดน้ำเด้ง (รดครบทั้งคู่) */
  celebrateKey: number
}

export function WaterDropButton({ summary, friendName, onClick, celebrateKey }: WaterDropButtonProps) {
  const status = summary?.status ?? 'none'
  const streak = summary?.streak ?? 0
  const label = `${STATUS_LABEL[status]} · รดน้ำให้ ${friendName} ต่อเนื่อง ${streak} วัน`
  return (
    <button type="button" className="game-icon-btn fw-button" onClick={onClick} title={label} aria-label={label}>
      <span key={celebrateKey} className={`fw-button__drop${celebrateKey ? ' fw-button__drop--celebrate' : ''}`}>
        <WaterDrop status={status} size={38} />
        {celebrateKey > 0 && (
          <span className="fw-sparkle" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${i * 36}deg`, ['--d' as string]: `${(i % 3) * 60}ms` }} />)}
            <b />
          </span>
        )}
      </span>
      <span className={`fw-count fw-count--${status}`}>{streak}</span>
    </button>
  )
}

interface FriendWaterCanProps {
  open: boolean
  /** แตะบัว — คืน true เมื่อรดสำเร็จ (เล่นแอนิเมชันเทน้ำ) */
  onPour: () => Promise<boolean>
  /** เทน้ำจบ (ปิดบัว) */
  onDone: (poured: boolean) => void
}

/** ระยะเวลาเทน้ำก่อนปิดบัว */
const POUR_MS = 1500

export function FriendWaterCan({ open, onPour, onDone }: FriendWaterCanProps) {
  const [pouring, setPouring] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (pouring) return
    setPouring(true)
    const ok = await onPour()
    if (!ok) { setPouring(false); onDone(false); return }
    timer.current = window.setTimeout(() => { setPouring(false); onDone(true) }, POUR_MS)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.button
          type="button"
          className={`fw-can${pouring ? ' fw-can--pouring' : ''}`}
          onClick={handleClick}
          aria-label="บัวรดน้ำ — แตะเพื่อรดน้ำให้ต้นไม้ของเพื่อน"
          initial={{ opacity: 0, y: -30, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <img src={BADGE_ICONS.wateringCan} alt="" className="fw-can__img" draggable={false} />
          {pouring && (
            <span className="fw-can__drops" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <img key={i} src={BADGE_ICONS.water} alt="" className="fw-can__drop" style={{ left: `${(i % 3) * 8 - 8}px`, animationDelay: `${0.25 + i * 0.11}s` }} />
              ))}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

interface RecoverWaterPopupProps {
  open: boolean
  friendName: string
  streak: number
  onRecover: () => void
  onClose: () => void
}

/** ป็อบอัพกู้คืนหยดน้ำ — กดกู้คืน = รดน้ำตามปกติของวันนี้ แล้วตัวเลขเดิมนับต่อ */
export function RecoverWaterPopup({ open, friendName, streak, onRecover, onClose }: RecoverWaterPopupProps) {
  if (!open) return null
  return (
    <div className="fw-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fw-modal" role="dialog" aria-modal="true" aria-labelledby="fw-recover-title">
        <WaterDrop status="broken" size={56} />
        <h3 id="fw-recover-title">กู้คืนหยดน้ำ</h3>
        <p>คุณกับ <b>{friendName}</b> เติมหยดน้ำให้กันมา <b>{streak} วัน</b></p>
        <p className="fw-modal__warn">หากไม่กู้คืนภายในวันนี้ หยดน้ำจะหายไป และต้องเริ่มนับใหม่ตั้งแต่ 0</p>
        <div className="fw-modal__actions">
          <button type="button" className="fw-modal__primary" onClick={onRecover}>💧 กู้คืน</button>
          <button type="button" className="fw-modal__ghost" onClick={onClose}>ไว้ทีหลัง</button>
        </div>
      </div>
    </div>
  )
}

/** ยังไม่เป็นเพื่อน → ปุ่มเพิ่มเพื่อน (ติดตาม — เป็นเพื่อนเมื่อติดตามกันทั้งสองฝ่าย) */
export function AddFriendButton({ requested, onClick, friendName }: { requested: boolean; onClick: () => void; friendName: string }) {
  const label = requested ? `ส่งคำขอเป็นเพื่อนถึง ${friendName} แล้ว รอติดตามกลับ` : `เพิ่ม ${friendName} เป็นเพื่อน`
  return (
    <button type="button" className={`fw-add-friend${requested ? ' fw-add-friend--sent' : ''}`} onClick={onClick} title={label} aria-label={label}>
      {/* [แก้ตามที่ระบุ] ไอคอนคน+ วาดด้วย SVG ในวงกลม + ป้ายชื่อบรรทัดเดียว (เดิมสระ/วรรณยุกต์ซ้อนกันตอนขึ้นบรรทัดใหม่) */}
      <span className="fw-add-friend__icon" aria-hidden="true">
        {requested ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9.5" cy="8" r="3.6" />
            <path d="M3 19.5c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
            <path d="M19 7.5v6M16 10.5h6" />
          </svg>
        )}
      </span>
      <span className="fw-add-friend__label">{requested ? 'รอตอบรับ' : 'เพิ่มเพื่อน'}</span>
    </button>
  )
}

/** หยดน้ำ+จำนวนวันข้างชื่อในห้องแชท + แผงสถานะ (ปุ่มรดน้ำต้นไม้/กู้คืน → หน้าต้นไม้เพื่อน) */
export function WaterStreakBadge({ friendId, friendName, onWater }: { friendId: string; friendName: string; onWater: () => void }) {
  const { summary } = useFriendWater(friendId)
  const [open, setOpen] = useState(false)
  const status = summary?.status ?? 'none'
  const streak = summary?.streak ?? 0
  const needsRecover = status === 'broken'
  const since = summary?.streakStartedOn
    ? new Date(`${summary.streakStartedOn}T12:00:00+07:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="fw-badge-wrap">
      <button
        type="button"
        className={`fw-badge${needsRecover ? ' fw-badge--recover' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`รดน้ำให้กันกับ ${friendName} ต่อเนื่อง ${streak} วัน`}
        title="ดูการรดน้ำให้กัน"
      >
        <WaterDrop status={status} size={18} />
        <span className={`fw-count fw-count--${status}`}>{streak}</span>
        {needsRecover && <span className="fw-badge__recover">กู้คืนหยดน้ำ</span>}
      </button>
      {open && (
        <div className="fw-stats" role="dialog" aria-label="การรดน้ำให้กัน">
          <div className="fw-stats__head">
            <WaterDrop status={status} size={28} />
            <div>
              <b>รดน้ำให้กันต่อเนื่อง {streak} วัน</b>
              <span>{since ? `ตั้งแต่ ${since}` : STATUS_LABEL[status]}</span>
            </div>
          </div>
          <ul className="fw-stats__rows">
            <li><span>วันนี้</span><b>{summary?.wateredToday ? 'คุณรดแล้ว' : 'คุณยังไม่รด'} · {summary?.friendWateredToday ? 'เพื่อนรดแล้ว' : 'เพื่อนยังไม่รด'}</b></li>
          </ul>
          {since && <p className="fw-stats__note">{STATUS_LABEL[status]}</p>}
          <button type="button" className="fw-stats__water" onClick={() => { setOpen(false); onWater() }}>
            💧 {needsRecover ? 'กู้คืนหยดน้ำ' : 'รดน้ำต้นไม้'}
          </button>
        </div>
      )}
    </div>
  )
}

/** หยดน้ำ+จำนวนวันท้ายแถวรายชื่อแชท — เฉพาะเพื่อนที่เราเคยรดน้ำให้ */
export function WaterStreakChip({ friendId }: { friendId: string }) {
  const { summary } = useFriendWater(friendId)
  if (!summary || summary.myTotal === 0) return null
  const recover = summary.status === 'broken'
  return (
    <span className={`fw-chip${recover ? ' fw-chip--recover' : ''}`} title={STATUS_LABEL[summary.status]}>
      <WaterDrop status={summary.status} size={14} />
      <span className={`fw-count fw-count--${summary.status}`}>{summary.streak}</span>
      {recover && <span className="fw-chip__recover">กู้คืนหยดน้ำ</span>}
    </span>
  )
}
