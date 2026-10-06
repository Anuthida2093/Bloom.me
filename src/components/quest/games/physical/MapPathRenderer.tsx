import { useState, type MouseEvent } from 'react'
import type { MapDef } from '../../../../types.journey'
import { buildJourneyPathD, MAP_NATIVE_SIZE, withLivePath } from './journeyPathMath'
import './MapPathRenderer.css'

/** โหมดช่วยแก้จุดเส้นทาง: เติม ?editPath ท้าย URL → แตะแผนที่แล้วขึ้นพิกัด x,y (%) ของจุดที่แตะ
 *  เอาไปใส่ใน MAP_PATH_POINTS (journeyPathMath.ts) ได้ตรงๆ — ปกติปิดอยู่ ผู้เล่นไม่เห็น */
const EDIT_PATH_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('editPath')

/** ตัวอักษรบนจุด (Start / เลขจุด / End) — เล็กและบาง ขอบดำบางๆ ให้อ่านออกบนภาพทุกสี
 *  (หน่วย viewBox 0-100 → 1.3 ≈ 13px บนภาพ 1024px) ปรับขนาด/ความหนาได้ที่นี่ที่เดียว */
const LABEL_PROPS = {
  fontSize: 1.3,
  fontWeight: 500,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 0.18,
  paintOrder: 'stroke',
  textAnchor: 'middle',
} as const

interface MapPathRendererProps {
  mapDef: MapDef
  progressPct: number
}

export default function MapPathRenderer({ mapDef: mapDefProp, progressPct }: MapPathRendererProps) {
  // อ่านจุดจาก MAP_PATH_POINTS ทุกครั้งที่ render — แก้ตัวเลขแล้วจุด/เส้นย้ายตามทันที
  const mapDef = withLivePath(mapDefProp)
  const [artFailed, setArtFailed] = useState(false)
  const clampedProgress = Math.min(100, Math.max(0, progressPct))
  const pathD = buildJourneyPathD(mapDef)
  const [picked, setPicked] = useState<{ x: number; y: number } | null>(null)

  const handlePick = (e: MouseEvent<HTMLDivElement>) => {
    if (!EDIT_PATH_MODE) return
    // getBoundingClientRect รวม scale/pan ของแผนที่แล้ว — ได้ % ของภาพจริงไม่ว่าซูมอยู่แค่ไหน
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setPicked({ x, y })
    console.info(`[editPath] ${mapDef.id}: { x: ${x}, y: ${y} }`)
  }

  return (
    <div
      className="map-path-renderer"
      style={{ width: MAP_NATIVE_SIZE.width, height: MAP_NATIVE_SIZE.height }}
      onClick={EDIT_PATH_MODE ? handlePick : undefined}
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

        {/* จุดเริ่มต้น (Start) */}
        <circle cx={mapDef.entryPct.x} cy={mapDef.entryPct.y} r="1.1" fill="#4ADE80" stroke="#000" strokeWidth="0.25" />
        <text x={mapDef.entryPct.x} y={mapDef.entryPct.y - 1.6} {...LABEL_PROPS}>Start</text>

        {/* จุดระหว่างทาง (ทึบ ขอบดำหนา) */}
        {mapDef.waypoints.map((wp, i) => (
          <g key={i}>
            <circle cx={wp.x} cy={wp.y} r="0.7" fill="#F59E0B" stroke="#000" strokeWidth="0.2" />
            <text x={wp.x} y={wp.y - 1.2} {...LABEL_PROPS}>{i + 1}</text>
          </g>
        ))}

        {/* จุดสิ้นสุด (End) */}
        <circle cx={mapDef.exitPct.x} cy={mapDef.exitPct.y} r="1.1" fill="#EF4444" stroke="#000" strokeWidth="0.25" />
        <text x={mapDef.exitPct.x} y={mapDef.exitPct.y - 1.6} {...LABEL_PROPS}>End</text>

        {EDIT_PATH_MODE && picked && (
          <g>
            <circle cx={picked.x} cy={picked.y} r="1.2" fill="#3B82F6" stroke="#fff" strokeWidth="0.4" />
            <text x={picked.x + 1.6} y={picked.y + 0.5} {...LABEL_PROPS} fontSize="1.6" textAnchor="start">
              {`{ x: ${picked.x}, y: ${picked.y} }`}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}