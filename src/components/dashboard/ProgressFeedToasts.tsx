import { useEffect } from 'react'
import type { ProgressEvent } from '../../services/api/activity.api'
import { useLanguage } from '../../context/LanguageContext'
import { Z_INDEX } from '../../config/zIndex'
import { describeProgressEventView } from '../../utils/progressEventText'
import { uiSounds } from '../../utils/uiSounds'

/*============================================================================*\
  ProgressFeedToasts — ข่าวเพื่อน (ทำภารกิจสำเร็จ / เลเวลอัป / ปลดล็อกไอเทมให้เรา) "ทีละอัน"
  ────────────────────────────────────────────────────────────────────────────
  - แถบกึ่งกลางจอ เหนือต้นไม้ (ใต้ HUD) พื้นดำโปร่งแสงจางหายทั้งขอบซ้าย-ขวา
  - ตัวอักษรวิ่งช้าๆ จากขวาไปซ้าย (marquee) ให้อ่านทัน — ความเร็วคงที่ ข้อความยาววิ่งนานขึ้นตามความยาว
    วิ่งพ้นขอบซ้ายแล้ว → แถบจางหาย → ข่าวถัดไปขึ้นต่อ
  - เสียง "ปริ๊ง-ปริ๊ง" ตอนเด้งขึ้น (uiSounds.chime — ปิดตามการตั้งค่าเสียงอัตโนมัติ)
  - ไม่ใช่ modal: ไม่บล็อกการกด กดที่แถบ = ปิดก่อนเวลา · ไม่บันทึกลงแผงแจ้งเตือน
\*============================================================================*/

/** ความเร็ววิ่งของตัวอักษร (ms ต่อ 1 ตัวอักษร) — ช้าพอให้อ่านทัน */
const MS_PER_CHAR = 210
const MIN_RUN_MS = 9_000
const MAX_RUN_MS = 24_000
const FADE_MS = 500

function ToastItem({ event, onDismiss, soundEnabled }: { event: ProgressEvent; onDismiss: (id: string) => void; soundEnabled: boolean }) {
  const { tv, language } = useLanguage()
  const { lead, parts, text } = describeProgressEventView(event, tv, language)
  const runMs = Math.min(MAX_RUN_MS, Math.max(MIN_RUN_MS, text.length * MS_PER_CHAR))

  useEffect(() => {
    if (soundEnabled) uiSounds.chime()
    // สำรองไว้เผื่อ animationend ไม่ยิง (แท็บถูกซ่อน/ปิดแอนิเมชัน)
    const id = window.setTimeout(() => onDismiss(event.id), runMs + FADE_MS + 600)
    return () => window.clearTimeout(id)
  }, [event.id, onDismiss, soundEnabled, runMs])

  return (
    <button
      type="button"
      className={`progress-feed-toast progress-feed-toast--${event.type.toLowerCase()}`}
      style={{ ['--run-ms' as string]: `${runMs}ms` }}
      onClick={() => onDismiss(event.id)}
      onAnimationEnd={(e) => { if (e.animationName === 'progressFeedOut') onDismiss(event.id) }}
      aria-label={text}
    >
      <span className="progress-feed-toast__track" aria-hidden="true">
        <span className="progress-feed-toast__run">
          {/* [แก้ตามที่ระบุ] รูปนำหน้า + รูปของเควส/ไอเทมในข้อความ — ไม่ใช้อีโมจิ */}
          <img src={lead} alt="" className="progress-feed-toast__icon" />
          {parts.map((p, i) => (typeof p === 'string'
            ? <span key={i}>{p}</span>
            : <img key={i} src={p.img} alt="" className="progress-feed-toast__inline-img" />))}
        </span>
      </span>
    </button>
  )
}

interface ProgressFeedToastsProps {
  current: ProgressEvent | null
  onDismiss: (id: string) => void
  soundEnabled: boolean
}

export default function ProgressFeedToasts({ current, onDismiss, soundEnabled }: ProgressFeedToastsProps) {
  if (!current) return null
  return (
    <div className="progress-feed" role="status" aria-live="polite" style={{ zIndex: Z_INDEX.floatingChrome + 10 }}>
      {/* key = id → ข่าวใหม่ remount แอนิเมชันเริ่มใหม่ทุกครั้ง */}
      <ToastItem key={current.id} event={current} onDismiss={onDismiss} soundEnabled={soundEnabled} />
      <style>{`
        .progress-feed {
          position: fixed; left: 0; right: 0; top: calc(var(--hud-h, 64px) + 14px);
          display: flex; justify-content: center; padding: 0 8px; pointer-events: none;
        }
        .progress-feed-toast {
          pointer-events: auto; display: block; width: min(560px, 100%); min-height: 44px;
          padding: 11px 0; cursor: pointer; border: none; border-radius: 0;
          /* ขอบซ้าย-ขวาจางหาย: ทึบช่วงกลาง โปร่งใสที่ปลายทั้งสองด้าน */
          background: linear-gradient(90deg, rgba(10, 12, 14, 0) 0%, rgba(10, 12, 14, .62) 20%, rgba(10, 12, 14, .62) 80%, rgba(10, 12, 14, 0) 100%);
          color: #fff; text-shadow: 0 1px 3px rgba(0, 0, 0, .45);
          font-family: var(--font-display); font-size: 15px; line-height: 1.35;
          animation: progressFeedIn .35s ease-out both, progressFeedOut ${FADE_MS}ms ease-in var(--run-ms) forwards;
        }
        .progress-feed-toast--item_unlocked { color: #ffe08a; }
        /* ช่องวิ่ง: ตัวอักษรจางเข้า/ออกที่ขอบ ไม่ตัดขาดห้วนๆ */
        .progress-feed-toast__track {
          display: block; overflow: hidden; white-space: nowrap;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
        }
        /* padding-left: 100% (ของช่อง) = เริ่มที่ขอบขวา · translateX(-100%) (ของตัวเอง) = วิ่งจนพ้นขอบซ้าย */
        .progress-feed-toast__run {
          display: inline-block; padding-left: 100%;
          animation: progressFeedMarquee var(--run-ms) linear forwards;
        }
        .progress-feed-toast__icon { width: 34px; height: 34px; object-fit: contain; margin: -8px 8px -8px 0; vertical-align: middle; }
        .progress-feed-toast__inline-img { width: 28px; height: 28px; object-fit: contain; margin: -6px 2px; vertical-align: middle; }
        @keyframes progressFeedMarquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes progressFeedIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes progressFeedOut { to { opacity: 0; } }
        @media (max-width: 480px) { .progress-feed-toast { font-size: 14px; padding: 9px 0; } }
        @media (max-width: 300px) { .progress-feed-toast { font-size: 12px; padding: 6px 0; } }
        /* ลดการเคลื่อนไหว: ไม่วิ่ง แสดงข้อความนิ่งตรงกลาง (ตัดบรรทัดได้) แล้วจางออก */
        @media (prefers-reduced-motion: reduce) {
          .progress-feed-toast__track { white-space: normal; text-align: center; padding: 0 40px; -webkit-mask-image: none; mask-image: none; }
          .progress-feed-toast__run { padding-left: 0; animation: none; }
        }
      `}</style>
    </div>
  )
}
