import { useMemo, useState, type MouseEvent } from 'react'
import type { MapDef } from '../../../../types.journey'
import { buildJourneyPathD, MAP_NATIVE_SIZE, markerWaypoints, waypointPathPcts, withLivePath } from './journeyPathMath'
import './MapPathRenderer.css'

/** โหมดช่วยแก้จุดเส้นทาง: เติม ?editPath ท้าย URL → แตะแผนที่แล้วขึ้นพิกัด x,y (%) ของจุดที่แตะ
 *  เอาไปใส่ใน MAP_PATH_POINTS (journeyPathMath.ts) ได้ตรงๆ — ปกติปิดอยู่ ผู้เล่นไม่เห็น */
/** จำนวนจุดต่อป้อม 1 ป้อม */
const FORT_EVERY = 5

const EDIT_PATH_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('editPath')

/** ตัวอักษรบนจุด (Start / เลขจุด) — [แก้ตามที่ระบุ] บางลงและสวยขึ้น: ฟอนต์บาง (300) ขอบเงาน้ำเงินเข้มบางมาก
 *  แทนขอบดำหนา (หน่วย viewBox 0-100 → 1.25 ≈ 13px บนภาพ 1024px) ปรับได้ที่นี่ที่เดียว */
const LABEL_PROPS = {
  fontSize: 1.25,
  fontWeight: 300,
  fontFamily: 'var(--font-display)',
  letterSpacing: 0.04,
  fill: '#ffffff',
  stroke: 'rgba(10, 40, 80, 0.75)',
  strokeWidth: 0.12,
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
  // ระยะตามเส้นทางของแต่ละจุด → นกฮูกผ่านจุดไหนแล้ว (เรืองแสง) / จุดล่าสุดที่เพิ่งถึง (กะพริบเรือง)
  const pathKey = JSON.stringify([mapDef.entryPct, mapDef.waypoints, mapDef.exitPct])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wpPcts = useMemo(() => waypointPathPcts(mapDef), [pathKey])
  const lastReached = wpPcts.reduce((last, pct, i) => (pct <= clampedProgress + 0.3 ? i : last), -1)

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
        {/* [แก้ตามที่ระบุ] ไม่แสดงเส้นทางให้เห็น (ยังใช้คำนวณตำแหน่งนกฮูก/จุดตามเดิม) — โหมด ?editPath ยังเห็นเส้นไว้จูนจุด */}
        {EDIT_PATH_MODE && <path d={pathD} pathLength={100} className="map-path-renderer__path-bg" />}

        <defs>
          <radialGradient id="mpr-dot-fill" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#E6F6FF" />
            <stop offset="55%" stopColor="#5BC0FF" />
            <stop offset="100%" stopColor="#1E78D8" />
          </radialGradient>
          <radialGradient id="mpr-dot-glow">
            <stop offset="0%" stopColor="#8FDBFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#8FDBFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* จุดเริ่มต้น (Start) */}
        <circle cx={mapDef.entryPct.x} cy={mapDef.entryPct.y} r="1.1" className="mpr-dot mpr-dot--start" />
        <text x={mapDef.entryPct.x} y={mapDef.entryPct.y - 1.7} {...LABEL_PROPS}>Start</text>

        {/* [แก้ตามที่ระบุ] จุดระหว่างทาง: สีฟ้า (เดิมส้มขอบดำ) — ยังไม่ถึง = ฟ้าใสขอบขาว · ผ่านแล้ว = ฟ้าเข้มมีแสงเรือง
            · จุดที่นกฮูกเพิ่งไปถึง = วงแสงกะพริบขยายออก (จุดสิ้นสุดเป็นหีบสมบัติ — StepChestMarker) */}
        {markerWaypoints(mapDef).map((wp, i) => {
          const reached = i <= lastReached
          // [แก้ตามที่ระบุ] ทุก 5 จุดเป็นป้อม 1 ป้อม (จุดที่ 5, 10, 15 ...)
          if ((i + 1) % FORT_EVERY === 0) {
            return (
              <g key={i} className={`mpr-fort${reached ? ' mpr-fort--reached' : ''}${i === lastReached ? ' mpr-wp--arrived' : ''}`}>
                {reached && <circle cx={wp.x} cy={wp.y - 0.6} r="3.4" fill="url(#mpr-dot-glow)" className="mpr-wp__glow" />}
                <g transform={`translate(${wp.x} ${wp.y})`}>
                  <line x1="0" y1="-2.2" x2="0" y2="-3.7" className="mpr-fort__pole" />
                  <path d="M0 -3.7 L1.3 -3.3 L0 -2.9 Z" className="mpr-fort__flag" />
                  <path d="M-1.7 -2.3 h0.8 v0.6 h0.5 v-0.6 h0.8 v0.6 h0.5 v-0.6 h0.8 v3.2 h-3.4 Z" className="mpr-fort__wall" />
                  <path d="M-0.45 0.9 v-0.9 a0.45 0.45 0 0 1 0.9 0 v0.9 Z" className="mpr-fort__door" />
                </g>
                <text x={wp.x} y={wp.y - 4.2} {...LABEL_PROPS}>{i + 1}</text>
              </g>
            )
          }
          return (
            <g key={i} className={`mpr-wp${reached ? ' mpr-wp--reached' : ''}${i === lastReached ? ' mpr-wp--arrived' : ''}`}>
              {reached && <circle cx={wp.x} cy={wp.y} r="2.2" fill="url(#mpr-dot-glow)" className="mpr-wp__glow" />}
              {i === lastReached && <circle cx={wp.x} cy={wp.y} r="0.9" className="mpr-wp__ring" />}
              <circle cx={wp.x} cy={wp.y} r={reached ? 0.85 : 0.7} fill={reached ? 'url(#mpr-dot-fill)' : 'rgba(150, 215, 255, 0.55)'} className="mpr-wp__dot" />
              <text x={wp.x} y={wp.y - 1.3} {...LABEL_PROPS}>{i + 1}</text>
            </g>
          )
        })}

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