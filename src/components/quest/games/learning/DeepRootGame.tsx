import { useEffect, useRef, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { playSfx } from '../../../../utils/audioPlayer'
import '../games.css'

/*  เควส The Deep Root (หยั่งรากลึก / โหมดจดจ่อ)
    ทฤษฎี: 90/20 Rule · Ultradian Rhythms (Psomas, 2021)
    ─────────────────────────────────────────────────────────────
    สมองคงสมาธิระดับสูงได้ ~90 นาที ก่อนพลังงานระดับเซลล์จะลด จึงต้องพัก 15-20 นาที
    เกมนี้บังคับตามทฤษฎีจริง 2 อย่าง:
      • ต้องโฟกัสครบ 90 นาทีก่อน จึงจะข้ามไปช่วงพักได้ (กดจบก่อนไม่ได้)
      • ทุกครั้งที่สลับแท็บ/ย่อหน้าต่าง = นับเป็น "วอกแวก" 1 ครั้ง และหยุดนับเวลาให้
    เวลาที่โฟกัสได้จริงจะถูกส่งเข้า addFocusMinutes() เพื่อให้เควส Guardian of Rest
    (โควตา 4-5 ชม./วัน) รู้ว่าวันนี้ฝึกหนักไปแค่ไหนแล้ว

    ปรับเวลาได้ที่ 2 ค่าคงที่ด้านล่างนี้                                          */

const FOCUS_MINUTES = 90
const BREAK_MINUTES = 15

type Phase = 'idle' | 'focus' | 'break' | 'done'

export default function DeepRootGame({ finish, strictMode, skip }: QuestGameProps) {
  const { logActivity, addFocusMinutes, settings } = useAppContext()
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(FOCUS_MINUTES * 60)
  const [distractions, setDistractions] = useState(0)
  const [paused, setPaused] = useState(false)
  const focusSecondsRef = useRef(0)

  const total = (phase === 'break' ? BREAK_MINUTES : FOCUS_MINUTES) * 60

  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') return
    const onHidden = () => {
      if (document.hidden) {
        setPaused(true)
        if (phase === 'focus') setDistractions((d) => d + 1)
      } else {
        setPaused(false)
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [phase])

  useEffect(() => {
    if ((phase !== 'focus' && phase !== 'break') || paused) return
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (phase === 'focus') focusSecondsRef.current += 1
        if (s <= 1) {
          window.clearInterval(id)
          playSfx('SPARKLE_CHIME', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
          if (phase === 'focus') {
            addFocusMinutes(FOCUS_MINUTES)
            setPhase('break')
            return BREAK_MINUTES * 60
          }
          setPhase('done')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, paused, addFocusMinutes, settings.sfxVolume, settings.soundEnabled])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const pct = total > 0 ? (total - seconds) / total : 0
  const circumference = 2 * Math.PI * 44

  const handleFinish = () => {
    logActivity({
      activityType: 'DEEP_WORK',
      durationSeconds: focusSecondsRef.current,
      meta: { focusMinutes: FOCUS_MINUTES, breakMinutes: BREAK_MINUTES, distractions },
    })
    finish({ focusMinutes: FOCUS_MINUTES, distractions })
  }

  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] ข้ามตัวจับเวลากลางคัน จบทันทีด้วยรางวัลครึ่งเดียว
   *  (เฉพาะโหมดปกติ — ปุ่มนี้จะไม่ถูกเรนเดอร์เลยเมื่อ strictMode === true) */
  const handleSkip = () => {
    logActivity({
      activityType: 'DEEP_WORK',
      durationSeconds: focusSecondsRef.current,
      meta: { focusMinutes: FOCUS_MINUTES, breakMinutes: BREAK_MINUTES, distractions, skipped: true },
    })
    skip({ focusMinutes: Math.round(focusSecondsRef.current / 60), distractions })
  }

  return (
    <div className="qg qg-center">
      <div className="qg-row" style={{ justifyContent: 'center' }}>
        <span className={`qg-tag${phase === 'break' ? ' qg-tag--ok' : ''}`}>
          {phase === 'idle' && 'พร้อมเริ่มรอบจดจ่อ 90 นาที'}
          {phase === 'focus' && '🌿 กำลังหยั่งราก — ห้ามวอกแวก'}
          {phase === 'break' && '☕ ช่วงพักสมอง 15 นาที — ห้ามเล่นมือถือ'}
          {phase === 'done' && '✅ ครบวงจร 90/15 แล้ว'}
        </span>
      </div>

      <div className="qg-ring-wrap">
        <svg viewBox="0 0 100 100" className="qg-ring">
          <circle cx="50" cy="50" r="44" className="qg-ring__track" />
          <circle
            cx="50" cy="50" r="44" className="qg-ring__fill"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
          />
        </svg>
        <div className="qg-ring__center">
          <div className="qg-ring__value">{mm}:{ss}</div>
          <div className="qg-ring__label">{phase === 'break' ? 'เวลาพัก' : 'เวลาจดจ่อ'}</div>
        </div>
      </div>

      {paused && <span className="qg-tag qg-tag--warn">หยุดนับไว้แล้ว — กลับมาที่หน้าต่างนี้เพื่อทำต่อ</span>}
      {distractions > 0 && (
        <span className="qg-tag qg-tag--warn">วอกแวกไป {distractions} ครั้ง (สลับแท็บ)</span>
      )}

      {phase === 'idle' && (
        <button className="qg-btn" onClick={() => { setPhase('focus'); setSeconds(FOCUS_MINUTES * 60) }}>
          เริ่มจดจ่อ 90 นาที
        </button>
      )}
      {phase === 'break' && (
        <p className="qg-hint">พักสมองจริงๆ นะ — หลับตา ยืดเส้น หรือเดินเล่น การพักคือส่วนหนึ่งของการฝึก</p>
      )}
      {phase === 'done' && (
        <button className="qg-btn" onClick={handleFinish}>เสร็จสิ้น รดน้ำลำต้น</button>
      )}

      {(phase === 'focus' || phase === 'break') && !strictMode && (
        <button className="qg-btn qg-btn--ghost" onClick={handleSkip}>
          ข้ามตัวจับเวลา (ได้รางวัลครึ่งเดียว)
        </button>
      )}
    </div>
  )
}