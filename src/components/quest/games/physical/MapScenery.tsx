import { useMemo } from 'react'
import { JOURNEY_SCENERY } from '../../../../config/journeyScenery'
import { useIsSmallScreen, usePrefersReducedMotion } from '../../../../hooks/useMediaQuery'
import './MapScenery.css'

/*============================================================================*\
  MapScenery — [แก้ตามที่ระบุ] เอฟเฟกต์แนวแอนิเมชันบนแผนที่ก้าวเพื่อสุขภาพ
  ────────────────────────────────────────────────────────────────────────────
  - ต้นไม้ + กอหญ้า (SVG) วางตามตำแหน่งที่กำหนดเองทีละแผนที่ (config/journeyScenery.ts) โยกไหวตามลม
    แต่ละต้นจังหวะไม่พร้อมกัน — MapScenery (ใต้แมว/หีบ)
  - ผีเสื้อบินวน ใบไม้ปลิว เงาเมฆเลื่อนผ่าน — MapAmbience (ชั้นบนสุด ไม่รับการแตะ)
  ทุกอย่างอยู่ในพิกัด % ของภาพแผนที่ จึงเลื่อน/ซูมไปพร้อมแผนที่ · ใช้ transform/opacity ล้วน (CSS)
  ผู้ใช้ขอลดการเคลื่อนไหว → ต้นไม้/หญ้านิ่ง ไม่มีผีเสื้อ/ใบไม้/เมฆ · จอเล็กลดจำนวนผีเสื้อ/ใบไม้
\*============================================================================*/

interface ScenePalette {
  /** รูปทรงต้น: พุ่มกลม / สน */
  shape: 'round' | 'pine'
  /** สีพุ่ม [เข้ม, กลาง, สว่าง] — สุ่มต่อต้น (คงที่ตาม index) */
  leaves: [string, string, string][]
  /** สีใบไม้ที่ปลิว */
  falling: string[]
}

const GREENS: [string, string, string][] = [
  ['#4f8a3c', '#6fae4f', '#9fd27a'],
  ['#3f7d4a', '#5e9e5c', '#8fca83'],
  ['#5b8f35', '#7dba4c', '#b1dc7f'],
]

/** โทนต่อแผนที่ ให้กลืนกับภาพ (ถ้ำคริสตัล = มีม่วงอ่อน, บึงบัว/น้ำตก = มีชมพูพาสเทล, เทือกเขา = ต้นสน) */
const MAP_PALETTE: Record<string, ScenePalette> = {
  'crystal-cave-rainbow': { shape: 'round', leaves: [...GREENS, ['#7d62a8', '#a687d0', '#d2bdf0']], falling: ['#8fca83', '#c9a7ef', '#b1dc7f'] },
  'flower-garden': { shape: 'round', leaves: GREENS, falling: ['#f6a5c0', '#ffd27a', '#b1dc7f'] },
  'bamboo-forest': { shape: 'round', leaves: GREENS, falling: ['#9fd27a', '#c8e08c', '#7dba4c'] },
  'lotus-pond': { shape: 'round', leaves: [...GREENS, ['#c0708f', '#e79ab6', '#f8cadb']], falling: ['#f6a5c0', '#f8cadb', '#9fd27a'] },
  'stone-field': { shape: 'round', leaves: GREENS, falling: ['#c8b45a', '#9fd27a', '#e0a95a'] },
  'mountain-range': { shape: 'pine', leaves: [['#2f6b45', '#3f8a5a', '#6fb784'], ['#2c6150', '#3d7f69', '#69ad93']], falling: ['#9fd27a', '#e0a95a', '#c8e08c'] },
  'waterfall-valley': { shape: 'round', leaves: [...GREENS, ['#b8708f', '#e2a0bd', '#f6cfe0']], falling: ['#f6a5c0', '#c9a7ef', '#b1dc7f'] },
  'crystal-cave': { shape: 'round', leaves: [['#3f7d6a', '#5ea58a', '#97d3b8'], ['#6a5a9a', '#9283c6', '#c4b8ec'], ...GREENS], falling: ['#97d3b8', '#c4b8ec', '#f6a5c0'] },
}
const DEFAULT_PALETTE: ScenePalette = { shape: 'round', leaves: GREENS, falling: ['#9fd27a', '#ffd27a'] }

/** ค่าสุ่มคงที่ต่อ index (ตำแหน่ง/จังหวะไม่เปลี่ยนทุก render) */
const hash01 = (n: number) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }

/** ขนาดต้นไม้ฐาน (% ของความกว้างแผนที่) */
const TREE_WIDTH_PCT = 7.6
const TUFT_WIDTH_PCT = 4.2

function RoundTree({ c }: { c: [string, string, string] }) {
  const [dark, mid, light] = c
  return (
    <svg viewBox="0 0 60 80" className="msc-svg">
      <ellipse cx="30" cy="78" rx="20" ry="3.4" fill="#000" opacity="0.2" />
      <path d="M25.5 79 Q27 66 24 56 L36 56 Q33 66 34.5 79 Z" fill="#9a6b45" stroke="#6e4a2e" strokeWidth="1.8" />
      <path d="M30 62 L22 54 M31 64 L38 55" stroke="#6e4a2e" strokeWidth="2" strokeLinecap="round" />
      <g className="msc-canopy">
        {/* ชั้นเงาด้านหลัง (สีเข้ม) → พุ่มหลัก → ไฮไลต์ ให้ดูฟูมีมิติแบบภาพวาด */}
        <g fill={dark} stroke={dark} strokeWidth="2.2">
          <circle cx="12" cy="44" r="11" /><circle cx="48" cy="44" r="11" /><circle cx="30" cy="49" r="13" />
          <circle cx="16" cy="28" r="13" /><circle cx="44" cy="28" r="13" /><circle cx="30" cy="17" r="15" />
        </g>
        <g fill={mid}>
          <circle cx="13" cy="42" r="9.5" /><circle cx="47" cy="42" r="9.5" /><circle cx="30" cy="46" r="11.5" />
          <circle cx="17" cy="27" r="11.5" /><circle cx="43" cy="27" r="11.5" /><circle cx="30" cy="17" r="13.5" /><circle cx="30" cy="33" r="13" />
        </g>
        <g fill={light} opacity="0.85">
          <circle cx="24" cy="12" r="6" /><circle cx="12" cy="24" r="4.5" /><circle cx="38" cy="22" r="4" /><circle cx="9" cy="39" r="3.5" />
        </g>
      </g>
    </svg>
  )
}

function PineTree({ c }: { c: [string, string, string] }) {
  const [dark, mid, light] = c
  return (
    <svg viewBox="0 0 60 80" className="msc-svg">
      <ellipse cx="30" cy="78" rx="14" ry="3" fill="#000" opacity="0.18" />
      <rect x="27" y="62" width="6" height="17" rx="1.5" fill="#8a5e3c" stroke="#5f3f27" strokeWidth="1.2" />
      <g className="msc-canopy">
        <path d="M30 30 L52 66 Q30 70 8 66 Z" fill={mid} stroke={dark} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M30 16 L47 48 Q30 52 13 48 Z" fill={mid} stroke={dark} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M30 3 L42 30 Q30 33 18 30 Z" fill={mid} stroke={dark} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M30 6 L24 28 Q27 29 30 29 Z" fill={light} opacity="0.7" />
        <path d="M30 20 L20 46 Q25 47 30 47 Z" fill={light} opacity="0.55" />
      </g>
    </svg>
  )
}

function GrassTuft({ seed, c }: { seed: number; c: [string, string, string] }) {
  const n = 5 + Math.floor(hash01(seed) * 3)
  const blades = Array.from({ length: n }, (_, i) => {
    const x = 4 + (i + 0.5) * (22 / n)
    const h = 9 + hash01(seed * 7 + i) * 9
    const lean = (hash01(seed * 13 + i) - 0.5) * 8
    return { x, h, lean, color: c[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2] }
  })
  const flower = hash01(seed * 3) < 0.35
  return (
    <svg viewBox="0 0 30 22" className="msc-svg">
      {blades.map((b, i) => (
        <path key={i} d={`M${b.x - 1.6} 22 Q${b.x + b.lean * 0.3} ${22 - b.h * 0.6} ${b.x + b.lean} ${22 - b.h} Q${b.x + 1 + b.lean * 0.3} ${22 - b.h * 0.5} ${b.x + 1.6} 22 Z`} fill={b.color} />
      ))}
      {flower && <circle cx={15 + (hash01(seed * 5) - 0.5) * 10} cy="7" r="2.4" fill={hash01(seed * 11) < 0.5 ? '#ffd84d' : '#f6a5c0'} stroke="#fff" strokeWidth="0.8" />}
    </svg>
  )
}

/** ต้นไม้ + กอหญ้าโยกไหว — วางใต้แมว/หีบ */
export default function MapScenery({ mapId }: { mapId: string }) {
  const scenery = JOURNEY_SCENERY[mapId]
  const palette = MAP_PALETTE[mapId] ?? DEFAULT_PALETTE
  const still = usePrefersReducedMotion()
  if (!scenery) return null
  // วาดจากบนลงล่าง (y น้อยก่อน) ต้นที่อยู่หน้ากว่าทับต้นหลัง
  const items = [
    ...scenery.trees.map(([x, y, s = 1], i) => ({ kind: 'tree' as const, x, y, s, i })),
    ...scenery.tufts.map(([x, y, s = 1], i) => ({ kind: 'tuft' as const, x, y, s, i: i + 100 })),
  ].sort((a, b) => a.y - b.y)
  const Tree = palette.shape === 'pine' ? PineTree : RoundTree

  return (
    <div className={`msc-layer${still ? ' msc-layer--still' : ''}`} aria-hidden="true">
      {items.map((it) => {
        const isTree = it.kind === 'tree'
        const w = (isTree ? TREE_WIDTH_PCT : TUFT_WIDTH_PCT) * it.s * (0.92 + hash01(it.i + 3) * 0.16)
        const colors = palette.leaves[Math.floor(hash01(it.i + 17) * palette.leaves.length)]
        return (
          <span
            key={`${it.kind}-${it.i}`}
            className={`msc-item msc-item--${it.kind}`}
            style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${w}%`, zIndex: Math.round(it.y) }}
          >
            <span
              className="msc-sway"
              style={{
                animationDuration: `${(isTree ? 3.4 : 2.2) + hash01(it.i + 5) * 1.8}s`,
                animationDelay: `${-hash01(it.i + 9) * 4}s`,
              }}
            >
              {isTree ? <Tree c={colors} /> : <GrassTuft seed={it.i + 1} c={GREENS[it.i % GREENS.length]} />}
            </span>
          </span>
        )
      })}
    </div>
  )
}

/** เส้นทางบินของผีเสื้อ 4 ตัว (จุดเริ่ม % ของแผนที่ + แบบวงบิน) */
const FLYERS = [
  { x: 18, y: 30, loop: 'a', dur: 16, color: '#ffd84d' },
  { x: 70, y: 20, loop: 'b', dur: 19, color: '#f6a5c0' },
  { x: 60, y: 70, loop: 'c', dur: 17, color: '#a8d8ff' },
  { x: 25, y: 75, loop: 'b', dur: 21, color: '#c9a7ef' },
]

/** ผีเสื้อบินวน + ใบไม้ปลิว + เงาเมฆเลื่อนผ่าน — ชั้นบนสุดของแผนที่ */
export function MapAmbience({ mapId }: { mapId: string }) {
  const palette = MAP_PALETTE[mapId] ?? DEFAULT_PALETTE
  const reduced = usePrefersReducedMotion()
  const small = useIsSmallScreen()
  const leaves = useMemo(
    () => Array.from({ length: small ? 5 : 8 }, (_, i) => ({
      x0: 5 + hash01(i + 31) * 85,
      drift: 8 + hash01(i + 41) * 14,
      dur: 11 + hash01(i + 51) * 8,
      delay: -hash01(i + 61) * 18,
      size: 0.9 + hash01(i + 71) * 0.6,
      color: palette.falling[i % palette.falling.length],
    })),
    [small, palette],
  )
  if (reduced) return null
  const flyers = small ? FLYERS.slice(0, 2) : FLYERS

  return (
    <div className="msc-ambient" aria-hidden="true">
      <span className="msc-cloud" style={{ top: '12%', animationDuration: '46s', animationDelay: '-10s' }} />
      <span className="msc-cloud msc-cloud--small" style={{ top: '58%', animationDuration: '60s', animationDelay: '-38s' }} />

      {leaves.map((l, i) => (
        <span
          key={`leaf-${i}`}
          className="msc-leaf-track"
          style={{
            left: `${l.x0}%`,
            animationDuration: `${l.dur}s`,
            animationDelay: `${l.delay}s`,
            ['--drift' as string]: `${l.drift}%`,
          }}
        >
          <span className="msc-leaf" style={{ background: l.color, transform: `scale(${l.size})`, animationDuration: `${2.4 + (i % 3) * 0.6}s` }} />
        </span>
      ))}

      {flyers.map((f, i) => (
        <span
          key={`fly-${i}`}
          className={`msc-flyer msc-flyer--${f.loop}`}
          style={{ animationDuration: `${f.dur}s`, animationDelay: `${-i * 3.5}s` }}
        >
          <svg viewBox="0 0 24 18" className="msc-butterfly" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
            <g className="msc-wing msc-wing--l"><path d="M12 9 Q4 -1 1 4 Q0 9 12 9 Z M12 9 Q3 16 6 17 Q10 17 12 9 Z" fill={f.color} stroke="#5a4636" strokeWidth="0.8" /></g>
            <g className="msc-wing msc-wing--r"><path d="M12 9 Q20 -1 23 4 Q24 9 12 9 Z M12 9 Q21 16 18 17 Q14 17 12 9 Z" fill={f.color} stroke="#5a4636" strokeWidth="0.8" /></g>
            <rect x="11.2" y="4" width="1.6" height="11" rx="0.8" fill="#4a3a2c" />
          </svg>
        </span>
      ))}
    </div>
  )
}
