import { useMemo } from 'react'
import type { MapDef } from '../../../../types.journey'
import { OWL_AVATAR_ICON } from '../../../../config/iconAssets'
import { getPointAtProgress } from './journeyPathMath'
import './CatCompanion.css'

/*============================================================================*\
  CatCompanion.tsx — ตัวละครนำทางที่เดินตามเส้นทางบนแผนที่ Step Journey
  ────────────────────────────────────────────────────────────────────────────
  [ยังไม่มี asset แมวจริง] ใช้ OwlAvatar.png ที่มีอยู่แล้วในระบบไปพลางก่อนตามที่ระบุ
  (เลือกรูปจริงแทน emoji ลอยๆ เพราะสัดส่วน/drop-shadow ปรับแต่งไว้แล้วสำหรับรูปนี้จากเควสเดิม)
  ตำแหน่งคำนวณผ่าน getPointAtProgress() ใน journeyPathMath.ts (SVG DOM API เดียวกับที่
  MapPathRenderer.tsx ใช้วาดเส้น) — วางด้วย position:absolute ตาม {x,y}% แล้วปล่อยให้ CSS
  transition จัดการเคลื่อนที่นุ่มนวลเอง
\*============================================================================*/

interface CatCompanionProps {
  mapDef: MapDef
  /** 0-100 */
  progressPct: number
}

export default function CatCompanion({ mapDef, progressPct }: CatCompanionProps) {
  const { x, y } = useMemo(() => getPointAtProgress(mapDef, progressPct), [mapDef, progressPct])

  return (
    <img
      src={OWL_AVATAR_ICON}
      alt=""
      className="cat-companion"
      style={{ left: `${x}%`, top: `${y}%` }}
    />
  )
}
