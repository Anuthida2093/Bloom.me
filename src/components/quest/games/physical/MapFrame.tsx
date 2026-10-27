import { MAP_NATIVE_SIZE } from './journeyPathMath'
import './MapFrame.css'

/*============================================================================*\
  MapFrame — กรอบน่ารักรอบแผนที่ตอนย่อพอดีจอ (เดินถึงเป้า/เปิดดูทริปที่สำเร็จ)
  ────────────────────────────────────────────────────────────────────────────
  วางทับตำแหน่งแผนที่บนจอ (pan + ขนาด × scale) จึงตามการลาก/ซูมได้ — ไม่รับการแตะ (pointer-events: none)
  กรอบครีม-ทองมุมมน + ป้ายชื่อแผนที่ด้านบน ([แก้ตามที่ระบุ] ไม่มีดอกไม้/ใบไม้มุม และเส้นประขาวแล้ว)
  ระยะเว้นรอบแผนที่ (ให้กรอบ/ป้ายมีที่) = mapFrameInset ใน hooks/useMapPanZoom.ts
  พื้นที่รอบนอก: เขียวอ่อน + ประกายดาววิบวับ (MapStars) แทนแถบสีทึบบน-ล่าง
\*============================================================================*/

/** ตำแหน่ง/จังหวะดาวคงที่ (ไม่สุ่มใหม่ทุก render) — % ของกรอบเกม */
const STARS = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin((i + 1) * n) * 10000; return x - Math.floor(x) }
  return { left: r(12.9898) * 100, top: r(78.233) * 100, size: 8 + r(37.719) * 12, delay: r(4.1) * 4, duration: 2 + r(9.3) * 2.5 }
})

/** ประกายดาววิบวับบนพื้นเขียวอ่อนรอบแผนที่ (อยู่หลังแผนที่ เห็นเฉพาะช่วงขอบที่ว่าง) */
export function MapStars() {
  return (
    <div className="map-stars" aria-hidden="true">
      {STARS.map((s, i) => (
        <span
          key={i}
          className="map-stars__star"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay.toFixed(2)}s`, animationDuration: `${s.duration.toFixed(2)}s` }}
        />
      ))}
    </div>
  )
}

export default function MapFrame({ pan, scale, title, size = MAP_NATIVE_SIZE }: { pan: { x: number; y: number }; scale: number; title?: string; size?: { width: number; height: number } }) {
  const w = size.width * scale
  const h = size.height * scale
  if (w <= 0 || h <= 0) return null
  return (
    <div className="map-frame" style={{ left: pan.x, top: pan.y, width: w, height: h }} aria-hidden="true">
      {title && <span className="map-frame__ribbon">🗺️ {title}</span>}
    </div>
  )
}
