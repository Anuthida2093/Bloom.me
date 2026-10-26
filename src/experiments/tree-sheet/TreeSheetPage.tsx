import { useEffect, useRef } from 'react'
import { drawStyledTree, paintPaperFinish, TREE_SPECIES, TREE_STYLES, treeLodFor, type StyledTree, type TreeSpecies, type TreeStyle } from '../../components/scenery/storybookTrees'

/*============================================================================*\
  [dev only] /dev/tree-sheet — แผ่นตัวอย่างต้นไม้ฉากประกอบ 2 สไตล์ให้เลือก (A สีน้ำนุ่ม / B นิทานภาพ)
  ────────────────────────────────────────────────────────────────────────────
  ต่อสไตล์: 12 ต้นที่ขนาด 1× และ 2× · ต้นเล็ก/ไกล (LOD แบบง่าย) · ผืนป่าตัวอย่างที่ผสมสายพันธุ์ตามโซน
  (สนริมขอบ ต้นดอกใกล้ลานเห็ด) พร้อมเกรนกระดาษ + ขอบมืด · ?style=A|B แสดงสไตล์เดียว
\*============================================================================*/

const BG = '#8fae78'
const ONLY = new URLSearchParams(window.location.search).get('style')

function Sheet({ w, h, draw, label }: { w: number; h: number; draw: (c: CanvasRenderingContext2D) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const c = cv?.getContext('2d')
    if (!cv || !c) return
    const dpr = window.devicePixelRatio || 1
    cv.width = w * dpr; cv.height = h * dpr
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.fillStyle = BG; c.fillRect(0, 0, w, h)
    draw(c)
  }, [w, h, draw])
  return (
    <figure style={{ margin: '0 0 14px' }}>
      <figcaption style={{ fontSize: 13, opacity: 0.85, margin: '0 0 4px' }}>{label}</figcaption>
      <canvas ref={ref} style={{ width: w, height: h, display: 'block', borderRadius: 8 }} />
    </figure>
  )
}

/** 12 ต้น: ทุกสายพันธุ์อย่างน้อย 2 ต้น (seed ต่างกัน) */
const SHEET: Pick<StyledTree, 'species' | 'seed' | 'blossom'>[] = Array.from({ length: 12 }, (_, i) => ({
  species: TREE_SPECIES[i % TREE_SPECIES.length],
  seed: 101 + i * 37,
  ...(TREE_SPECIES[i % TREE_SPECIES.length] === 'blossom' ? { blossom: i < 5 ? 'pink' as const : 'lavender' as const } : {}),
}))

function rowDrawer(st: TreeStyle, r: number, cols: number) {
  const cw = r * 2.5, ch = r * 2.75
  return (c: CanvasRenderingContext2D) => {
    SHEET.forEach((t, i) => {
      const x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + r * 1.45
      drawStyledTree(c, { ...t, x, y, r }, st, treeLodFor(r))
    })
  }
}

function forestDrawer(st: TreeStyle, w: number, h: number) {
  return (c: CanvasRenderingContext2D) => {
    // ผืนป่า: สนริมซ้าย/ขวา ต้นดอกรอบลานเห็ดตรงกลาง ที่เหลือผสม — ไกล (บน) ซีดลงนิดและเล็กลง
    let s = 7
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const trees: StyledTree[] = []
    for (let i = 0; i < 46; i++) {
      const x = rnd() * w, y = 40 + rnd() * (h - 70)
      const nearEdge = x < w * 0.16 || x > w * 0.84
      const nearGrove = Math.hypot(x - w * 0.5, y - h * 0.55) < 120
      if (Math.hypot(x - w * 0.5, y - h * 0.55) < 50) continue // ลานโล่ง
      const species: TreeSpecies = nearEdge ? (rnd() < 0.75 ? 'fir' : 'birch') : nearGrove ? (rnd() < 0.7 ? 'blossom' : 'oak') : (['oak', 'weeping', 'birch', 'oak', 'fir'] as const)[Math.floor(rnd() * 5)]
      const depth = 1 - y / h
      // ขนาดเท่าต้นไม้บนแผนที่จริง (รัศมี 64-84 หน่วย × 0.64 px/หน่วย ≈ 40-55 px) — ไกลเล็กลงเล็กน้อย
      trees.push({ x, y, r: (40 + rnd() * 15) * (1 - depth * 0.3), species, seed: Math.floor(rnd() * 1e9), depth })
    }
    trees.sort((a, b) => a.y - b.y)
    for (const t of trees) drawStyledTree(c, t, st, treeLodFor(t.r))
    paintPaperFinish(c, w, h, st, 1)
  }
}

function StyleColumn({ st }: { st: TreeStyle }) {
  return (
    <section style={{ flex: '1 1 640px', minWidth: 0 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>{st.label}</h2>
      <Sheet label="12 ต้น · 1×" w={6 * 40 * 2.5} h={2 * 40 * 2.75} draw={rowDrawer(st, 40, 6)} />
      <Sheet label="12 ต้น · 2×" w={6 * 80 * 2.5} h={2 * 80 * 2.75} draw={rowDrawer(st, 80, 6)} />
      <Sheet label="ต้นเล็ก/ไกล (LOD แบบง่าย)" w={12 * 18 * 2.5} h={18 * 2.75} draw={rowDrawer(st, 18, 12)} />
      <Sheet label="ผืนป่าตัวอย่าง + เกรนกระดาษ/ขอบมืด" w={600} h={360} draw={forestDrawer(st, 600, 360)} />
    </section>
  )
}

export default function TreeSheetPage() {
  const styles = ONLY === 'A' || ONLY === 'B' ? [TREE_STYLES[ONLY]] : [TREE_STYLES.A, TREE_STYLES.B]
  return (
    <div style={{ background: '#e9efe4', color: '#1f3326', minHeight: '100vh', padding: 16, fontFamily: 'system-ui', display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {styles.map((st) => <StyleColumn key={st.id} st={st} />)}
    </div>
  )
}
