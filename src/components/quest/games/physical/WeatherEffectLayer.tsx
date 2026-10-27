import { useMemo } from 'react'
import type { WeatherType } from '../../../../types.journey'
import './WeatherEffectLayer.css'

/*============================================================================*\
  WeatherEffectLayer.tsx — เอฟเฟกต์สภาพอากาศคลุมแผนที่ (mock — ดู weatherMock.ts)
  ────────────────────────────────────────────────────────────────────────────
  'rain'  → เส้นฝนตกเบาๆ ผ่าน CSS animation ล้วน (ไม่มีวิดีโอ/canvas)
  'sunny' → แสงอุ่นๆ ไล่มุมบนซ้าย (radial-gradient) นิ่ง ไม่กระพริบ
  'clear' → ไม่มีเอฟเฟกต์ทับเลย (ท้องฟ้าใสของภาพแผนที่เองเพียงพอแล้ว)
  เคารพ prefers-reduced-motion เสมอตามหลักการของโปรเจกต์ (README ข้อ "การเคลื่อนไหว")
\*============================================================================*/

const RAINDROP_COUNT = 24

interface WeatherEffectLayerProps {
  weather: WeatherType
}

export default function WeatherEffectLayer({ weather }: WeatherEffectLayerProps) {
  // สุ่มตำแหน่ง/จังหวะเส้นฝนครั้งเดียวตอน mount (ไม่ใช่ทุก render) — ค่าคงที่ตลอดอายุ component
  const raindrops = useMemo(
    () => Array.from({ length: RAINDROP_COUNT }, (_, i) => ({
      left: (i * 4.3 + (i % 5) * 3) % 100,
      delay: (i * 0.13) % 1.6,
      duration: 0.9 + (i % 4) * 0.15,
    })),
    [],
  )

  if (weather === 'clear') return null

  if (weather === 'rain') {
    return (
      <div className="weather-effect-layer weather-effect-layer--rain" aria-hidden="true">
        {raindrops.map((drop, i) => (
          <span
            key={i}
            className="weather-effect-layer__drop"
            style={{ left: `${drop.left}%`, animationDelay: `${drop.delay}s`, animationDuration: `${drop.duration}s` }}
          />
        ))}
      </div>
    )
  }

  return <div className="weather-effect-layer weather-effect-layer--sunny" aria-hidden="true" />
}
