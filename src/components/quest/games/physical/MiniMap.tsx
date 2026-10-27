import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { MapDef } from '../../../../types.journey'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import { cachedMapArt } from './mapgen/renderMapArt'
import { generatedArtSize } from './mapArtLoader'
import { mapNativeSize, samplePath, withLivePath } from './journeyPathMath'
import { placesOf } from './mapPlaces'
import './MiniMap.css'

/*============================================================================*\
  MiniMap — [ใหม่ตามที่ระบุ] แผนที่ย่อมุมซ้ายบนของเควสก้าวเพื่อสุขภาพ (แทนปุ่ม/ป๊อปอัปแผนที่เดิม)
  ────────────────────────────────────────────────────────────────────────────
  - ภาพแผนที่ทั้งใบ (ภาพวาด หรือแผนที่โค้ดจากแคช) + เส้นทาง: ช่วงที่เดินแล้วสีฟ้าสว่าง ช่วงที่เหลือจาง
  - จุดเริ่ม · เส้นชัย (หีบ — เรืองแสงเมื่อถึงเป้า) · นกฮูกตั้งตรงที่ตำแหน่งปัจจุบัน (ไม่หมุน ไม่เอียงตามทาง)
  - กรอบบางๆ = ส่วนของแผนที่ที่เห็นอยู่บนจอหลัก (ตามการลาก/ซูม)
  - [ใหม่ตามที่ระบุ] ชื่อสถานที่บนแผนที่ (ปราสาทหิน ป่าพิศวง ...) จาก mapPlaces — ป้ายเล็กทั้งตอนย่อและตอนขยาย
    (ตอนขยายมีไอคอนด้วย) · ป้ายที่ทับกันเลื่อนลงให้อ่านได้ครบ
  - แถบชื่อใต้แผนที่: ชื่อแผนที่ + ก้าว x / y + เส้นความคืบหน้า
  - แตะ → ขยายเป็นแผนที่ใหญ่ (ดูความคืบหน้าอย่างเดียว) แตะอีกครั้ง/กด Esc/แตะพื้นหลัง → ย่อกลับ
  ตำแหน่ง/เส้นทางมาจาก samplePath + progressPct ชุดเดียวกับนกฮูก/จุด/หีบบนแผนที่หลัก (ไม่มีพิกัดเขียนมือ)
\*============================================================================*/

interface Props {
  mapDef: MapDef
  /** 0-100 ความคืบหน้าบนเส้นทาง (ค่าเดียวกับที่ส่งให้ CatCompanion) */
  progressPct: number
  steps: number
  goalSteps: number
  pan: { x: number; y: number }
  scale: number
}

const BLUE = '#4fb4ff'

/** ภาพพื้นหลังแผนที่ที่วาดลงมินิแมปได้ทันที (null = ยังไม่พร้อม) */
function useMapImage(mapDef: MapDef): CanvasImageSource | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (mapDef.generated) return
    const el = new Image()
    el.src = mapDef.artAsset
    let alive = true
    void el.decode().then(() => { if (alive) setImg(el) }, () => {})
    return () => { alive = false }
  }, [mapDef.generated, mapDef.artAsset])
  if (mapDef.generated) return cachedMapArt(mapDef.generated, generatedArtSize('scene'))?.image ?? null
  return img && img.src.endsWith(mapDef.artAsset) ? img : null
}

/** วาดมินิแมป (ขนาด size×size px CSS) — ฐาน + เส้นทาง + จุดเริ่ม/หีบ + นกฮูก + กรอบส่วนที่เห็น */
function drawMini(
  cv: HTMLCanvasElement, size: number, art: CanvasImageSource | null, route: { x: number; y: number; len: number }[],
  pct: number, done: boolean, view: { x: number; y: number; w: number; h: number } | null,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr)
  const c = cv.getContext('2d')
  if (!c) return
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.fillStyle = '#2f6a3a'
  c.fillRect(0, 0, size, size)
  if (art) c.drawImage(art, 0, 0, size, size)
  const k = size / 100
  const total = route.length ? route[route.length - 1].len : 0
  const cut = (total * Math.min(100, Math.max(0, pct))) / 100
  const line = (from: number, to: number) => {
    c.beginPath()
    let started = false
    for (const p of route) {
      if (p.len < from || p.len > to) continue
      if (!started) { c.moveTo(p.x * k, p.y * k); started = true } else c.lineTo(p.x * k, p.y * k)
    }
  }
  c.lineCap = 'round'; c.lineJoin = 'round'
  // ช่วงที่ยังไม่เดิน — จาง
  line(cut, total)
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(2, size * 0.018); c.setLineDash([size * 0.03, size * 0.025]); c.stroke()
  c.setLineDash([])
  // ช่วงที่เดินแล้ว — ฟ้าสว่าง ขอบขาว
  line(0, cut)
  c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = Math.max(4, size * 0.04); c.stroke()
  c.strokeStyle = BLUE; c.lineWidth = Math.max(2.4, size * 0.025); c.stroke()
  if (route.length) {
    const s = route[0], g = route[route.length - 1]
    c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x * k, s.y * k, size * 0.028, 0, Math.PI * 2); c.fill()
    c.fillStyle = BLUE; c.beginPath(); c.arc(s.x * k, s.y * k, size * 0.017, 0, Math.PI * 2); c.fill()
    // หีบที่เส้นชัย (ถึงเป้า = เรืองแสง)
    const gx = g.x * k, gy = g.y * k, r = Math.min(14, size * 0.05)
    if (done) {
      const gl = c.createRadialGradient(gx, gy, 0, gx, gy, r * 3)
      gl.addColorStop(0, 'rgba(255,224,120,.95)'); gl.addColorStop(1, 'rgba(255,224,120,0)')
      c.fillStyle = gl; c.beginPath(); c.arc(gx, gy, r * 3, 0, Math.PI * 2); c.fill()
    }
    c.fillStyle = '#8a5a2b'; c.beginPath(); c.roundRect(gx - r, gy - r * 0.7, r * 2, r * 1.5, r * 0.3); c.fill()
    c.fillStyle = '#c98a3e'; c.beginPath(); c.roundRect(gx - r, gy - r * 0.95, r * 2, r * 0.7, [r * 0.5, r * 0.5, r * 0.15, r * 0.15]); c.fill()
    c.fillStyle = '#f5c84a'; c.fillRect(gx - r * 0.18, gy - r * 0.4, r * 0.36, r * 0.4)
  }
  // กรอบส่วนที่เห็นบนจอหลัก
  if (view) {
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5
    c.setLineDash([4, 3])
    c.strokeRect(view.x * size, view.y * size, view.w * size, view.h * size)
    c.setLineDash([])
  }
  // ตัวละคร (คน) — ตั้งตรงเสมอ (ไม่หมุน): หน้า + ผม
  if (route.length) {
    let i = 0
    while (i < route.length - 1 && route[i].len < cut) i++
    const ox = route[i].x * k, oy = route[i].y * k, R = Math.min(15, Math.max(7, size * 0.07))
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ox, oy, R + 2, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ffddbf'; c.beginPath(); c.arc(ox, oy, R, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#5a3720'
    c.beginPath(); c.arc(ox, oy, R, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(ox, oy - R * 0.25, ox - R, oy - R * 0.05); c.fill()
    c.fillStyle = '#2a1e2e'
    c.beginPath(); c.arc(ox - R * 0.36, oy + R * 0.18, R * 0.13, 0, Math.PI * 2); c.arc(ox + R * 0.36, oy + R * 0.18, R * 0.13, 0, Math.PI * 2); c.fill()
    c.fillStyle = 'rgba(244,120,120,.5)'
    c.beginPath(); c.ellipse(ox - R * 0.58, oy + R * 0.48, R * 0.18, R * 0.11, 0, 0, Math.PI * 2); c.ellipse(ox + R * 0.58, oy + R * 0.48, R * 0.18, R * 0.11, 0, 0, Math.PI * 2); c.fill()
  }
}

function MiniCanvas({ mapDef, progressPct, size, view, className }: { mapDef: MapDef; progressPct: number; size: number; view: { x: number; y: number; w: number; h: number } | null; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const art = useMapImage(mapDef)
  const live = withLivePath(mapDef)
  const pathKey = JSON.stringify([live.entryPct, live.waypoints, live.exitPct])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const route = useMemo(() => samplePath(live, 24).map((s) => ({ x: s.pt.x, y: s.pt.y, len: s.len })), [pathKey])
  const done = progressPct >= 100
  useLayoutEffect(() => {
    if (ref.current) drawMini(ref.current, size, art, route, progressPct, done, view)
  }, [size, art, route, progressPct, done, view])
  return (
    <span className="mini-map__canvas-wrap" style={{ width: size, height: size }}>
      <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />
      <MiniPlaces mapDef={mapDef} size={size} />
    </span>
  )
}

/** ป้ายชื่อสถานที่บนมินิแมป — ย่อ: ตัวเล็ก ไม่มีไอคอน · ขยาย: มีไอคอน · ป้ายที่ทับกันเลื่อนลง ไม่ล้นขอบ */
function MiniPlaces({ mapDef, size }: { mapDef: MapDef; size: number }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const places = useMemo(() => placesOf(mapDef), [mapDef.id, mapDef.generated?.seed])
  const big = size >= 240
  const font = big ? Math.round(Math.max(11, Math.min(14, size * 0.026))) : Math.round(Math.max(8, Math.min(11, size * 0.068)))
  const h = font * 1.6
  const laid = useMemo(() => {
    const out: { id: string; text: string; icon: string; left: number; top: number }[] = []
    const boxes: { l: number; t: number; r: number; b: number }[] = []
    for (const q of places) {
      // ความกว้างโดยประมาณ (อักษรไทย ~0.62em) — ใช้แค่กันป้ายทับกัน/ล้นขอบ
      const w = (q.text.length * 0.62 + (big ? 1.6 : 0)) * font + 8
      let left = Math.max(2, Math.min(size - w - 2, (q.x / 100) * size - w / 2))
      let top = Math.max(2, Math.min(size - h - 2, (q.y / 100) * size - h / 2))
      for (let n = 0; n < 6 && boxes.some((b) => left < b.r && left + w > b.l && top < b.b && top + h > b.t); n++) {
        top = Math.min(size - h - 2, top + h + 1)
        if (top >= size - h - 2) left = Math.max(2, left - w * 0.5)
      }
      boxes.push({ l: left, t: top, r: left + w, b: top + h })
      out.push({ id: q.id, text: q.text, icon: q.icon, left, top })
    }
    return out
  }, [places, size, font, h, big])
  if (!laid.length) return null
  return (
    <span className="mini-map__places" aria-hidden="true">
      {laid.map((l) => (
        <span key={l.id} className="mini-map__place" style={{ left: l.left, top: l.top, fontSize: font, height: h }}>
          {big && <span className="mini-map__place-icon">{l.icon}</span>}{l.text}
        </span>
      ))}
    </span>
  )
}

export default function MiniMap({ mapDef, progressPct, steps, goalSteps, pan, scale }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState({ w: 0, h: 0 })
  const [expanded, setExpanded] = useState(false)
  useEscapeKey(() => setExpanded(false), expanded)

  // ขนาดตามจอ: ~28% ของด้านสั้น จำกัด 96-180 px · ขนาดกรอบจอหลัก (ไว้คิดกรอบส่วนที่เห็น)
  useEffect(() => {
    const root = boxRef.current?.parentElement
    if (!root) return
    const ro = new ResizeObserver(() => setFrame({ w: root.clientWidth, h: root.clientHeight }))
    ro.observe(root)
    return () => ro.disconnect()
  }, [])
  const size = Math.round(Math.max(96, Math.min(180, Math.min(frame.w, frame.h) * 0.28)))
  const native = mapNativeSize(mapDef)
  const view = useMemo(() => {
    if (!frame.w || scale <= 0) return null
    const x = (-pan.x / scale) / native.width, y = (-pan.y / scale) / native.height
    const w = frame.w / scale / native.width, h = frame.h / scale / native.height
    const cx = Math.max(0, x), cy = Math.max(0, y)
    return { x: cx, y: cy, w: Math.min(1, x + w) - cx, h: Math.min(1, y + h) - cy }
  }, [pan.x, pan.y, scale, frame.w, frame.h, native.width, native.height])

  const ratio = Math.min(1, goalSteps > 0 ? steps / goalSteps : 0)
  // ไม่ให้แตะ/ลากบนมินิแมปไปเริ่มลากแผนที่หลัก
  const stop = (e: ReactPointerEvent) => e.stopPropagation()
  const bigSize = Math.round(Math.min(560, Math.min(window.innerWidth, window.innerHeight) * 0.86))

  return (
    <>
      <div ref={boxRef} className="mini-map" style={{ width: size }} onPointerDown={stop} onPointerMove={stop} onPointerUp={stop}>
        <button type="button" className="mini-map__frame" onClick={() => setExpanded(true)} aria-label={`แผนที่ ${mapDef.name} — แตะเพื่อขยาย`}>
          <MiniCanvas mapDef={mapDef} progressPct={progressPct} size={size} view={view} />
        </button>
        <div className="mini-map__bar">
          <span className="mini-map__name">{mapDef.name}</span>
          <span className="mini-map__steps">{steps.toLocaleString()} / {goalSteps.toLocaleString()} ก้าว</span>
          <span className="mini-map__line"><i style={{ width: `${ratio * 100}%` }} /></span>
        </div>
      </div>
      {expanded && createPortal(
        <div className="mini-map-expanded" role="dialog" aria-modal="true" aria-label={`แผนที่ ${mapDef.name}`} onClick={() => setExpanded(false)}>
          <button type="button" className="mini-map-expanded__map" onClick={() => setExpanded(false)} aria-label="ย่อแผนที่">
            <MiniCanvas mapDef={mapDef} progressPct={progressPct} size={bigSize} view={null} />
          </button>
          <div className="mini-map__bar mini-map-expanded__bar" style={{ width: bigSize }} onClick={(e) => e.stopPropagation()}>
            <span className="mini-map__name">{mapDef.name}</span>
            <span className="mini-map__steps">{steps.toLocaleString()} / {goalSteps.toLocaleString()} ก้าว · {Math.round(Math.min(100, progressPct))}%</span>
            <span className="mini-map__line"><i style={{ width: `${ratio * 100}%` }} /></span>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
