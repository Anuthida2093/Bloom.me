import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MapDef } from '../../../../types.journey'
import { cachedMapArt, renderMapArt, type MapArtResult } from './mapgen/renderMapArt'
import { artIdOf } from './mapgen/prepareArt'
import { generatedArtSize } from './mapArtLoader'
import './MapArtImage.css'

/** ภาพพื้นหลังของแผนที่ — ภาพวาด (artAsset → <img>) หรือภาพที่วาดด้วยโค้ด (generated → <canvas>
 *  คัดลอกจากภาพที่วาดไว้ครั้งเดียวในแคช) · ระหว่างวาดแสดงพื้นรอแบบเบาๆ (ไม่ใช่จอว่าง)
 *  variant thumb = การ์ดเลือกแผนที่ (ภาพเล็ก 768px) */
export default function MapArtImage({ mapDef, className, variant = 'scene', onError }: {
  mapDef: Pick<MapDef, 'artAsset' | 'generated'>
  className?: string
  variant?: 'scene' | 'thumb'
  onError?: () => void
}) {
  const gen = mapDef.generated
  const size = generatedArtSize(variant)
  const key = gen === undefined ? null : `${artIdOf(gen)}:${size}`
  // ภาพที่ได้จาก effect ผูกกับ key — เปลี่ยน seed/ขนาดแล้วไม่โชว์ภาพเก่าค้าง (ใช้แคชของ key ใหม่ก่อนถ้ามี)
  const [loaded, setLoaded] = useState<{ key: string; art: MapArtResult } | null>(null)
  const art = gen === undefined ? null : loaded?.key === key ? loaded.art : cachedMapArt(gen, size)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (gen === undefined || key === null) return
    let alive = true
    renderMapArt(gen, size).then((r) => { if (alive) setLoaded({ key, art: r }) }, () => { if (alive) onError?.() })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (art && ctx) ctx.drawImage(art.image, 0, 0)
  }, [art])

  if (gen === undefined) {
    return <img src={mapDef.artAsset} alt="" className={className} loading={variant === 'thumb' ? 'lazy' : undefined} onError={onError} />
  }
  if (!art) {
    return (
      <div className={`${className ?? ''} map-art-image__pending`} role="img" aria-label="กำลังวาดแผนที่">
        <span className="map-art-image__pending-label">กำลังวาดแผนที่…</span>
      </div>
    )
  }
  return <canvas ref={canvasRef} width={art.size} height={art.size} className={className} aria-hidden="true" />
}
