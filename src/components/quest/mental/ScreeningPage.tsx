import { useState } from 'react'
import { useAppContext } from '../../../context/AppContext'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { playSfx } from '../../../utils/audioPlayer'
import {
  SCREENING_QUESTIONS,
  SCORE_CHOICES,
  RISK_PLANS,
  computeRiskLevel,
  computeTotalScore,
} from '../../../config/screening'
import type { PendingScreening, ScreeningAnswer } from '../../../types.mental'
import './ScreeningPage.css'

const C_1 = '#9B8FD8'

/*============================================================================*\
  ScreeningPage — แบบคัดกรองภาวะซึมเศร้า 5 ข้อ  [ไฟล์ใหม่]
  ────────────────────────────────────────────────────────────────────────────
  ทฤษฎีรองรับ: Patient Health Questionnaire (PHQ) — ดัดแปลงจาก PHQ-2/PHQ-9
  (Dr. Robert L. Spitzer) อ้างอิงมาตรฐานแบบประเมิน 2Q/9Q ของกรมสุขภาพจิต

  เงื่อนไขที่ทำให้หน้านี้เด้ง (ตั้งค่าใน AppContext):
    1. Routine  — ครบรอบ 30 วันนับจากครั้งล่าสุด
    2. Emergency — ปรุงน้ำยาสีน้ำเงิน/เทาติดกันครบ 3 วัน

  ออกแบบให้ถามทีละข้อ (ไม่เทรวมทั้ง 5 ข้อในหน้าเดียว) เพราะผู้ที่กำลังเหนื่อยล้า
  มักถอดใจเมื่อเห็นแบบสอบถามยาวๆ — และทุกหน้ามีปุ่ม "ขอข้ามไว้ก่อน" เสมอ
  ยกเว้นตอนแสดงผลระดับความเสี่ยงสูง ที่จะพาไปหน้า Safety Net ต่อทันที
\*============================================================================*/

interface ScreeningPageProps {
  pending: PendingScreening
  onFinished: () => void
  onOpenSafetyNet: () => void
  onStartCalmingQuest: () => void
  onDismiss: () => void
}

export default function ScreeningPage({ pending, onFinished, onOpenSafetyNet, onStartCalmingQuest, onDismiss }: ScreeningPageProps) {
  useLockBodyScroll()

  const { submitScreening, settings } = useAppContext()
  const sfxOpts = { volume: settings.sfxVolume, enabled: settings.soundEnabled }

  const [stage, setStage] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<ScreeningAnswer[]>([])

  useEscapeKey(() => { if (stage !== 'result') onDismiss() })

  const total = computeTotalScore(answers)
  const risk = computeRiskLevel(total)
  const plan = RISK_PLANS[risk]

  const answer = (score: 0 | 1 | 2 | 3) => {
    playSfx('CLICK', { ...sfxOpts, volume: sfxOpts.volume * 0.5 })
    const next = [...answers.filter((a) => a.question !== SCREENING_QUESTIONS[index].no), { question: SCREENING_QUESTIONS[index].no, score }]
    setAnswers(next)

    if (index + 1 < SCREENING_QUESTIONS.length) {
      window.setTimeout(() => setIndex((i) => i + 1), 220)
    } else {
      submitScreening(next, pending.triggerType)
      window.setTimeout(() => setStage('result'), 260)
    }
  }

  const current = SCREENING_QUESTIONS[index]
  const progress = ((index + (stage === 'result' ? 1 : 0)) / SCREENING_QUESTIONS.length) * 100

  return (
    <div className="screening" style={{ '--risk-accent': stage === 'result' ? plan.accent: C_1 } as React.CSSProperties}>
      <div className="screening__glow" aria-hidden="true" />

      {stage !== 'result' && (
        <button className="screening__close" onClick={onDismiss} title="ปิด">✕</button>
      )}

      {/* ── เกริ่นนำ ── */}
      {stage === 'intro' && (
        <div className="screening__card">
          <div className="screening__icon">🌙</div>
          <h1>ขอชวนสำรวจใจสักครู่</h1>
          <p className="screening__reason">{pending.reason}</p>
          <div className="screening__notice">
            <p>คำถาม 5 ข้อ ถามถึงความรู้สึกใน <strong>2 สัปดาห์ที่ผ่านมา</strong></p>
            <p>ไม่มีคำตอบถูกหรือผิด และไม่มีใครเห็นคำตอบของคุณนอกจากตัวคุณเอง</p>
          </div>
          <button className="screening__cta" onClick={() => setStage('quiz')}>เริ่มตอบคำถาม</button>
          <button className="screening__skip" onClick={onDismiss}>ขอข้ามไว้ก่อน</button>
        </div>
      )}

      {/* ── ถามทีละข้อ ── */}
      {stage === 'quiz' && (
        <div className="screening__card">
          <div className="screening__progress"><div style={{ width: `${progress}%` }} /></div>
          <div className="screening__step">ข้อ {index + 1} จาก {SCREENING_QUESTIONS.length}</div>
          <h2 className="screening__question">{current.text}</h2>
          <p className="screening__hint">{current.hint}</p>

          <div className="screening__choices">
            {SCORE_CHOICES.map((c) => (
              <button
                key={c.score}
                className={answers.find((a) => a.question === current.no)?.score === c.score ? 'is-active' : ''}
                onClick={() => answer(c.score)}
              >
                <span className="screening__choice-dot" />
                {c.label}
              </button>
            ))}
          </div>

          {index > 0 && (
            <button className="screening__skip" onClick={() => setIndex((i) => i - 1)}>ย้อนกลับข้อก่อนหน้า</button>
          )}
        </div>
      )}

      {/* ── ผลลัพธ์ + Action Plan ── */}
      {stage === 'result' && (
        <div className="screening__card screening__card--result">
          <div className="screening__icon">{plan.emoji}</div>
          <div className="screening__score">
            <strong>{total}</strong><span>/ 15 คะแนน</span>
          </div>
          <div className="screening__risk-badge">{plan.headline}</div>

          <p className="screening__advice">{plan.advice}</p>

          <div className="screening__tree-status">
            <span>สถานะต้นไม้ของคุณตอนนี้</span>
            <strong>{plan.treeStatus}</strong>
          </div>

          <ul className="screening__actions">
            {plan.actions.map((a) => <li key={a}>{a}</li>)}
          </ul>

          {risk === 'HIGH' && (
            <button className="screening__cta screening__cta--urgent" onClick={onOpenSafetyNet}>
              เปิดกล่องพยาบาล · สายด่วน 1323
            </button>
          )}
          {risk === 'MODERATE' && (
            <button className="screening__cta" onClick={onStartCalmingQuest}>
              ไปทำเควสทอดสมอใจ (ฝึกหายใจ)
            </button>
          )}
          <button className={risk === 'LOW' ? 'screening__cta' : 'screening__skip'} onClick={onFinished}>
            {risk === 'LOW' ? 'กลับไปดูแลต้นไม้ต่อ' : 'ไว้ทีหลัง กลับหน้าหลัก'}
          </button>

          <p className="screening__disclaimer">
            แบบประเมินนี้เป็นเครื่องมือคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์
          </p>
        </div>
      )}
    </div>
  )
}