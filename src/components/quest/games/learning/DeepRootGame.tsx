import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { playSfx } from '../../../../utils/audioPlayer'
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
    [แก้ตามที่ระบุ — Focus Mode] เล่น 1 ครั้ง = 1 รอบ: จดจ่อ 90 นาที → พัก 15 นาที → จบรอบ (ทำเควสสำเร็จ 1 ครั้ง)
      • วันละไม่เกิน 3 รอบ (questCatalog maxPerDay: 3) — จบรอบแรก "เทกระเป๋าความจำผ่านเสียง" + ผู้พิทักษ์การพักผ่อน ปลดล็อกทันที
        กลับมาเล่นรอบที่ 2-3 ได้ภายหลัง (เดิมต้องนั่งครบ 3 รอบ 5 ชม. 15 นาทีในครั้งเดียวกว่าจะปลดล็อกอะไรได้)
      • สลับแท็บ/ย่อหน้าต่าง = "วอกแวก" และหยุดนับเวลา
      • จบรอบที่ 3 ของวัน โดยไม่มีรอบไหนกดข้าม → รางวัลพิเศษ (เซิร์ฟเวอร์สุ่ม: การ์ดแลกซื้อ เมื่อระบบการ์ดปลดล็อกแล้ว หรือเหรียญโบนัส) วันละครั้ง
      • โหมดปกติกดข้ามได้ แต่ต้องจดจ่อสะสมครบ 45 นาทีก่อน → ได้รางวัลครึ่งเดียว (ไม่มีลุ้นรางวัลโบนัส)
      • โหมดเคร่งครัด: ไม่มีปุ่มข้ามเลย
    เวลาที่จดจ่อจริงส่งเข้า addFocusMinutes() ทุกครั้งที่จบช่วงจดจ่อ — Guardian of Rest ใช้ตัดโควตา 4-5 ชม./วัน */

const FOCUS_MINUTES = 90
const BREAK_MINUTES = 15
/** รอบสูงสุดต่อวัน — ต้องตรงกับ maxPerDay ของ know-deep-root ใน questCatalog.ts */
const MAX_ROUNDS_PER_DAY = 3
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
  // รอบที่ทำไปแล้ววันนี้ (เควสนี้สำเร็จกี่ครั้งวันนี้) — ล็อกค่าไว้ตอนเปิดหน้า ไม่เปลี่ยนกลางรอบ
  const [todaysRounds] = useState(() => questLogs.filter((l) =>
    l.quest?.code === 'know-deep-root' && l.status === 'COMPLETED' && l.completedAt
    && new Date(l.completedAt).toDateString() === new Date().toDateString()))
  const round = Math.min(todaysRounds.length + 1, MAX_ROUNDS_PER_DAY)
  /** รอบนี้คือรอบที่ 3 และสองรอบก่อนหน้าไม่ได้กดข้าม → จบแล้วได้รางวัลพิเศษ */
  const earnsThreeRoundBonus = round === MAX_ROUNDS_PER_DAY && todaysRounds.every((l) => l.payload?.skipped !== true)
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
      } else {
        // พักครบ 15 นาที = จบรอบนี้
        secondsRef.current = 0
        setPhase('done')
      }
      setSeconds(secondsRef.current)
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, paused, phase, addFocusMinutes, settings.sfxVolume, settings.soundEnabled, userData.id])

  // จบรอบที่ 3 ไม่กดข้ามเลย → รางวัลพิเศษ (เซิร์ฟเวอร์สุ่ม กันซ้ำด้วย rollKey ของวัน — ได้วันละครั้ง)
  useEffect(() => {
    if (phase !== 'done' || !earnsThreeRoundBonus) return
    let cancelled = false
    claimDeepRootBonus(`deep-root:${localDateKey()}:3-rounds`)
      .then((res) => {
        if (cancelled) return
        setBonus(res)
        playSfx(res.cardItemCode ? 'QUEST_SUCCESS' : 'REWARD_CLAIM', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
        void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
        void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      })
      .catch(() => { if (!cancelled) setBonus(null) })
    return () => { cancelled = true }
  }, [phase, earnsThreeRoundBonus, queryClient, settings.sfxVolume, settings.soundEnabled])

  const pct = total > 0 ? (total - seconds) / total : 0
  const circumference = 2 * Math.PI * 44
  const skipUnlockIn = MIN_FOCUS_FOR_SKIP_MINUTES * 60 - focusSeconds
  const canSkip = skipUnlockIn <= 0

  const start = () => {
    secondsRef.current = FOCUS_MINUTES * 60
    setSeconds(secondsRef.current)
    setPhase('focus')
    playSfx('CLICK', sfx)
  }

  const handleFinish = () => {
    logActivity({
      activityType: 'DEEP_WORK',
      durationSeconds: focusSecondsRef.current,
      meta: { focusMinutes: FOCUS_MINUTES, breakMinutes: BREAK_MINUTES, round, distractions },
    })
    finish({ focusMinutes: FOCUS_MINUTES, breakMinutes: BREAK_MINUTES, round, distractions, strictComplete: true })
  }

  /** ข้ามตัวจับเวลา — ได้รางวัลครึ่งเดียว ต้องจดจ่อสะสมครบ 45 นาทีก่อน (ไม่มีปุ่มนี้ในโหมดเคร่งครัด) */
  const handleSkip = () => {
    if (!canSkip) return
    const focusedMinutes = Math.floor(focusSecondsRef.current / 60)
    // เวลาจดจ่อของช่วงที่ยังไม่จบ ยังไม่ได้ส่งเข้าโควตา — ส่งส่วนที่ทำจริงก่อนจบ
    if (phase === 'focus' && focusedMinutes > 0) addFocusMinutes(focusedMinutes)
    logActivity({
      activityType: 'DEEP_WORK',
      durationSeconds: focusSecondsRef.current,
      meta: { focusMinutes: focusedMinutes, breakMinutes: BREAK_MINUTES, round, distractions, skipped: true },
    })
    skip({ focusMinutes: focusedMinutes, round, distractions })
  }

  return (
    <div className="qg qg-center">
      <div className="qg-row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span className={`qg-tag${phase === 'break' ? ' qg-tag--ok' : ''}`}>
          {phase === 'idle' && `พร้อมเริ่ม: จดจ่อ ${FOCUS_MINUTES} นาที + พัก ${BREAK_MINUTES} นาที = 1 รอบ`}
          {phase === 'focus' && '🌿 กำลังหยั่งราก ห้ามวอกแวก'}
          {phase === 'break' && `☕ ช่วงพักสมอง ${BREAK_MINUTES} นาที ห้ามเล่นมือถือ`}
          {phase === 'done' && `✅ จบรอบที่ ${round} แล้ว!`}
        </span>
        <span className="qg-tag">รอบที่ {round}/{MAX_ROUNDS_PER_DAY} ของวันนี้</span>
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

      {paused && <span className="qg-tag qg-tag--warn">หยุดนับไว้แล้ว กลับมาที่หน้าต่างนี้เพื่อทำต่อ</span>}
      {distractions > 0 && <span className="qg-tag qg-tag--warn">วอกแวกไป {distractions} ครั้ง (สลับแท็บ)</span>}

      {phase === 'idle' && (
        <>
          <p className="qg-hint">
            {round === 1
              ? 'จบรอบแรกแล้ว "เทกระเป๋าความจำผ่านเสียง" เล่นได้ทันที กลับมาทำต่อให้ครบ 3 รอบของวัน รับรางวัลพิเศษ'
              : earnsThreeRoundBonus
                ? 'รอบสุดท้ายของวันนี้ จบโดยไม่กดข้าม รับรางวัลพิเศษ!'
                : round === MAX_ROUNDS_PER_DAY
                  ? 'รอบสุดท้ายของวันนี้ (มีรอบที่กดข้ามไปแล้ว จึงไม่มีรางวัลพิเศษวันนี้)'
                  : `ทำต่อให้ครบ ${MAX_ROUNDS_PER_DAY} รอบโดยไม่กดข้าม รับรางวัลพิเศษ`}
          </p>
          <button className="qg-btn" onClick={start}>เริ่มจดจ่อรอบที่ {round}</button>
        </>
      )}
      {phase === 'break' && (
        <p className="qg-hint">พักสมองจริงๆ นะ หลับตา ยืดเส้น หรือเดินเล่น การพักคือส่วนหนึ่งของการฝึก</p>
      )}

      {phase === 'done' && (
        <div className="qg-card" style={{ textAlign: 'center' }}>
          {!earnsThreeRoundBonus && (
            <p className="qg-hint">
              {round === 1 ? 'ปลดล็อก "เทกระเป๋าความจำผ่านเสียง" แล้ว ' : ''}
              {round < MAX_ROUNDS_PER_DAY ? `เหลืออีก ${MAX_ROUNDS_PER_DAY - round} รอบของวันนี้ กลับมาเล่นต่อได้เลย` : 'ครบรอบของวันนี้แล้ว'}
            </p>
          )}
          {earnsThreeRoundBonus && bonus === undefined && <p className="qg-hint">กำลังเปิดรางวัลพิเศษ…</p>}
          {bonus?.cardItemCode && (
            <>
              <img src={BADGE_ICONS.item} alt="" style={{ width: 96, height: 96, objectFit: 'contain', margin: '0 auto' }} />
              <div className="qg-title">ได้รับ {exchangeCardLabel(bonus.cardItemCode)} 1 ใบ!</div>
              <p className="qg-hint">เก็บไว้ในคลังไอเทม หมวด "การ์ดแลกซื้อไอเทม" ใช้แลกซื้อที่ร้านค้า</p>
            </>
          )}
          {bonus && !bonus.cardItemCode && bonus.coins > 0 && (
            <div className="qg-title">โบนัสความตั้งใจ +{bonus.coins} เหรียญ <img src={BADGE_ICONS.coins} alt="" style={{ width: 28, height: 28, verticalAlign: 'middle' }} /></div>
          )}
          {earnsThreeRoundBonus && bonus === null && <p className="qg-hint">เปิดรางวัลพิเศษไม่สำเร็จ (เชื่อมต่อเซิร์ฟเวอร์ไม่ได้) รางวัลเควสยังได้ตามปกติ</p>}
          <button className="qg-btn" onClick={handleFinish} disabled={earnsThreeRoundBonus && bonus === undefined} style={{ marginTop: 10 }}>
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
