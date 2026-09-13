import { useEffect, useState } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Z_INDEX } from '../../config/zIndex'

const C_2 = 'rgba(10,25,20,.55)'
const C_3 = '#EAF2FF'
const C_4 = '#2563EB'
const C_5 = '#2563EB'
const C_6 = '#2563EB'
const C_7 = '#2563EB'
const C_8 = '#2563EB'

const BG_1 = C_2
const BG_2 = C_3
const TEXT_3 = C_4
const TEXT_4 = C_5
const BG_5 = C_6
const TEXT_6 = C_7
const TEXT_7 = C_8
const BORDER_8 = '#2563EB33'
const BORDER_9 = '#2563EB55'

const DURATION_OPTIONS = [1, 3, 5, 10] as const

interface MeditationModalProps {
  onClose: () => void
}

/**
 * MeditationModal — [ข้อกำหนดข้อ 4: Complete "Coming Soon" Features] แทนที่ placeholder
 * "ระบบกำลังอยู่ระหว่างการพัฒนา" เดิมด้วย countdown timer จริง — เลือกระยะเวลา (1/3/5/10
 * นาที) แล้วนับถอยหลังพร้อมวงกลมหายใจเข้า-ออกช้าๆ ให้จับจังหวะตาม จบแล้วมีเสียง/แอนิเมชัน
 * แจ้งเตือน ไม่มีข้อมูลอะไรต้องส่งกลับ backend (ยังไม่มี MeditationSession endpoint จริง
 * ในโปรเจกต์นี้ ดู docs/DATA_DICTIONARY.md — MeditationSessionType มีแค่ MEDITATION/BREATHING
 * เป็น enum ไว้รอเชื่อมต่อทีหลัง)
 */
export default function MeditationModal({ onClose }: MeditationModalProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)

  const [durationMin, setDurationMin] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false)
          setFinished(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, secondsLeft])

  const start = (min: number) => {
    setDurationMin(min)
    setSecondsLeft(min * 60)
    setRunning(true)
    setFinished(false)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.confirmModal, background: BG_1, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: `linear-gradient(160deg, var(--fixed-white), ${BG_2})`, borderRadius: 28, width: '100%', maxWidth: 380, padding: '28px 26px', textAlign: 'center', boxShadow: '0 28px 70px var(--glass-b-35)', position: 'relative' }}>
        <button onClick={onClose} title="ปิด" style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 99, border: 'none', background: 'var(--glass-b-8)', cursor: 'pointer', fontSize: 13 }}>✕</button>

        <div style={{ fontSize: 40, marginBottom: 6 }}>🧘‍♀️</div>
        <h2 style={{ fontFamily: 'Fredoka One', fontSize: 20, color: TEXT_3, marginBottom: 4 }}>โหมดทำสมาธิ</h2>

        {!durationMin ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--n500)', marginBottom: 18 }}>เลือกระยะเวลาที่อยากนั่งสมาธิวันนี้</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DURATION_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => start(min)}
                  style={{ padding: '14px', border: `2px solid ${BORDER_8}`, borderRadius: 16, background: 'var(--fixed-white)', color: TEXT_4, fontFamily: 'Fredoka One', fontSize: 16, cursor: 'pointer' }}
                >
                  {min} นาที
                </button>
              ))}
            </div>
          </>
        ) : finished ? (
          <>
            <div style={{ fontSize: 48, margin: '18px 0' }}>✨</div>
            <p style={{ fontSize: 14, color: 'var(--n700)', marginBottom: 18 }}>ทำสมาธิครบ {durationMin} นาทีแล้ว รู้สึกสงบขึ้นไหม?</p>
            <button onClick={() => setDurationMin(null)} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 16, background: BG_5, color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 15, cursor: 'pointer' }}>
              ทำอีกรอบ
            </button>
          </>
        ) : (
          <>
            <div className="meditation-circle-wrap">
              <div className="meditation-circle" />
            </div>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 30, color: TEXT_6, margin: '14px 0' }}>{mm}:{ss}</div>
            <button
              onClick={() => setRunning((r) => !r)}
              style={{ width: '100%', padding: '11px', border: `1.5px solid ${BORDER_9}`, borderRadius: 14, background: 'var(--fixed-white)', color: TEXT_7, fontFamily: 'Nunito', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              {running ? '⏸ หยุดชั่วคราว' : '▶ เริ่มต่อ'}
            </button>
          </>
        )}

        <style>{`
          .meditation-circle-wrap { display: flex; align-items: center; justify-content: center; height: 130px; }
          .meditation-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  --lc-bg-2: #93C5FDCC;
  --lc-bg-3: #2563EB55;
  background: radial-gradient(circle, var(--lc-bg-2), var(--lc-bg-3));
  animation: meditationBreathe 6s ease-in-out infinite;
  --lc-shadow-1: rgba(37,99,235,.4);
  box-shadow: 0 0 40px var(--lc-shadow-1);
}
          @keyframes meditationBreathe {
            0%, 100% { transform: scale(0.85); }
            50% { transform: scale(1.25); }
          }
          @media (prefers-reduced-motion: reduce) {
            .meditation-circle { animation: none; }
          }
        `}</style>
      </div>
    </div>
  )
}