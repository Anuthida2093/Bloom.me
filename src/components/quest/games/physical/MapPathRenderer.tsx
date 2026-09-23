import { useState } from 'react'
import type { MapDef } from '../../../../types.journey'
import { buildJourneyPathD, MAP_NATIVE_SIZE } from './journeyPathMath'
import './MapPathRenderer.css'

interface MapPathRendererProps {
  mapDef: MapDef
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

        {/* จุดเริ่มต้น (Start) */}
        <circle cx={mapDef.entryPct.x} cy={mapDef.entryPct.y} r="1.5" fill="#4ADE80" stroke="#000" strokeWidth="0.4" />
        <text x={mapDef.entryPct.x} y={mapDef.entryPct.y - 2.2} fontSize="2.2" fill="#ffffff" fontWeight="900" textAnchor="middle" stroke="#000000" strokeWidth="0.6">Start</text>

        {/* จุดระหว่างทาง (ทึบ ขอบดำหนา) */}
        {mapDef.waypoints.map((wp, i) => (
          <g key={i}>
            <circle cx={wp.x} cy={wp.y} r="1" fill="#F59E0B" stroke="#000" strokeWidth="0.4" />
            <text x={wp.x} y={wp.y - 1.8} fontSize="2" fill="#ffffff" fontWeight="900" textAnchor="middle" stroke="#000000" strokeWidth="0.6">{i + 1}</text>
          </g>
        ))}

        {/* จุดสิ้นสุด (End) */}
        <circle cx={mapDef.exitPct.x} cy={mapDef.exitPct.y} r="1.5" fill="#EF4444" stroke="#000" strokeWidth="0.4" />
        <text x={mapDef.exitPct.x} y={mapDef.exitPct.y - 2.2} fontSize="2.2" fill="#ffffff" fontWeight="900" textAnchor="middle" stroke="#000000" strokeWidth="0.6">End</text>
      </svg>
    </div>
  )
}