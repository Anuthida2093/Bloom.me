import { useMemo } from 'react'
import { seededRandom } from '../../utils/seededRandom'

const C_1 = '#FFF3C4'
const C_2 = '#4A9B5E'
const C_3 = '#5FB574'
const C_4 = '#3E8850'

const FILL_1 = C_1

interface GroundSceneProps {
  /** เลเวลหญ้า/ดิน (มาจาก healthStack) — ยิ่งสูง หญ้ายิ่งหนาแน่น + ดอกไม้ยิ่งเยอะ */
  grassSoilLevel: number
  seedKey: string
  accentFlowerColors?: string[]
}

interface GrassBlade {
  key: string
  xPct: number
  heightPx: number
  swayDurationS: number
  swayDelayS: number
  tilt: number
  colorVariant: 0 | 1 | 2
}

interface GroundFlower {
  key: string
  xPct: number
  color: string
  delayS: number
}

const GRASS_COLORS = [C_2, C_3, C_4]
const DEFAULT_FLOWER_COLORS = ['var(--exp)', 'var(--pink)', 'var(--purple)', 'var(--blue)']

/**
 * GroundScene — [ข้อกำหนดข้อ 4] เลเยอร์หญ้า/ดอกไม้แบบมีมิติ วางซ้อนทับภาพพื้นหญ้า
 * (grass_lvl{N}.webp) เดิมอีกที ไม่ได้แทนที่ภาพ asset — ใช้ SVG วาดใบหญ้าเป็นเส้นโค้งบางๆ
 * จำนวนมาก แต่ละใบมี CSS animation ไหวตามลมคนละจังหวะกัน (สุ่ม duration/delay แบบ
 * deterministic ตาม seedKey) ให้ความรู้สึกพริ้วไหวเป็นธรรมชาติ ไม่ใช่ภาพนิ่ง
 *
 * จำนวนใบหญ้า/ดอกไม้ยิ่งเพิ่มขึ้นตาม grassSoilLevel (มาจาก healthStack) — เห็นผลลัพธ์ของ
 * เควสหมวดสุขภาพชัดเจนขึ้นเรื่อยๆ ตามที่ระบุไว้ในภาพรวมโปรเจกต์
 */
export default function GroundScene({ grassSoilLevel, seedKey, accentFlowerColors }: GroundSceneProps) {
  const bladeCount = Math.round(14 + (grassSoilLevel / 100) * 46) // 14 → 60 ใบ
  const flowerCount = Math.round((grassSoilLevel / 100) * 10) // 0 → 10 ดอก
  const flowerColors = accentFlowerColors && accentFlowerColors.length > 0 ? accentFlowerColors : DEFAULT_FLOWER_COLORS

  const blades = useMemo<GrassBlade[]>(() => {
    const rng = seededRandom(`${seedKey}-grass-${grassSoilLevel}`)
    return Array.from({ length: bladeCount }, (_, i) => ({
      key: `blade-${i}`,
      xPct: 4 + rng() * 92,
      heightPx: 14 + rng() * 22,
      swayDurationS: 2.2 + rng() * 1.8,
      swayDelayS: rng() * 2,
      tilt: (rng() - 0.5) * 14,
      colorVariant: Math.floor(rng() * 3) as 0 | 1 | 2,
    }))
  }, [seedKey, grassSoilLevel, bladeCount])

  const flowers = useMemo<GroundFlower[]>(() => {
    const rng = seededRandom(`${seedKey}-flowers-${grassSoilLevel}`)
    return Array.from({ length: flowerCount }, (_, i) => ({
      key: `gflower-${i}`,
      xPct: 6 + rng() * 88,
      color: flowerColors[Math.floor(rng() * flowerColors.length)],
      delayS: rng() * 3,
    }))
  }, [seedKey, grassSoilLevel, flowerCount, flowerColors])

  return (
    <div className="ground-scene" aria-hidden="true">
      {blades.map((b) => (
        <svg
          key={b.key}
          className="ground-scene__blade"
          style={{
            left: `${b.xPct}%`,
            height: `${b.heightPx}px`,
            animationDuration: `${b.swayDurationS}s`,
            animationDelay: `${b.swayDelayS}s`,
            transform: `rotate(${b.tilt}deg)`,
          }}
          viewBox="0 0 10 40"
        >
          <path
            d="M5 40 C 2 28, 8 18, 5 0"
            stroke={GRASS_COLORS[b.colorVariant]}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      ))}

      {flowers.map((f) => (
        <div
          key={f.key}
          className="ground-scene__flower"
          style={{ left: `${f.xPct}%`, animationDelay: `${f.delayS}s` }}
        >
          <svg viewBox="0 0 20 20" width="100%" height="100%">
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse
                key={deg}
                cx="10" cy="6" rx="3" ry="4.5"
                fill={f.color}
                opacity={0.9}
                transform={`rotate(${deg} 10 10)`}
              />
            ))}
            <circle cx="10" cy="10" r="2.4" fill={FILL_1} />
          </svg>
        </div>
      ))}
    </div>
  )
}