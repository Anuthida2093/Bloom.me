import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { EASE_OUT_SOFT_CSS } from '../../config/motion'
import '../leaderboard/leaderboardRow.css'

/*============================================================================*\
  OverCalorieNotice — [ใหม่ตามที่ระบุ] กรอบข้อความเตือนบนหน้า Home เมื่อทานเกินแคลอรี่ที่กำหนด
  ติดต่อกันหลายวัน (คู่กับก้อนหินบนพื้นดินใน TreeOfLife)
  ────────────────────────────────────────────────────────────────────────────
  จังหวะเดียวกับข้อความหน้า Welcome: ค่อยๆ จางขึ้นมา → ค้างให้อ่าน → เลื่อนขึ้นจางหายไป →
  ข้อความถัดไป (วนต่อเรื่อยๆ จนกว่าจะเคลียร์ก้อนหินได้) แบ่งเป็นประโยคสั้นๆ อ่านง่ายทีละประโยค
\*============================================================================*/

interface OverCalorieNoticeProps {
  streakDays: number
}

const FADE_MS = 700
const HOLD_MS = 2600

type Phase = 'enter' | 'shown' | 'leave'

export default function OverCalorieNotice({ streakDays }: OverCalorieNoticeProps) {
  const reducedMotion = usePrefersReducedMotion()
  const messages = [
    `คุณทานเกินแคลอรี่ที่กำหนดติดต่อกัน ${streakDays} วันแล้ว`,
    'ก้อนหินจึงเริ่มทับถมบนผืนดินของต้นไม้',
    'โปรดทานให้ตรงกับจำนวนแคลอรี่ที่กำหนด',
    'เพื่อเคลียร์ก้อนหินออกจากผืนดิน',
  ]
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    // setTimeout (ไม่ใช่ rAF) — rAF หยุดตอนแท็บถูกซ่อน ข้อความจะค้างที่โปร่งใส
    const toShown = window.setTimeout(() => setPhase('shown'), 30)
    const toLeave = window.setTimeout(() => setPhase('leave'), FADE_MS + HOLD_MS)
    const toNext = window.setTimeout(() => {
      setIndex((i) => (i + 1) % messages.length)
      setPhase('enter')
    }, FADE_MS * 2 + HOLD_MS)
    return () => { window.clearTimeout(toShown); window.clearTimeout(toLeave); window.clearTimeout(toNext) }
  }, [index, messages.length])

  const transform = reducedMotion ? 'none'
    : phase === 'enter' ? 'translateY(10px)'
      : phase === 'leave' ? 'translateY(-14px)'
        : 'none'

  return (
    <div className="over-calorie-notice lb-card" role="status" aria-live="polite">
      <div className="lb-banner over-calorie-notice__banner">ผืนดินมีก้อนหิน</div>
      <p className="over-calorie-notice__text">
        <span
          style={{
            display: 'inline-block',
            opacity: phase === 'shown' ? 1 : 0,
            transform,
            transition: reducedMotion ? 'none' : `opacity ${FADE_MS}ms ${EASE_OUT_SOFT_CSS}, transform ${FADE_MS}ms ${EASE_OUT_SOFT_CSS}`,
          }}
        >
          {messages[index]}
        </span>
      </p>
    </div>
  )
}
