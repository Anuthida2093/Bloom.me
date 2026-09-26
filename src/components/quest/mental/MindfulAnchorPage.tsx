import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../context/AppContext'
import { playSfx, startLoopingSfx, stopLoopingSfx } from '../../../utils/audioPlayer'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { useBreathingSession, PATTERN_478, PHASE_LABEL, type BreathPhase } from '../../../hooks/useBreathingSession'
import BreathingVisual, { type BreathingVisualMode } from '../shared/BreathingVisual'
import type { QuestPlayPayload } from '../../../types.mental'
import './MindfulAnchorPage.css'
import { BADGE_ICONS } from '../../../config/iconAssets'

const C_1 = '#7FE7D9'
const C_2 = 'rgba(127,231,217,.55)'
const C_3 = '#9DB8FF'
const C_4 = 'rgba(157,184,255,.5)'
const C_5 = '#C7A6FF'
const C_6 = 'rgba(199,166,255,.5)'

/*============================================================================*\
  MindfulAnchorPage — เควส "ทอดสมอใจ" (The Mindful Anchor)   [เขียนใหม่ทั้งหน้า]
  ────────────────────────────────────────────────────────────────────────────
  วิธีเล่นตามเอกสาร: เมื่อต้องการความสงบ หน้าจอจะตัดเข้าสู่กราฟิกวงกลมขยายเข้า-ออก
  หรือภาพลมพัดใบไม้ ให้ผู้ใช้หายใจตามจังหวะ 4-7-8 เป็นเวลา 2 นาที

  ทฤษฎีรองรับ: Mindfulness-Based Stress Reduction (MBSR)
  แหล่งที่มา: โปรแกรมลดความเครียดโดย Jon Kabat-Zinn (University of Massachusetts)
  สาระสำคัญ: การกำหนดลมหายใจ 4-7-8 กระตุ้นระบบประสาทพาราซิมพาเทติก ทำให้หัวใจเต้นช้าลง
  ความดันโลหิตลดลง และระงับภาวะวิตกกังวลได้เร็ว

  ── สิ่งที่เปลี่ยนจากหน้าเดิม ──────────────────────────────────────────────
  1. "ตัดเข้าสู่" จริงตามเอกสาร: มีฉาก 3 ขั้น cinematic → prepare (นับ 3-2-1) →
     breathing → complete  แทนที่จะโยนผู้ใช้เข้าวงกลมทันทีแบบเดิม
  2. วงกลมขยายเข้า-ออก "ตรงจังหวะจริง" ทุกมิลลิวินาที (ดู BreathingVisual.tsx)
     ของเดิมใช้ CSS transition 3.8s ตายตัว ซึ่งไม่มีทางตรงกับเฟส 4/7/8 วินาที
  3. สลับโหมดภาพได้ 2 แบบตามเอกสาร: วงกลมเวทมนตร์ / ลมพัดใบไม้
  4. เวลา 2 นาทีนับจาก "เวลาที่อยู่หน้าจอจริง" เท่านั้น สลับแท็บแล้วหยุดนับให้เอง
  5. บันทึกผลลงระบบจริง: logActivity('BREATHING', วินาทีที่ทำ, { cycles, mode })
     → ตาราง activity_logs (ดู docs/DB_CHANGES.md ข้อ 4) ไม่ใช่แค่ปิดหน้าจอแล้วจบ
  6. ถ้าความเสี่ยงเป็น MODERATE/HIGH เควสนี้คือ "เควสบังคับ" — ออกกลางคันต้องยืนยัน
     ก่อน และไม่ถือว่าทำสำเร็จ (ตรงกับ Moderate Risk Action ในเอกสารส่วนที่ 3)
\*============================================================================*/

/** 2 นาทีเต็มตามเอกสาร (4+7+8 = 19 วิ/รอบ → ประมาณ 6 รอบเศษ) */
const SESSION_MS = 120_000

interface MindfulAnchorPageProps {
  onComplete: (payload?: QuestPlayPayload) => void
  onClose: () => void
}

type Stage = 'intro' | 'prepare' | 'breathing' | 'complete'

const PHASE_COLORS: Record<BreathPhase, { accent: string; glow: string; caption: string }> = {
  inhale: { accent: C_1, glow: C_2, caption: 'ดึงอากาศเย็นๆ เข้าเต็มปอด' },
  hold: { accent: C_3, glow: C_4, caption: 'ค้างไว้ ปล่อยให้ร่างกายได้ดูดซับ' },
  exhale: { accent: C_5, glow: C_6, caption: 'ผ่อนออกยาวๆ ทิ้งความตึงไปกับลม' },
}

export default function MindfulAnchorPage({ onComplete, onClose }: MindfulAnchorPageProps) {
  useLockBodyScroll()

  const { settings, userData, logActivity } = useAppContext()
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  /** ความเสี่ยงปานกลางขึ้นไป = เควสบังคับ ห้ามกดข้าม (ตรงกับ Moderate Risk Action) */
  const isForced = userData.currentRiskLevel === 'MODERATE' || userData.currentRiskLevel === 'HIGH'

  const [stage, setStage] = useState<Stage>('intro')
  const [visualMode, setVisualMode] = useState<BreathingVisualMode>('circle')
  const [countdown, setCountdown] = useState(3)
  const [confirmExit, setConfirmExit] = useState(false)
  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] true = จบรอบนี้ด้วยการกด "ข้าม" กลางคัน (ได้รางวัลครึ่งเดียว) */
  const [wasSkipped, setWasSkipped] = useState(false)

  const handleSessionFinish = useCallback(() => {
    playSfx('SPARKLE_CHIME', sfxOpts)
    setStage('complete')
  }, [sfxOpts])

  const handlePhaseChange = useCallback((phase: BreathPhase) => {
    // เสียงสั้นๆ คั่นแต่ละเฟส ช่วยให้หลับตาหายใจตามได้โดยไม่ต้องมองจอตลอดเวลา
    if (phase === 'inhale') playSfx('WING', { ...sfxOpts, volume: sfxOpts.volume * 0.5 })
    if (phase === 'exhale') playSfx('WATER_DROP', { ...sfxOpts, volume: sfxOpts.volume * 0.45 })
  }, [sfxOpts])

  const session = useBreathingSession({
    totalMs: SESSION_MS,
    pattern: PATTERN_478,
    onPhaseChange: handlePhaseChange,
    onFinish: handleSessionFinish,
  })

  const { phase, phaseProgress, phaseRemainingSec, cycles, elapsedMs, remainingMs, progress, autoPaused, start, pause } = session

  // เสียงป่าคลอเบาๆ ระหว่างฝึก ปิดให้เรียบร้อยตอนออกจากหน้า
  useEffect(() => {
    if (stage !== 'breathing') return
    startLoopingSfx('BGM_FOREST', { ...sfxOpts, volume: sfxOpts.volume * 0.3 })
    return () => stopLoopingSfx('BGM_FOREST')
  }, [stage, sfxOpts])

  // นับถอยหลัง 3-2-1 ก่อนเริ่มจริง ให้ผู้ใช้ตั้งท่านั่งและวางมือทัน
  // [หมายเหตุ react-hooks/set-state-in-effect] ทรานซิชันนี้ผูกกับตัวจับเวลาจริง
  // (setTimeout ไล่ tick ด้านล่าง) ไม่ใช่การ derive state จาก prop จึงต้องอยู่ใน effect
  useEffect(() => {
    if (stage !== 'prepare') return
    if (countdown <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage('breathing')
      start()
      return
    }
    playSfx('CLICK', { ...sfxOpts, volume: sfxOpts.volume * 0.4 })
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [stage, countdown, start, sfxOpts])

  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] ข้ามช่วงฝึกหายใจกลางคัน จบทันทีด้วยรางวัลครึ่งเดียว —
   *  เควสบังคับ (isForced) ห้ามข้าม เพราะเป็นกลไกความปลอดภัยของระบบคัดกรองความเสี่ยงอยู่แล้ว */
  const handleSkipBreathing = () => {
    pause()
    setWasSkipped(true)
    playSfx('SPARKLE_CHIME', sfxOpts)
    setStage('complete')
  }

  const requestClose = useCallback(() => {
    if (stage === 'breathing' && isForced) {
      setConfirmExit(true)
      return
    }
    onClose()
  }, [stage, isForced, onClose])

  useEscapeKey(() => {
    if (confirmExit) setConfirmExit(false)
    else requestClose()
  })

  const handleClaim = () => {
    playSfx('REWARD_CLAIM', sfxOpts)
    logActivity({
      activityType: 'BREATHING',
      durationSeconds: Math.round(elapsedMs / 1000),
      meta: { pattern: '4-7-8', cycles, visualMode, forced: isForced, skipped: wasSkipped },
    })
    onComplete(wasSkipped ? { skipped: true } : undefined)
    onClose()
  }

  const phaseTheme = PHASE_COLORS[phase]
  const remainingSec = Math.ceil(remainingMs / 1000)
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0')
  const ss = String(remainingSec % 60).padStart(2, '0')

  return (
    <div
      className={`mindful-anchor mindful-anchor--${stage}`}
      style={{ '--anchor-accent': phaseTheme.accent, '--anchor-glow': phaseTheme.glow } as React.CSSProperties}
    >
      {/* ฉากหลัง: หมอกน้ำลึกไล่เฉดตามเฟสลมหายใจ + ประกายละอองลอย */}
      <div className="mindful-anchor__aurora" aria-hidden="true" />
      <div className="mindful-anchor__motes" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${i * 0.9}s`, animationDuration: `${11 + (i % 5) * 2}s` }} />
        ))}
      </div>

      <button onClick={requestClose} className="mindful-anchor__close" title="ปิด" aria-label="ปิดเควสทอดสมอใจ"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>

      {/* ── ฉากที่ 1: เกริ่นนำ อธิบายวิธีเล่นและทฤษฎี ── */}
      {stage === 'intro' && (
        <div className="mindful-anchor__panel">
          <div className="mindful-anchor__anchor-icon">⚓</div>
          <h1 className="mindful-anchor__title">ทอดสมอใจ</h1>
          <p className="mindful-anchor__subtitle">The Mindful Anchor · จังหวะหายใจ 4-7-8</p>

          <div className="mindful-anchor__rhythm">
            <div className="mindful-anchor__rhythm-item"><span>4</span>หายใจเข้า</div>
            <div className="mindful-anchor__rhythm-sep" />
            <div className="mindful-anchor__rhythm-item"><span>7</span>กลั้นไว้</div>
            <div className="mindful-anchor__rhythm-sep" />
            <div className="mindful-anchor__rhythm-item"><span>8</span>ผ่อนออก</div>
          </div>

          <p className="mindful-anchor__lead">
            หายใจตามวงกลมไปเรื่อยๆ 2 นาที ขยายออกคือหายใจเข้า หุบเข้าคือผ่อนออก
            ไม่ต้องพยายามทำให้ถูก แค่ตามจังหวะไปเท่าที่ไหว
          </p>

          <div className="mindful-anchor__mode-switch" role="group" aria-label="เลือกภาพนำสายตา">
            <button
              className={visualMode === 'circle' ? 'is-active' : ''}
              onClick={() => setVisualMode('circle')}
            >
              ⭕ วงกลมเวทมนตร์
            </button>
            <button
              className={visualMode === 'leaves' ? 'is-active' : ''}
              onClick={() => setVisualMode('leaves')}
            >
              🍃 ลมพัดใบไม้
            </button>
          </div>

          {isForced && (
            <div className="mindful-anchor__forced-note">
              ตอนนี้ต้นไม้ของคุณกำลังขอเวลาพักฟื้น เควสนี้จึงต้องทำให้ครบ 2 นาทีก่อนนะ
            </div>
          )}

          <button className="mindful-anchor__cta" onClick={() => { setCountdown(3); setStage('prepare') }}>
            เริ่มทอดสมอ
          </button>
          <p className="mindful-anchor__theory">
            อ้างอิง Mindfulness-Based Stress Reduction (MBSR) — Jon Kabat-Zinn, University of Massachusetts
          </p>
        </div>
      )}

      {/* ── ฉากที่ 2: นับถอยหลังตั้งท่า ── */}
      {stage === 'prepare' && (
        <div className="mindful-anchor__prepare">
          <div className="mindful-anchor__prepare-count" key={countdown}>{countdown > 0 ? countdown : '···'}</div>
          <p>นั่งสบายๆ วางไหล่ลง แล้วปล่อยลมหายใจออกให้หมดก่อน</p>
        </div>
      )}

      {/* ── ฉากที่ 3: ฝึกหายใจจริง ── */}
      {stage === 'breathing' && (
        <div className="mindful-anchor__stage">
          <div className="mindful-anchor__timer">
            <span className="mindful-anchor__timer-value">{mm}:{ss}</span>
            <span className="mindful-anchor__timer-label">เหลืออีก</span>
          </div>

          <BreathingVisual
            phase={phase}
            phaseProgress={phaseProgress}
            phaseRemainingSec={phaseRemainingSec}
            sessionProgress={progress}
            mode={visualMode}
            dimmed={autoPaused}
          />

          <div className="mindful-anchor__phase">
            <div className="mindful-anchor__phase-name">{PHASE_LABEL[phase]}</div>
            <div className="mindful-anchor__phase-caption">{phaseTheme.caption}</div>
          </div>

          <div className="mindful-anchor__meta">
            <span>🌀 หายใจครบ {cycles} รอบ</span>
            <button className="mindful-anchor__mode-toggle" onClick={() => setVisualMode((m) => (m === 'circle' ? 'leaves' : 'circle'))}>
              {visualMode === 'circle' ? '🍃 เปลี่ยนเป็นลมพัดใบไม้' : '⭕ เปลี่ยนเป็นวงกลม'}
            </button>
          </div>

          {autoPaused && (
            <div className="mindful-anchor__paused">หยุดนับไว้ให้แล้ว — กลับมาที่หน้าต่างนี้เมื่อพร้อมหายใจต่อ</div>
          )}

          {!settings.strictMode && !isForced && (
            <button className="mindful-anchor__mode-toggle" onClick={handleSkipBreathing}>
              ข้ามตัวจับเวลา (ได้รางวัลครึ่งเดียว)
            </button>
          )}
        </div>
      )}

      {/* ── ฉากที่ 4: จบเซสชัน ── */}
      {stage === 'complete' && (
        <div className="mindful-anchor__panel mindful-anchor__panel--done">
          <div className="mindful-anchor__done-glow" aria-hidden="true" />
          <div className="mindful-anchor__anchor-icon">🌿</div>
          <h2 className="mindful-anchor__title">สมอลงแล้ว</h2>
          <p className="mindful-anchor__lead">
            {wasSkipped
              ? 'คุณข้ามตัวจับเวลากลางคัน — ได้รับรางวัลครึ่งเดียว ใบไม้ยังได้รับการฟื้นฟูบ้าง'
              : 'คุณอยู่กับลมหายใจครบ 2 นาที ระบบประสาทพาราซิมพาเทติกเริ่มทำงาน หัวใจเต้นช้าลง ใบไม้บนต้นไม้ของคุณกลับมาอวบอิ่มอีกครั้ง'}
          </p>
          <div className="mindful-anchor__stats">
            <div><strong>{cycles}</strong>รอบหายใจ</div>
            <div><strong>{Math.round(elapsedMs / 1000)}</strong>วินาที</div>
            <div><strong>4-7-8</strong>จังหวะ</div>
          </div>
          <button className="mindful-anchor__cta" onClick={handleClaim}>รับหยดน้ำเรืองแสง</button>
        </div>
      )}

      {/* ── ยืนยันก่อนออกกลางคัน (เฉพาะโหมดบังคับ) ── */}
      {confirmExit && (
        <div className="mindful-anchor__confirm">
          <div className="mindful-anchor__confirm-card">
            <div className="mindful-anchor__confirm-icon">🥀</div>
            <p>
              เหลืออีกแค่ {remainingSec} วินาทีเอง ถ้าออกตอนนี้เควสจะยังไม่นับว่าสำเร็จ
              และใบไม้จะยังไม่ได้รับการฟื้นฟู
            </p>
            <div className="mindful-anchor__confirm-actions">
              <button className="is-primary" onClick={() => setConfirmExit(false)}>หายใจต่อ</button>
              <button onClick={onClose}>ออกก่อน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}