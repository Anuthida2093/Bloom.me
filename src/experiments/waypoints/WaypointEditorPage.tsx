import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { JOURNEY_MAPS } from '../../config/journeyMaps'
import { MAP_PATH_POINTS, buildJourneyPathD, type MapPathPoints } from '../../components/quest/games/physical/journeyPathMath'

/*============================================================================*\
  WaypointEditorPage — /dev/waypoints (เฉพาะ npm run dev — ไม่อยู่ใน build จริง)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ — จุดเส้นทางให้ตรงถนนจริงของแต่ละแผนที่] เครื่องมือปักจุดเส้นทางเควสก้าวเพื่อสุขภาพ:
    - เลือกแผนที่ → คลิกไล่ตามถนนจากทางเข้าไปทางออก (จุดแรก = Start, จุดสุดท้าย = End/หีบ)
    - ลากจุดเพื่อปรับ · คลิกขวาที่จุด = ลบ · Ctrl+Z / ปุ่มย้อน = ย้อนการกระทำล่าสุด
    - เห็นเส้นโค้งจริงทันที (Catmull-Rom สูตรเดียวกับเกม — นกฮูกเดินตามเส้นนี้)
    - คัดลอกโค้ด → วางแทนรายการของแผนที่นั้นใน MAP_PATH_POINTS (journeyPathMath.ts)
  ร่างที่ปักไว้จำในเครื่อง (localStorage) แยกตามแผนที่ ปิดหน้าแล้วกลับมาทำต่อได้
\*============================================================================*/

type Pt = { x: number; y: number; via?: boolean }
const DRAFT_KEY = (id: string) => `bloom.dev.waypoints.${id}`
const round1 = (v: number) => Math.round(v * 10) / 10

function loadDraft(id: string): Pt[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(id))
    if (raw) return JSON.parse(raw) as Pt[]
  } catch { /* ไม่มีร่าง */ }
  const p = MAP_PATH_POINTS[id]
  return p ? [p.start, ...p.points, p.end] : []
}

function toCode(id: string, name: string, pts: Pt[]): string {
  if (pts.length < 2) return '// ต้องมีอย่างน้อย 2 จุด (Start + End)'
  const [start, ...rest] = pts
  const end = rest.pop() as Pt
  const fmt = (p: Pt) => `{ x: ${round1(p.x)}, y: ${round1(p.y)}${p.via ? ', via: true' : ''} }`
  let n = 0
  return [
    `  // ── ${name} ──`,
    `  '${id}': {`,
    `    start: ${fmt(start)},`,
    `    points: [`,
    ...rest.map((p) => (p.via ? `      ${fmt(p)},` : `      ${fmt(p)}, // ${++n}`)),
    `    ],`,
    `    end: ${fmt(end)},`,
    `  },`,
  ].join('\n')
}

export default function WaypointEditorPage() {
  const [mapId, setMapId] = useState(JOURNEY_MAPS[0].id)
  const map = JOURNEY_MAPS.find((m) => m.id === mapId)!
  const [points, setPoints] = useState<Pt[]>(() => loadDraft(JOURNEY_MAPS[0].id))
  const history = useRef<Pt[][]>([])
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY(mapId), JSON.stringify(points)) } catch { /* storage ปิด */ }
  }, [mapId, points])

  const commit = (next: Pt[]) => {
    history.current.push(points)
    setPoints(next)
  }
  const undo = () => {
    const prev = history.current.pop()
    if (prev) setPoints(prev)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const switchMap = (id: string) => {
    history.current = []
    setMapId(id)
    setPoints(loadDraft(id))
  }

  const pctFromEvent = (e: { clientX: number; clientY: number }): Pt => {
    const r = boxRef.current!.getBoundingClientRect()
    return {
      x: round1(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))),
      y: round1(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100))),
    }
  }

  const handleBoxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragIdx !== null || (e.target as Element).closest('[data-wp]')) return
    commit([...points, pctFromEvent(e)])
  }

  const startDrag = (e: ReactPointerEvent<SVGCircleElement>, i: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    history.current.push(points)
    setDragIdx(i)
  }
  const moveDrag = (e: ReactPointerEvent<SVGCircleElement>) => {
    if (dragIdx === null) return
    const p = pctFromEvent(e)
    setPoints((list) => list.map((q, i) => (i === dragIdx ? p : q)))
  }
  const endDrag = () => window.setTimeout(() => setDragIdx(null), 0)

  const pathD = useMemo(() => {
    if (points.length < 2) return ''
    const def: Pick<MapPathPoints, 'start' | 'points' | 'end'> = { start: points[0], points: points.slice(1, -1), end: points[points.length - 1] }
    return buildJourneyPathD({ entryPct: def.start, waypoints: def.points, exitPct: def.end })
  }, [points])

  const code = toCode(map.id, map.name, points)

  return (
    <div style={{ minHeight: '100vh', background: '#14211b', color: '#eef', padding: 16, fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>🗺️ ปักจุดเส้นทางเควสก้าว (dev)</h1>
      <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.8 }}>
        คลิกไล่ตามถนนจากทางเข้าไปทางออก · ลากจุดเพื่อปรับ · คลิกขวาที่จุด = ลบ · Ctrl+Z = ย้อน · จุดแรก = Start (เขียว) จุดสุดท้าย = End/หีบ (ทอง)
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {JOURNEY_MAPS.map((m) => (
          <button key={m.id} type="button" onClick={() => switchMap(m.id)}
            style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid #6a8', cursor: 'pointer', background: m.id === mapId ? '#6a8' : 'transparent', color: '#fff' }}>
            {m.order}. {m.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div ref={boxRef} onClick={handleBoxClick}
          style={{ position: 'relative', width: 'min(92vw, 80vh, 820px)', aspectRatio: '1 / 1', cursor: 'crosshair', userSelect: 'none', flexShrink: 0 }}>
          <img src={map.artAsset} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            {pathD && <path d={pathD} fill="none" stroke="#8FDBFF" strokeWidth={0.7} strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 0.6px #000)' }} />}
            {points.map((p, i) => {
              const last = i === points.length - 1
              return (
                <g key={i} data-wp="">
                  <circle cx={p.x} cy={p.y} r={1.3}
                    fill={i === 0 ? '#4ADE80' : last ? '#FFC93C' : '#3BA7FF'} stroke="#fff" strokeWidth={0.3}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => startDrag(e, i)} onPointerMove={moveDrag} onPointerUp={endDrag}
                    onContextMenu={(e) => { e.preventDefault(); commit(points.filter((_, j) => j !== i)) }}
                  />
                  <text x={p.x} y={p.y - 2} fontSize={1.8} fill="#fff" stroke="#000" strokeWidth={0.25} paintOrder="stroke" textAnchor="middle" pointerEvents="none">
                    {i === 0 ? 'Start' : last ? 'End' : i}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={undo}>↩︎ ย้อน</button>
            <button type="button" onClick={() => commit([])}>ล้างทั้งหมด</button>
            <button type="button" onClick={() => { history.current = []; try { localStorage.removeItem(DRAFT_KEY(mapId)) } catch { /* */ } ; setPoints(loadDraft(mapId)) }}>กลับไปค่าในโค้ด</button>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(code).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }) }}>
              {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกโค้ด'}
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.8, margin: '0 0 6px' }}>{points.length} จุด วางแทนรายการ '{map.id}' ใน MAP_PATH_POINTS (src/components/quest/games/physical/journeyPathMath.ts)</p>
          <textarea readOnly value={code} style={{ width: '100%', height: 360, fontFamily: 'ui-monospace, monospace', fontSize: 12, background: '#0b1310', color: '#cfe', border: '1px solid #354', borderRadius: 8, padding: 8, boxSizing: 'border-box' }} />
        </div>
      </div>
    </div>
  )
}
