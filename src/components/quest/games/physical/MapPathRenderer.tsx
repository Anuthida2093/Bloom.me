import { useState } from 'react'
import type { MapDef } from '../../../../types.journey'
import { buildJourneyPathD, MAP_NATIVE_SIZE } from './journeyPathMath'
import './MapPathRenderer.css'

/*============================================================================*\
  MapPathRenderer.tsx — วาดพื้นหลัง (ภาพแผนที่จริง) + เส้นทางของ 1 แผนที่ในเควส Step Journey
  ────────────────────────────────────────────────────────────────────────────
  พื้นหลัง: ภาพจริงอยู่ที่ public/assets/images/mini-game/vitality-steps/map-0N.jpg แล้ว —
  <img onError> ยังคงไว้เป็นเซฟตี้เน็ตเฉยๆ (เผื่อไฟล์หาย/พาธผิด) ไม่ใช่ทางหลักแบบเฟสก่อนหน้า
  ที่ภาพยังไม่มีจริง

  [แก้รอบนี้ — ปรับ layout เต็มจอ] เดิมกล่องนี้ตั้ง width:100%/aspect-ratio:1/1 (สมมติว่า
  viewport ข้างนอกเป็นจัตุรัสเสมอ) ตอนนี้ viewport เต็มพื้นที่ที่เหลือ (ไม่จัตุรัสแล้ว) จึงต้อง
  ตั้งขนาดกล่องนี้เป็น "ขนาดจริงของภาพ" (MAP_NATIVE_SIZE, 1024x1024px) ตายตัวเสมอแทน แล้วให้
  useMapPanZoom.ts (เรียกจาก StepJourneyGame.tsx) เป็นคนคำนวณ transform (scale+translate) มา
  ครอบ/เลื่อนกล่องนี้ทั้งก้อนให้เต็ม viewport แบบเดียวกับหลักการ object-fit:cover — พิกัด % ของ
  เส้นทาง/ตัวละครที่วางอยู่ในกล่องขนาดคงที่นี้จึงตรงกับภาพเสมอไม่ว่า viewport จะเป็นสัดส่วนไหน
  (ดู comment เต็มใน useMapPanZoom.ts ว่าทำไมไม่ใช้ <img object-fit:cover> ตรงๆ)

  เส้นทาง: ลาก SVG <path> ผ่าน entryPct → waypoints → exitPct เป็นเส้นตรงต่อกัน (ยังไม่ใช่
  เส้นโค้ง Bezier สวยงาม — waypoints เป็นค่าประมาณ รอวัดพิกัดจริงละเอียดจากภาพในเฟสหลัง — ดู
  journeyMaps.ts) ใช้ viewBox="0 0 100 100" ตรงกับพิกัด % ของ waypoints พอดี จึงไม่ต้องแปลงหน่วย
  — geometry ของเส้น (buildJourneyPathD) + getPointAtProgress() อยู่แยกใน journeyPathMath.ts
  เพราะไฟล์ component ต้อง export เฉพาะ component เท่านั้น (react-refresh/only-export-components)
\*============================================================================*/

interface MapPathRendererProps {
  mapDef: MapDef
  /** 0-100 */
  progressPct: number
}

export default function MapPathRenderer({ mapDef, progressPct }: MapPathRendererProps) {
  const [artFailed, setArtFailed] = useState(false)
  const clampedProgress = Math.min(100, Math.max(0, progressPct))
  const pathD = buildJourneyPathD(mapDef)

  return (
    <div
      className="map-path-renderer"
      style={{ width: MAP_NATIVE_SIZE.width, height: MAP_NATIVE_SIZE.height }}
    >
      <div className="map-path-renderer__fallback-bg" aria-hidden="true" />
      {!artFailed && (
        <img
          src={mapDef.artAsset}
          alt=""
          className="map-path-renderer__art"
          onError={() => setArtFailed(true)}
        />
      )}

      <svg className="map-path-renderer__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={pathD} pathLength={100} className="map-path-renderer__path-bg" />
        <path
          d={pathD}
          pathLength={100}
          className="map-path-renderer__path-progress"
          style={{ strokeDasharray: 100, strokeDashoffset: 100 - clampedProgress }}
        />
      </svg>

      <span
        className="map-path-renderer__flag"
        style={{ left: `${mapDef.entryPct.x}%`, top: `${mapDef.entryPct.y}%` }}
      >
        🌱
      </span>
      <span
        className="map-path-renderer__flag"
        style={{ left: `${mapDef.exitPct.x}%`, top: `${mapDef.exitPct.y}%` }}
      >
        🚩
      </span>
    </div>
  )
}
