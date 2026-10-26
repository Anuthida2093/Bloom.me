import { mulberry32 } from '../../../utils/seededRandom'
import type { HomeSceneKind, HomeSceneSpec } from '../../../config/homeScenes'

/*============================================================================*\
  generateHomeScene — ผังฉากพื้นหลังหน้า Home (ฟังก์ชันล้วน ไม่แตะ canvas · seed + ขนาดจอเดิม = ผลเดิมเป๊ะ)
  ────────────────────────────────────────────────────────────────────────────
  หน่วย = CSS px ของจอขนาด w×h · แกน x รวมขอบเผื่อ (over) ซ้าย-ขวาไว้เลื่อนแบบพารัลแลกซ์ (W = w + 2·over)
  ชั้น (หลัง → หน้า): ฟ้า/ดวงอาทิตย์/เมฆ · ภูเขาไกล-ใกล้ · เนินเขา + ต้นไม้ไกล · ของกลางฉาก (หน้าผาน้ำตก / ลำต้น /
  พุ่มรั้ว ซุ้ม) · พื้นทุ่ง · แถวหญ้า (ไกล → ใกล้) · หมอก · กอหญ้าหน้าสุด
  "คอลัมน์ต้นไม้" กลางจอ (35-65% ของความกว้าง) ห้ามมีของคอนทราสต์สูง — boxes ใช้ตรวจในเทสต์
\*============================================================================*/

export type Vec2 = [number, number]

export interface Blade { x: number; y: number; h: number; lean: number; w: number; tone: number }
export interface Flower { x: number; y: number; r: number; color: number; kind: 'dot' | 'daisy' | 'tulip'; stem: number }
export interface GrassRow {
  /** 0 = ไกลสุด → 1 = ใกล้สุด */
  depth: number
  /** ขอบบนของแถบโคนหญ้า / ขอบล่าง (โคนหญ้าทุกต้นอยู่ในช่วงนี้) */
  rootTop: number
  rootBottom: number
  maxH: number
  /** ความแรงการไหว (ใกล้มากกว่าไกล) */
  amp: number
  blades: Blade[]
  flowers: Flower[]
}

export type MidProp =
  | { type: 'cliff'; tiers: { x0: number; x1: number; top: number; bottom: number; bumps: number[] }[] }
  | { type: 'rock'; x: number; y: number; rx: number; ry: number }
  | { type: 'bush'; x: number; y: number; r: number; tone: number }
  | { type: 'trunk'; x: number; top: number; bottom: number; w: number; layer: 0 | 1 | 2; lean: number }
  | { type: 'canopy'; bottom: number; scallops: number[]; holes: { x: number; y: number; r: number }[] }
  | { type: 'log'; x: number; y: number; len: number; r: number }
  | { type: 'mushroom'; x: number; y: number; s: number }
  | { type: 'hedge'; x0: number; x1: number; y: number; h: number; bumps: number[]; tone: number }
  | { type: 'topiary'; x: number; y: number; r: number }
  | { type: 'arch'; x: number; y: number; w: number; h: number }

export interface Falls {
  ribbons: { x: number; yTop: number; yBot: number; wTop: number; wBot: number; speed: number }[]
  ledge: Vec2
  pool: { x: number; y: number; rx: number; ry: number }
}

export interface SceneBox { id: string; x0: number; x1: number; y0: number; y1: number; contrast: 'high' | 'low' }

export interface HomeSceneLayout {
  kind: HomeSceneKind
  seed: number
  w: number
  h: number
  over: number
  W: number
  sun: { x: number; y: number; r: number }
  clouds: { x: number; y: number; s: number; speed: number }[]
  ridges: { pts: Vec2[]; tone: number }[]
  hills: { pts: Vec2[]; tone: number }[]
  farTrees: { x: number; y: number; r: number; tone: number; accent: boolean }[]
  mid: MidProp[]
  /** ของบนพื้นใกล้ (ขอนไม้ เห็ด ลำต้นริมจอ ซุ้ม) — ประกอบแทรกระหว่างแถวหญ้าที่เส้น foreLine */
  fore: MidProp[]
  foreLine: number
  falls: Falls | null
  groundTop: number
  rows: GrassRow[]
  mistY: number
  boxes: SceneBox[]
}

/** สัดส่วนคอลัมน์กลางที่สงวนให้ต้นไม้ */
export const TREE_COLUMN = { from: 0.35, to: 0.65 } as const
/** ขอบเผื่อซ้าย-ขวา (สัดส่วนของความกว้างจอ) สำหรับพารัลแลกซ์ */
export const OVERSCAN = 0.08

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** เส้นสันเขาเรียบจากผลรวมคลื่นไซน์เฟสสุ่ม */
function ridgeLine(rnd: () => number, W: number, base: number, amp: number, waves: number, step: number): Vec2[] {
  const ph = Array.from({ length: 3 }, () => rnd() * Math.PI * 2)
  const pts: Vec2[] = []
  for (let x = 0; x <= W + step; x += step) {
    const u = x / W
    const y = base
      - amp * (0.55 * Math.sin(u * Math.PI * waves + ph[0]) + 0.3 * Math.sin(u * Math.PI * waves * 2.3 + ph[1]) + 0.15 * Math.sin(u * Math.PI * waves * 5.1 + ph[2]))
    pts.push([x, y])
  }
  return pts
}

function yOn(pts: Vec2[], x: number): number {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      return lerp(y0, y1, (x - x0) / (x1 - x0 || 1))
    }
  }
  return pts[pts.length - 1][1]
}

interface RowOpts { count: number; density: number; flowerRate: number; flowerKinds: Flower['kind'][]; flowerColors: number; patchy: boolean; edgeOnly?: boolean }

function buildRows(rnd: () => number, L: { w: number; h: number; W: number; over: number }, groundTop: number, o: RowOpts): GrassRow[] {
  const rows: GrassRow[] = []
  const span = L.h - groundTop + L.h * 0.03
  const s = Math.min(L.w, L.h) / 800 + 0.35 // สเกลขนาดหญ้าตามจอ
  const colAt = (x: number) => {
    // ดอกไม้เป็นหย่อมสี (สวน) หรือคละสี (ทุ่ง)
    if (!o.patchy) return Math.floor(rnd() * o.flowerColors)
    const band = Math.floor((x / L.W) * 7 + Math.sin(x * 0.013) * 0.8)
    return ((band % o.flowerColors) + o.flowerColors) % o.flowerColors
  }
  for (let i = 0; i < o.count; i++) {
    const d = i / (o.count - 1)
    const rootBottom = groundTop + span * Math.pow((i + 1) / o.count, 1.55)
    const rootTop = groundTop + span * Math.pow(i / o.count, 1.55)
    const maxH = lerp(L.h * 0.014, L.h * 0.07, Math.pow(d, 1.25)) * Math.min(1.25, s)
    const blades: Blade[] = []
    const n = Math.round(L.W * o.density * lerp(1.1, 0.42, d))
    for (let k = 0; k < n; k++) {
      const x = rnd() * L.W
      blades.push({
        x, y: lerp(rootTop, rootBottom, rnd()), h: maxH * (0.55 + 0.45 * rnd()),
        lean: (rnd() - 0.5) * 0.5, w: lerp(1, 3.4, d) * (0.7 + 0.5 * rnd()) * Math.min(1.3, s), tone: rnd(),
      })
    }
    const flowers: Flower[] = []
    const nf = Math.round(L.W * o.flowerRate * lerp(0.9, 0.5, d))
    for (let k = 0; k < nf; k++) {
      const x = rnd() * L.W
      flowers.push({
        x, y: lerp(rootTop, rootBottom, rnd()), r: lerp(1.3, 4.6, d) * Math.min(1.3, s) * (0.8 + 0.4 * rnd()),
        color: colAt(x), kind: o.flowerKinds[Math.floor(rnd() * o.flowerKinds.length)], stem: maxH * (0.45 + 0.4 * rnd()),
      })
    }
    rows.push({ depth: d, rootTop, rootBottom, maxH, amp: lerp(0.05, 0.42, Math.pow(d, 1.2)), blades, flowers })
  }
  // กอหญ้าหน้าสุด — เฉพาะริมซ้าย/ขวา (ไม่บังโคนต้นไม้กลางจอ)
  const fg: Blade[] = []
  const fgH = L.h * 0.12 * Math.min(1.25, s)
  for (let k = 0; k < L.W * 0.5; k++) {
    const u = rnd()
    const x = u < 0.5 ? rnd() * (L.over + L.w * 0.24) : L.W - rnd() * (L.over + L.w * 0.24)
    fg.push({ x, y: L.h - rnd() * L.h * 0.02, h: fgH * (0.4 + 0.6 * rnd()), lean: (rnd() - 0.5) * 0.6, w: 3.4 * Math.min(1.3, s) * (0.7 + 0.6 * rnd()), tone: rnd() })
  }
  rows.push({ depth: 1, rootTop: L.h - L.h * 0.02, rootBottom: L.h + 2, maxH: fgH, amp: 0.5, blades: fg, flowers: [] })
  return rows
}

export function generateHomeScene(spec: Pick<HomeSceneSpec, 'kind' | 'seed'>, w: number, h: number): HomeSceneLayout {
  const rnd = mulberry32((spec.seed * 2654435761) >>> 0)
  const over = Math.round(w * OVERSCAN)
  const W = w + over * 2
  const L = { w, h, W, over }
  const X = (u: number) => over + u * w // สัดส่วนของจอที่มองเห็น → พิกัดฉาก
  const portrait = h > w
  const groundTop = h * (portrait ? 0.585 : 0.6)
  const sun = { x: X(0.16), y: h * 0.11, r: Math.max(w, h) * 0.32 }
  const clouds = Array.from({ length: 5 }, () => ({ x: rnd() * W, y: h * (0.06 + rnd() * 0.22), s: Math.max(w, h) * (0.07 + rnd() * 0.06), speed: 0.4 + rnd() * 0.6 }))
  const boxes: SceneBox[] = []
  const mid: MidProp[] = []
  const fore: MidProp[] = []
  let foreLine = h
  let falls: Falls | null = null

  const ridges = [
    { pts: ridgeLine(rnd, W, h * 0.42, h * 0.11, 3.2, 8), tone: 0 },
    { pts: ridgeLine(rnd, W, h * 0.47, h * 0.075, 4.4, 8), tone: 1 },
  ]
  const hills = [
    { pts: ridgeLine(rnd, W, groundTop - h * 0.045, h * 0.03, 2.4, 8), tone: 0 },
    { pts: ridgeLine(rnd, W, groundTop - h * 0.012, h * 0.022, 3.1, 8), tone: 1 },
  ]
  const farTrees: HomeSceneLayout['farTrees'] = []
  const treeScale = Math.min(w, h) / 900 + 0.4
  // [แก้ตามที่ระบุ] ฉาก 3 (ทุ่งหญ้าน้ำตก): ต้นไกลเป็นสายพันธุ์เดียวกับต้นของผู้เล่น — ใหญ่ขึ้น ห่างขึ้น ให้เห็นทรง/รายละเอียด
  const bigFar = spec.kind === 'meadow-falls'
  for (let x = rnd() * 14; x < W; x += bigFar ? 34 + rnd() * 46 : 10 + rnd() * 22) {
    const hill = hills[rnd() < 0.6 ? 0 : 1]
    farTrees.push({ x, y: yOn(hill.pts, x) + 2, r: (bigFar ? 9 + rnd() * 7 : 4 + rnd() * 6) * treeScale, tone: Math.floor(rnd() * 3), accent: rnd() < 0.1 })
  }

  let rowOpts: RowOpts = { count: 9, density: 0.95, flowerRate: 0.05, flowerKinds: ['dot', 'daisy'], flowerColors: 4, patchy: false }

  if (spec.kind === 'meadow-falls') {
    // ── หน้าผาขั้นบันไดฝั่งขวา + น้ำตก 3 สาย + แอ่งน้ำที่ฐาน (ไม่มีลำธารไหลข้ามทุ่ง) ──
    const bumps = () => Array.from({ length: 6 }, () => rnd())
    const tiers = [
      { x0: X(0.76), x1: W + 4, top: groundTop - h * 0.115, bottom: groundTop + h * 0.02, bumps: bumps() },
      { x0: X(0.8), x1: W + 4, top: groundTop - h * 0.215, bottom: groundTop - h * 0.08, bumps: bumps() },
      { x0: X(0.85), x1: W + 4, top: groundTop - h * 0.3, bottom: groundTop - h * 0.18, bumps: bumps() },
    ]
    mid.push({ type: 'cliff', tiers })
    const fx = X(0.895)
    const ledgeY = tiers[2].top + h * 0.025
    const poolY = groundTop + h * 0.008
    const rw = Math.max(6, w * 0.016)
    falls = {
      ribbons: [
        // [แก้ตามที่ระบุ] 3 สายซ้อนกันเป็นม่านน้ำผืนเดียว (เดิมห่างกันเป็นแท่งๆ)
        { x: fx - rw * 1.15, yTop: ledgeY + 1, yBot: poolY, wTop: rw * 1.5, wBot: rw * 1.8, speed: 1 },
        { x: fx + rw * 0.15, yTop: ledgeY - 2, yBot: poolY, wTop: rw * 1.8, wBot: rw * 2.15, speed: 1.2 },
        { x: fx + rw * 1.35, yTop: ledgeY + 2, yBot: poolY, wTop: rw * 1.3, wBot: rw * 1.55, speed: 0.9 },
      ],
      ledge: [fx, ledgeY],
      pool: { x: fx, y: poolY, rx: Math.max(w * 0.075, 26), ry: Math.max(h * 0.012, 5) },
    }
    for (const t of tiers) {
      for (let x = t.x0 + 10; x < t.x1; x += 22 + rnd() * 30) mid.push({ type: 'bush', x, y: t.top + 4, r: (6 + rnd() * 7) * treeScale, tone: Math.floor(rnd() * 2) })
    }
    // ก้อนหินบังแอ่งน้ำด้านหน้า
    for (let k = 0; k < 6; k++) mid.push({ type: 'rock', x: fx + (k - 2.5) * w * 0.028 + (rnd() - 0.5) * 8, y: poolY + h * 0.012 + rnd() * h * 0.01, rx: (9 + rnd() * 9) * treeScale, ry: (6 + rnd() * 5) * treeScale })
    boxes.push({ id: 'cliff', x0: tiers[0].x0, x1: W, y0: tiers[2].top, y1: tiers[0].bottom, contrast: 'high' })
    boxes.push({ id: 'falls', x0: fx - rw * 3, x1: fx + rw * 3, y0: ledgeY, y1: poolY, contrast: 'high' })
    rowOpts = { ...rowOpts, flowerRate: 0.045 }
  } else if (spec.kind === 'forest-glade') {
    // ── ลำต้น 3 ชั้น (ไกลจาง → ใกล้เข้ม · ชั้นใกล้อยู่ริมจอเท่านั้น) + เรือนยอดด้านบน + ขอนไม้/เห็ดริมข้าง ──
    for (let x = rnd() * 20; x < W; x += 26 + rnd() * 30) mid.push({ type: 'trunk', x, top: -10, bottom: groundTop - h * 0.01 + rnd() * 6, w: (6 + rnd() * 6) * treeScale, layer: 0, lean: (rnd() - 0.5) * 0.04 })
    for (let x = rnd() * 40; x < W; x += 60 + rnd() * 70) mid.push({ type: 'trunk', x, top: -10, bottom: groundTop + h * 0.02, w: (14 + rnd() * 10) * treeScale, layer: 1, lean: (rnd() - 0.5) * 0.05 })
    const nearXs = [X(0.02), X(0.14), X(0.88), X(1.0)]
    for (const x of nearXs) {
      const tw = (34 + rnd() * 22) * treeScale
      const bottom = groundTop + h * (0.085 + rnd() * 0.02)
      fore.push({ type: 'trunk', x, top: -10, bottom, w: tw, layer: 2, lean: (rnd() - 0.5) * 0.03 })
      boxes.push({ id: `trunk-${Math.round(x)}`, x0: x - tw / 2, x1: x + tw / 2, y0: 0, y1: bottom, contrast: 'high' })
    }
    const scallops = Array.from({ length: Math.ceil(W / 40) + 1 }, () => rnd())
    const holes = Array.from({ length: 9 }, () => ({ x: rnd() * W, y: h * (0.02 + rnd() * 0.1), r: Math.max(w, h) * (0.02 + rnd() * 0.03) }))
    mid.push({ type: 'canopy', bottom: h * (portrait ? 0.17 : 0.2), scallops, holes })
    foreLine = groundTop + h * 0.15
    fore.push({ type: 'log', x: X(0.1), y: groundTop + h * 0.14, len: w * 0.17, r: Math.max(10, h * 0.02) })
    fore.push({ type: 'log', x: X(0.85), y: groundTop + h * 0.145, len: w * 0.15, r: Math.max(9, h * 0.018) })
    for (const side of [0.06, 0.12, 0.8, 0.9]) {
      for (let k = 0; k < 3; k++) fore.push({ type: 'mushroom', x: X(side) + (rnd() - 0.5) * w * 0.05, y: groundTop + h * (0.08 + rnd() * 0.03), s: (6 + rnd() * 6) * treeScale })
    }
    for (let x = rnd() * 30; x < W; x += 30 + rnd() * 40) mid.push({ type: 'bush', x, y: groundTop + 2, r: (9 + rnd() * 9) * treeScale, tone: Math.floor(rnd() * 2) })
    rowOpts = { count: 9, density: 1.05, flowerRate: 0.02, flowerKinds: ['dot'], flowerColors: 3, patchy: false }
  } else {
    // ── สวน: แนวรั้วพุ่มไม้ตามขอบฟ้า · ต้นไม้ดัดทรงกลม · ซุ้มกุหลาบซ้าย · แปลงดอกไม้เป็นหย่อมสี ──
    mid.push({ type: 'hedge', x0: -4, x1: W + 4, y: groundTop + h * 0.005, h: h * 0.035, bumps: Array.from({ length: Math.ceil(W / 26) + 1 }, () => rnd()), tone: 0 })
    for (const u of [0.04, 0.24, 0.76, 0.96]) mid.push({ type: 'topiary', x: X(u), y: groundTop + h * 0.01, r: (13 + rnd() * 6) * treeScale })
    const aw = Math.min(Math.max(84, w * 0.17), w * 0.28), ah = Math.max(150, h * 0.27)
    const ax = X(Math.max(0.1, aw / 2 / w + 0.02)), ay = groundTop + h * 0.1
    foreLine = ay + 2
    fore.push({ type: 'arch', x: ax, y: ay, w: aw, h: ah })
    boxes.push({ id: 'arch', x0: ax - aw / 2 - 12, x1: ax + aw / 2 + 12, y0: ay - ah, y1: ay, contrast: 'high' })
    for (let x = rnd() * 30; x < W; x += 34 + rnd() * 40) {
      if (x > X(0.3) && x < X(0.7)) continue
      mid.push({ type: 'bush', x, y: groundTop + h * 0.012, r: (8 + rnd() * 7) * treeScale, tone: Math.floor(rnd() * 2) })
    }
    rowOpts = { count: 9, density: 0.75, flowerRate: 0.2, flowerKinds: ['tulip', 'daisy', 'dot'], flowerColors: 6, patchy: true }
  }

  const rows = buildRows(rnd, L, groundTop, rowOpts)
  fore.sort((a, b) => ('y' in a ? a.y : 'bottom' in a ? a.bottom : 0) - ('y' in b ? b.y : 'bottom' in b ? b.bottom : 0))
  return { kind: spec.kind, seed: spec.seed, w, h, over, W, sun, clouds, ridges, hills, farTrees, mid, fore, foreLine, falls, groundTop, rows, mistY: groundTop, boxes }
}
