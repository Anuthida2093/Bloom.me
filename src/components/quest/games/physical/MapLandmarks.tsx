import { useMemo } from 'react'
import type { MapDef } from '../../../../types.journey'
import { generateMapRoute, NOOK_CRYSTALS } from './mapgen/generateMapScene'
import { placesOf } from './mapPlaces'
import './MapLandmarks.css'

/*============================================================================*\
  MapLandmarks — [แก้ตามที่ระบุ] ป้ายชื่อสถานที่เล็กๆ บนแผนที่ที่วาดด้วยโค้ด (ปราสาทหิน ป่าพิศวง ถ้ำคริสตัล ...)
  + แสงคริสตัลกะพริบรอบถ้ำคริสตัล/ป่าพิศวง (ภาพพื้นหลังวาดครั้งเดียว นิ่ง — ชั้นนี้ทำให้แสงมีชีวิต)
  ตำแหน่งมาจาก generateMapRoute (เบา ไม่ต้องสร้างฉากทั้งใบ) → ตรงกับภาพเสมอ
\*============================================================================*/

interface Twinkle { x: number; y: number; size: number; delay: number; tone: 'crystal' | 'mystic' }

export default function MapLandmarks({ mapDef }: { mapDef: Pick<MapDef, 'id' | 'generated'> }) {
  const seed = mapDef.generated?.seed
  const data = useMemo(() => {
    if (seed === undefined) return null
    const layout = generateMapRoute(seed)
    const pct = (v: number) => (v / layout.world) * 100
    const labels = placesOf(mapDef).map((l) => ({ ...l, y: l.labelY }))
    const twinkles: Twinkle[] = []
    const nook = layout.features.find((f) => f.kind === 'crystal-nook')
    if (nook) {
      NOOK_CRYSTALS.forEach(([dx, dy, r], i) => {
        twinkles.push({ x: pct(nook.x + dx), y: pct(nook.y + dy - r * 1.1), size: r * 2.4, delay: i * 0.37, tone: 'crystal' })
      })
      twinkles.push({ x: pct(nook.x - 30), y: pct(nook.y - 70), size: 200, delay: 0.2, tone: 'crystal' })
    }
    const mystic = layout.features.find((f) => f.kind === 'mystic')
    if (mystic) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, d = 140 + (i % 3) * 90
        twinkles.push({ x: pct(mystic.x + Math.cos(a) * d), y: pct(mystic.y + Math.sin(a) * d), size: 70, delay: i * 0.45, tone: 'mystic' })
      }
    }
    return { labels, twinkles, unit: 2048 / layout.world }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  if (!data) return null
  return (
    <div className="map-landmarks" aria-hidden="true">
      {data.twinkles.map((t, i) => (
        <span
          key={i}
          className={`map-landmarks__twinkle map-landmarks__twinkle--${t.tone}`}
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.size * data.unit, height: t.size * data.unit, animationDelay: `${t.delay}s` }}
        />
      ))}
      {data.labels.map((l) => (
        <span key={l.id} className="map-landmarks__label" style={{ left: `${l.x}%`, top: `${l.y}%` }}>
          <span className="map-landmarks__icon">{l.icon}</span>{l.text}
        </span>
      ))}
    </div>
  )
}
