import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { playSfx } from '../../../../utils/audioPlayer'
import { learningRoundState } from '../../../../utils/questCompletion'
import { claimDeepRootBonus, localDateKey, type BonusRollResult } from '../../../../services/api/progression.api'
import { queryKeys } from '../../../../services/queryKeys'
import { BADGE_ICONS } from '../../../../config/iconAssets'
import { exchangeCardLabel } from '../../../../config/exchangeItems'
import RestReminderPopup, { type RestReminderKind } from './RestReminderPopup'
import { startRest } from '../../../../utils/restLog'
import '../games.css'

/*  เควส The Deep Root (หยั่งรากลึก / โหมดจดจ่อ)
    ทฤษฎี: 90/20 Rule · Ultradian Rhythms (Psomas, 2021)
    ─────────────────────────────────────────────────────────────
    อ่านหนังสือ/ทำงานจดจ่อ 90 นาที → พัก 15 นาที × 3 รอบ
      • สลับแท็บ/ย่อหน้าต่าง = "วอกแวก" และหยุดนับเวลา
      • ครบ 3 รอบโดยไม่กดข้าม → ลุ้นรางวัลโบนัส (การ์ดแลกซื้อ 1 ใบ เมื่อระบบการ์ดปลดล็อกแล้ว หรือเหรียญโบนัส) ครั้งเดียวต่อรอบการเรียนรู้
        และปลดล็อกเควสเสริม Guardian of Rest (ดู requiresQuestIds ใน questCatalog.ts)
      • โหมดปกติกดข้ามได้ แต่ต้องจดจ่อสะสมครบ 45 นาทีก่อน → ได้รางวัลครึ่งเดียว (ไม่มีลุ้นรางวัลโบนัส)
      • โหมดเคร่งครัด: ไม่มีปุ่มข้ามเลย
    เวลาที่จดจ่อจริงส่งเข้า addFocusMinutes() ทุกครั้งที่จบช่วงจดจ่อ — Guardian of Rest ใช้ตัดโควตา 4-5 ชม./วัน */

const FOCUS_MINUTES = 90
const BREAK_MINUTES = 15
const TOTAL_CYCLES = 3
/** ต้องจดจ่อสะสมอย่างน้อยเท่านี้ก่อนถึงจะกดข้าม (และได้รางวัลครึ่งเดียว) ได้ */
const MIN_FOCUS_FOR_SKIP_MINUTES = 45

type Phase = 'idle' | 'focus' | 'break' | 'done'

function mmss(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function DeepRootGame({ finish, strictMode, skip }: QuestGameProps) {
  const { logActivity, addFocusMinutes, settings, questLogs, userData } = useAppContext()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<Phase>('idle')
  const [cycle, setCycle] = useState(1)
  const [seconds, setSeconds] = useState(FOCUS_MINUTES * 60)
  const [distractions, setDistractions] = useState(0)
  const [paused, setPaused] = useState(false)
  const [focusSeconds, setFocusSeconds] = useState(0)
  /** ผลลุ้นรางวัลพิเศษหลังครบ 3 รอบ: undefined = กำลังเปิด */
  const [bonus, setBonus] = useState<BonusRollResult | null | undefined>(undefined)
  /** ป็อปอัปเตือนพัก (ครบช่วงจดจ่อ) / กลับมาเรียน (ครบช่วงพัก) — ปิดได้ */
  const [reminder, setReminder] = useState<RestReminderKind | null>(null)

  // ค่าที่ interval อ่าน/เขียนทุกวินาที — เก็บใน ref (ไม่เปลี่ยนในตัว updater ของ setState ซึ่ง StrictMode เรียกซ้ำ)
  const secondsRef = useRef(FOCUS_MINUTES * 60)
  const cycleRef = useRef(1)
  const focusSecondsRef = useRef(0)

  const sfx = { volume: settings.sfxVolume, enabled: settings.soundEnabled }
  const running = phase === 'focus' || phase === 'break'
  const total = (phase === 'break' ? BREAK_MINUTES : FOCUS_MINUTES) * 60

  useEffect(() => {
    if (!running) return
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
  }, [running, phase])

  useEffect(() => {
    if (!running || paused) return
    const id = window.setInterval(() => {
      if (phase === 'focus') {
        focusSecondsRef.current += 1
        setFocusSeconds(focusSecondsRef.current)
      }
      secondsRef.current -= 1
      if (secondsRef.current > 0) { setSeconds(secondsRef.current); return }

      playSfx('SPARKLE_CHIME', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
      if (phase === 'focus') {
        addFocusMinutes(FOCUS_MINUTES)
        // ผู้พิทักษ์การพักผ่อน: เริ่มจับเวลาพัก 15 นาทีเบื้องหลัง (เวลาจริง) — ตัวจับเวลานี้เดินต่อไม่หยุด
        startRest(userData.id, BREAK_MINUTES)
        secondsRef.current = BREAK_MINUTES * 60
        setPhase('break')
        setReminder('rest')
      } else if (cycleRef.current < TOTAL_CYCLES) {
        cycleRef.current += 1
        setCycle(cycleRef.current)
        secondsRef.current = FOCUS_MINUTES * 60
        setPhase('focus')
        setReminder('back')
      } else {
        secondsRef.current = 0
        setPhase('done')
      }
      setSeconds(secondsRef.current)
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, paused, phase, addFocusMinutes, settings.sfxVolume, settings.soundEnabled, userData.id])

  // ครบ 3 รอบไม่กดข้าม → ลุ้นรางวัลพิเศษ (เซิร์ฟเวอร์สุ่ม กันซ้ำด้วย rollKey ของวัน+รอบการเรียนรู้)
  const { roundsDone } = learningRoundState(questLogs)
  useEffect(() => {
    if (phase !== 'done') return
    let cancelled = false
    claimDeepRootBonus(`deep-root:${localDateKey()}:${roundsDone}`)
      .then((res) => {
        if (cancelled) return
        setBonus(res)
        playSfx(res.cardItemCode ? 'QUEST_SUCCESS' : 'REWARD_CLAIM', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
        void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
        void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      })
      .catch(() => { if (!cancelled) setBonus(null) })
    return () => { cancelled = true }
  }, [phase, roundsDone, queryClient, settings.sfxVolume, settings.soundEnabled])

  const pct = total > 0 ? (total - seconds) / total : 0
  const circumference = 2 * Math.PI * 44
  const skipUnlockIn = MIN_FOCUS_FOR_SKIP_MINUTES * 60 - focusSeconds
  const canSkip = skipUnlockIn <= 0

  const start = () => {
    cycleRef.current = 1
    secondsRef.current = FOCUS_MINUTES * 60
    setCycle(1)
    setSeconds(secondsRef.current)
    setPhase('focus')
    playSfx('CLICK', sfx)
  }

  const handleFinish = () => {
    logActivity({
      activityType: 'DEEP_WORK',
      durationSeconds: focusSecondsRef.current,
      meta: { focusMinutes: FOCUS_MINUTES * TOTAL_CYCLES, breakMinutes: BREAK_MINUTES, cycles: TOTAL_CYCLES, distractions },
    })
    finish({ focusMinutes: FOCUS_MINUTES * TOTAL_CYCLES, cycles: TOTAL_CYCLES, distractions, strictComplete: true })
  }

  /** ข้ามตัวจับเวลา — ได้รางวัลครึ่งเดียว ต้องจดจ่อสะสมครบ 45 นาทีก่อน (ไม่มีปุ่มนี้ในโหมดเคร่งครัด) */
  const handleSkip = () => {
    if (!canSkip) return
    const focusedMinutes = Math.floor(focusSecondsRef.current / 60)
    // เวลาจดจ่อของช่วงที่ยังไม่จบ ยังไม่ได้ส่งเข้าโควตา — ส่งส่วนที่ทำจริงก่อนจบ
    const partial = phase === 'focus' ? focusedMinutes - (cycleRef.current - 1) * FOCUS_MINUTES : 0
    if (partial > 0) addFocusMinutes(partial)
    logActivity({
      activityType: 'DEEP_WORK',
      durationSeconds: focusSecondsRef.current,
      meta: { focusMinutes: focusedMinutes, breakMinutes: BREAK_MINUTES, cycles: cycleRef.current, distractions, skipped: true },
    })
    skip({ focusMinutes: focusedMinutes, cycles: cycleRef.current, distractions })
  }

  return (
    <div className="qg qg-center">
      <div className="qg-row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span className={`qg-tag${phase === 'break' ? ' qg-tag--ok' : ''}`}>
          {phase === 'idle' && `พร้อมเริ่ม: จดจ่อ ${FOCUS_MINUTES} นาที / พัก ${BREAK_MINUTES} นาที × ${TOTAL_CYCLES} รอบ`}
          {phase === 'focus' && '🌿 กำลังหยั่งราก — ห้ามวอกแวก'}
          {phase === 'break' && `☕ ช่วงพักสมอง ${BREAK_MINUTES} นาที — ห้ามเล่นมือถือ`}
          {phase === 'done' && `✅ ครบ ${TOTAL_CYCLES} รอบแล้ว!`}
        </span>
        {phase !== 'idle' && phase !== 'done' && <span className="qg-tag">รอบที่ {cycle}/{TOTAL_CYCLES}</span>}
      </div>

      {phase !== 'done' && (
        <div className="qg-ring-wrap">
          <svg viewBox="0 0 100 100" className="qg-ring">
            <circle cx="50" cy="50" r="44" className="qg-ring__track" />
            <circle
              cx="50" cy="50" r="44" className="qg-ring__fill"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
            />
          </svg>
          <div className="qg-ring__center">
            <div className="qg-ring__value">{mmss(seconds)}</div>
            <div className="qg-ring__label">{phase === 'break' ? 'เวลาพัก' : 'เวลาจดจ่อ'}</div>
          </div>
        </div>
      )}

      {paused && <span className="qg-tag qg-tag--warn">หยุดนับไว้แล้ว — กลับมาที่หน้าต่างนี้เพื่อทำต่อ</span>}
      {distractions > 0 && <span className="qg-tag qg-tag--warn">วอกแวกไป {distractions} ครั้ง (สลับแท็บ)</span>}

      {phase === 'idle' && (
        <>
          <p className="qg-hint">ทำครบ {TOTAL_CYCLES} รอบโดยไม่กดข้าม ลุ้นรางวัลโบนัส และปลดล็อกเควสเสริม "ผู้พิทักษ์การพักผ่อน"</p>
          <button className="qg-btn" onClick={start}>เริ่มจดจ่อรอบแรก</button>
        </>
      )}
      {phase === 'break' && (
        <p className="qg-hint">พักสมองจริงๆ นะ — หลับตา ยืดเส้น หรือเดินเล่น การพักคือส่วนหนึ่งของการฝึก</p>
      )}

      {phase === 'done' && (
        <div className="qg-card" style={{ textAlign: 'center' }}>
          {bonus === undefined && <p className="qg-hint">กำลังเปิดรางวัลโบนัส…</p>}
          {bonus?.cardItemCode && (
            <>
              <img src={BADGE_ICONS.item} alt="" style={{ width: 96, height: 96, objectFit: 'contain', margin: '0 auto' }} />
              <div className="qg-title">ได้รับ {exchangeCardLabel(bonus.cardItemCode)} 1 ใบ!</div>
              <p className="qg-hint">เก็บไว้ในคลังไอเทม หมวด "การ์ดแลกซื้อไอเทม" — ใช้แลกซื้อที่ร้านค้า</p>
            </>
          )}
          {bonus && !bonus.cardItemCode && bonus.coins > 0 && (
            <div className="qg-title">โบนัสความตั้งใจ +{bonus.coins} เหรียญ <img src={BADGE_ICONS.coins} alt="" style={{ width: 28, height: 28, verticalAlign: 'middle' }} /></div>
          )}
          {bonus === null && <p className="qg-hint">เปิดรางวัลโบนัสไม่สำเร็จ (เชื่อมต่อเซิร์ฟเวอร์ไม่ได้) — รางวัลเควสยังได้ตามปกติ</p>}
          <button className="qg-btn" onClick={handleFinish} disabled={bonus === undefined} style={{ marginTop: 10 }}>
            เสร็จสิ้น รดน้ำลำต้น
          </button>
        </div>
      )}

      {reminder && <RestReminderPopup kind={reminder} restMinutes={BREAK_MINUTES} onClose={() => setReminder(null)} />}

      {running && !strictMode && (
        <button className="qg-btn qg-btn--ghost" onClick={handleSkip} disabled={!canSkip}>
          {canSkip
            ? 'ข้ามตัวจับเวลา (ได้รางวัลครึ่งเดียว ไม่มีรางวัลโบนัส)'
            : `ข้ามได้หลังจดจ่อครบ ${MIN_FOCUS_FOR_SKIP_MINUTES} นาที (อีก ${mmss(skipUnlockIn)})`}
        </button>
      )}
    </div>
  )
}
