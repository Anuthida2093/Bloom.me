import { useMemo } from 'react'
import type { BreathPhase } from '../../../hooks/useBreathingSession'
import './BreathingVisual.css'

/*============================================================================*\
  BreathingVisual — "วงกลมเวทมนตร์" นำสายตาในการหายใจ (Mindful Circle)
  ────────────────────────────────────────────────────────────────────────────
  ใช้โดย MindfulAnchorPage (ทอดสมอใจ 4-7-8) — [แก้รอบหลัง] เดิมใช้ร่วมกับ MindfulBreezeGame
  (สายลมแห่งสติ) ด้วย แต่เควสนั้นถูกลบออกจากระบบแล้ว (ซ้ำกับทอดสมอใจ)

  [จุดสำคัญ] ขนาดวงกลมคำนวณจาก phaseProgress โดยตรง ไม่ได้ใช้ CSS transition
  เหมือนเดิม เพราะ transition ตายตัว 3.8s ไม่มีทางตรงกับเฟสที่ยาว 4/7/8 วินาที
  ต่างกัน — ของเดิมจึงขยายไม่ทันจังหวะจริงเสมอ ตอนนี้วงกลม "ขยายเข้า-ออก" ตรงกับ
  ลมหายใจเป๊ะทุกมิลลิวินาที ซึ่งเป็นหัวใจของการนำสายตาแบบ MBSR

  โหมดภาพ 2 แบบตามเอกสาร ("กราฟิกวงกลมขยายเข้า-ออก หรือภาพลมพัดใบไม้"):
    circle — วงกลมเรืองแสง + วงแหวนอักขระหมุน + ระลอกคลื่นตอนหายใจเข้า
    leaves — ใบไม้ปลิวเข้าหาแกนกลางตอนหายใจเข้า และปลิวออกตอนผ่อนลมหายใจออก
\*============================================================================*/

export type BreathingVisualMode = 'circle' | 'leaves'

interface BreathingVisualProps {
  phase: BreathPhase
  /** 0-1 ภายในเฟสปัจจุบัน */
  phaseProgress: number
  /** วินาทีที่เหลือของเฟส แสดงเป็นตัวเลขกลางวง */
  phaseRemainingSec: number
  /** 0-1 ความคืบหน้าของทั้งเซสชัน วาดเป็นวงแหวนรอบนอก */
  sessionProgress: number
  mode?: BreathingVisualMode
  /** true = ยังไม่เริ่ม/หยุดอยู่ → หรี่แสงลง ไม่ให้ดูเหมือนกำลังทำงาน */
  dimmed?: boolean
}

const MIN_SCALE = 0.6
const MAX_SCALE = 1

/** ease-in-out ทำให้ปลายลมหายใจนุ่ม ไม่กระตุกตอนเปลี่ยนเฟส */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function scaleForPhase(phase: BreathPhase, p: number): number {
  const span = MAX_SCALE - MIN_SCALE
  if (phase === 'inhale') return MIN_SCALE + span * easeInOut(p)
  if (phase === 'exhale') return MAX_SCALE - span * easeInOut(p)
  // hold — ค้างขนาดเต็มแล้วเต้นเบาๆ ให้รู้ว่าระบบยังทำงานอยู่ ไม่ใช่ค้างเพราะแอปแฮงก์
  return MAX_SCALE - 0.012 * Math.sin(p * Math.PI * 4)
}

const RING_RADIUS = 46
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export default function BreathingVisual({
  phase,
  phaseProgress,
  phaseRemainingSec,
  sessionProgress,
  mode = 'circle',
  dimmed = false,
}: BreathingVisualProps) {
  const scale = scaleForPhase(phase, phaseProgress)

  // ใบไม้ 9 ใบ วางรอบวง — สุ่มตำแหน่งครั้งเดียว ไม่กระพริบทุกเฟรม
  const leaves = useMemo(
    () => Array.from({ length: 9 }).map((_, i) => ({
      angle: (i / 9) * 360 + (i % 3) * 7,
      distance: 96 + (i % 4) * 14,
      size: 15 + (i % 3) * 6,
      glyph: ['🍃', '🌿', '🍂'][i % 3],
      delay: i * 0.28,
    })),
    [],
  )

  return (
    <div className={`breath-visual breath-visual--${phase}${dimmed ? ' breath-visual--dimmed' : ''}`}>
      {/* วงแหวนรอบนอก = ความคืบหน้าของทั้งเซสชัน (เช่น 2 นาทีของทอดสมอใจ) */}
      <svg viewBox="0 0 100 100" className="breath-visual__session-ring" aria-hidden="true">
        <circle cx="50" cy="50" r={RING_RADIUS} className="breath-visual__ring-track" />
        <circle
          cx="50" cy="50" r={RING_RADIUS} className="breath-visual__ring-fill"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - sessionProgress)}
        />
      </svg>

      {/* ระลอกคลื่นแผ่ออก — เห็นชัดเฉพาะตอนหายใจเข้า ให้รู้สึกว่า "ดึงลมเข้ามา" */}
      <span className="breath-visual__ripple breath-visual__ripple--1" aria-hidden="true" />
      <span className="breath-visual__ripple breath-visual__ripple--2" aria-hidden="true" />

      {mode === 'leaves' && leaves.map((leaf, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="breath-visual__leaf"
          style={{
            transform: `rotate(${leaf.angle}deg) translateY(-${leaf.distance * (0.55 + scale * 0.45)}px) rotate(${-leaf.angle}deg)`,
            fontSize: leaf.size,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          {leaf.glyph}
        </span>
      ))}

      {/* แกนกลาง: วงกลมลมหายใจ ขยายเข้า-ออกตามจังหวะจริง */}
      <div className="breath-visual__orb" style={{ transform: `scale(${scale})` }}>
        <div className="breath-visual__orb-core" />
      </div>

      {/* วงแหวนอักขระหมุนช้าๆ — องค์ประกอบ "แฟนตาซีล้ำสมัย" ตาม Art Direction */}
      <div className="breath-visual__rune-ring" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="breath-visual__rune" style={{ transform: `rotate(${i * 45}deg) translateY(-78px)` }} />
        ))}
      </div>

      {/* ตัวเลขนับถอยหลังของเฟส — จุดโฟกัสสายตาระหว่างฝึก */}
      <div className="breath-visual__count" aria-live="off">
        {phaseRemainingSec}
      </div>
    </div>
  )
}