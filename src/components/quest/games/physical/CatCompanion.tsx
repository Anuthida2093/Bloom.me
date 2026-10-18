import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapDef } from '../../../../types.journey'
import { OWL_AVATAR_ICON } from '../../../../config/iconAssets'
import { poseAtPathPct, samplePath, withLivePath } from './journeyPathMath'
import { usePrefersReducedMotion } from '../../../../hooks/useMediaQuery'
import './CatCompanion.css'

/*============================================================================*\
  CatCompanion.tsx — ตัวละครนำทาง (นกฮูก OwlAvatar) ที่เดินตามเส้นทางบนแผนที่ Step Journey
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ — เดินตามเส้นทาง + หันตามทิศ] เดิมย้ายตำแหน่งด้วย CSS transition ของ left/top
  ซึ่งเคลื่อนเป็น "เส้นตรง" จากจุดเก่าไปจุดใหม่ — ตัดมุมโค้งของถนนทุกครั้งที่ก้าวเพิ่มทีละมาก และไม่เคย
  หันตามทาง ตอนนี้ไล่ค่า progress ทีละเฟรม (requestAnimationFrame) แล้ววางตามจุดบนเส้นโค้งจริงทุกเฟรม
  (poseAtPathPct — สูตรเดียวกับเส้นที่ MapPathRenderer วาด) · หันซ้าย/ขวาตามทิศที่เดิน + เอียงตามความชัน
\*============================================================================*/

interface CatCompanionProps {
  mapDef: MapDef
  /** 0-100 */
  progressPct: number
}

interface OwlPose { x: number; y: number; facing: 1 | -1; tilt: number }

/** เวลาเดินจากตำแหน่งเดิมไปตำแหน่งใหม่ (ms) — ยิ่งไกลยิ่งนาน แต่ไม่เกินเพดาน */
const walkDuration = (deltaPct: number) => Math.min(2400, 500 + Math.abs(deltaPct) * 60)
/** เอียงตัวตามความชันของทางได้ไม่เกินเท่านี้ (องศา) — มากกว่านี้ดูเหมือนล้ม */
const MAX_TILT = 14

function poseOf(samples: ReturnType<typeof samplePath>, pct: number, prevFacing: 1 | -1): OwlPose {
  const p = poseAtPathPct(samples, pct)
  // ทางแทบตั้งตรง (dx ใกล้ 0) → คงทิศเดิม ไม่สะบัดหน้าไปมา
  const facing: 1 | -1 = Math.abs(p.dx) > 0.02 ? (p.dx >= 0 ? 1 : -1) : prevFacing
  const slope = Math.atan2(p.dy, Math.abs(p.dx) || 1e-6) * (180 / Math.PI)
  return { x: p.x, y: p.y, facing, tilt: Math.max(-MAX_TILT, Math.min(MAX_TILT, slope)) * facing }
}

export default function CatCompanion({ mapDef, progressPct }: CatCompanionProps) {
  const live = withLivePath(mapDef)
  // คีย์ของเส้นทาง — คำนวณจุดตัวอย่างใหม่เฉพาะเมื่อจุดเส้นทางเปลี่ยนจริง (ไม่ใช่ทุก render)
  const pathKey = JSON.stringify([live.entryPct, live.waypoints, live.exitPct])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const samples = useMemo(() => samplePath(live), [pathKey])
  const reducedMotion = usePrefersReducedMotion()
  const target = Math.min(100, Math.max(0, progressPct))

  const shownRef = useRef(target)
  const facingRef = useRef<1 | -1>(1)
  const [pose, setPose] = useState<OwlPose>(() => poseOf(samples, target, 1))
  const [walking, setWalking] = useState(false)

  useEffect(() => {
    const from = shownRef.current
    const apply = (pct: number) => {
      shownRef.current = pct
      const next = poseOf(samples, pct, facingRef.current)
      facingRef.current = next.facing
      setPose(next)
    }
    if (reducedMotion || Math.abs(target - from) < 0.01) {
      apply(target)
      return
    }
    const duration = walkDuration(target - from)
    const start = performance.now()
    let raf = 0
    setWalking(true)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      apply(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
      else setWalking(false)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reducedMotion, samples])

  return (
    <img
      src={OWL_AVATAR_ICON}
      alt=""
      className={`cat-companion${walking ? ' cat-companion--walking' : ''}`}
      style={{
        left: `${pose.x}%`,
        top: `${pose.y}%`,
        transform: `translate(-50%, -68%) rotate(${pose.tilt}deg) scaleX(${pose.facing})`,
      }}
    />
  )
}
