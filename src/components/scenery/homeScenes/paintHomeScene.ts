import { mulberry32 } from '../../../utils/seededRandom'
import type { Species } from '../../tree/procedural/species'
import { drawMiniSpeciesTree, mixHex } from './miniTrees'
import type { ScenePalette } from '../../../config/homeScenes'
import type { GrassRow, HomeSceneLayout, MidProp, Vec2 } from './generateHomeScene'

/*============================================================================*\
  paintHomeScene — วาด "ชั้นนิ่ง" ของฉากลงบิตแมปครั้งเดียว (ไม่วาดซ้ำทุกเฟรม)
  ────────────────────────────────────────────────────────────────────────────
  back    (W×h)  ฟ้า + แสงอาทิตย์ + ภูเขา                 — พารัลแลกซ์ 0.1
  mid     (W×h)  เนินเขา ต้นไม้ไกล หน้าผา/ลำต้น/รั้ว พื้นทุ่ง — พารัลแลกซ์ 0.3
  rows[]  (W×แถบ) หญ้า + ดอกไม้ทีละแถวความลึก — ตัวเรนเดอร์หั่นเป็นคอลัมน์แล้วเอียงตามลม (โคนนิ่ง ปลายไหว)
  fore    (W×h)  ของบนพื้นใกล้ (ขอนไม้ เห็ด ลำต้นริมจอ ซุ้ม) — ประกอบแทรกระหว่างแถวหญ้า · พารัลแลกซ์ 0.6
  overlay (w×h)  แสงอุ่นมุมซ้ายบน + ขอบมืด + เกรนกระดาษ
  ใช้ได้ทั้ง HTMLCanvasElement และ OffscreenCanvas (ส่ง make เข้ามา)
\*============================================================================*/

export type Canvas = HTMLCanvasElement | OffscreenCanvas
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
export type MakeCanvas = (wPx: number, hPx: number) => Canvas

export interface RowLayer { canvas: Canvas; top: number; height: number; root: number; amp: number; depth: number }
export interface StaticLayers { dpr: number; back: Canvas; mid: Canvas; fore: Canvas | null; rows: RowLayer[]; overlay: Canvas; bytes: number }

const TAU = Math.PI * 2
const rgba = ([r, g, b]: readonly [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`

function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(a: string, b: string, t: number): string {
  const A = hex2rgb(a), B = hex2rgb(b)
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`
}
function ctx2d(c: Canvas): Ctx {
  const x = c.getContext('2d') as Ctx | null
  if (!x) throw new Error('no 2d context')
  return x
}
function fillRidge(c: Ctx, pts: Vec2[], bottom: number) {
  c.beginPath()
  c.moveTo(pts[0][0], bottom)
  for (const [x, y] of pts) c.lineTo(x, y)
  c.lineTo(pts[pts.length - 1][0], bottom)
  c.closePath()
}

// ───────────────────────────── back ─────────────────────────────
function paintBack(c: Ctx, L: HomeSceneLayout, P: ScenePalette) {
  const g = c.createLinearGradient(0, 0, 0, L.groundTop)
  g.addColorStop(0, P.sky[0]); g.addColorStop(0.55, P.sky[1]); g.addColorStop(1, P.sky[2])
  c.fillStyle = g
  c.fillRect(0, 0, L.W, L.h)
  const sg = c.createRadialGradient(L.sun.x, L.sun.y, 0, L.sun.x, L.sun.y, L.sun.r)
  sg.addColorStop(0, rgba(P.sunGlow, 0.85)); sg.addColorStop(0.25, rgba(P.sunGlow, 0.35)); sg.addColorStop(1, rgba(P.sunGlow, 0))
  c.fillStyle = sg
  c.fillRect(0, 0, L.W, L.h)
  L.ridges.forEach((r, i) => {
    fillRidge(c, r.pts, L.h)
    c.fillStyle = P.ridges[Math.min(i, P.ridges.length - 1)]
    c.fill()
    // ไอหมอกที่ตีนเขา (ไกล = จางกว่า) — ไม่มีเส้นขอบ คอนทราสต์ต่ำ
    const top = Math.min(...r.pts.map((p) => p[1]))
    const hz = c.createLinearGradient(0, top, 0, L.groundTop)
    hz.addColorStop(0, rgba(P.haze, 0)); hz.addColorStop(1, rgba(P.haze, Math.max(0, P.atmosphere.ridgeHaze - i * 0.06)))
    c.fillStyle = hz
    fillRidge(c, r.pts, L.h)
    c.fill()
  })
}

// ───────────────────────────── mid ─────────────────────────────
function roundTree(c: Ctx, x: number, y: number, r: number, color: string, P: ScenePalette) {
  c.fillStyle = mix(color, '#3f4a40', 0.35)
  c.fillRect(x - r * 0.12, y - r * 0.6, r * 0.24, r * 0.7)
  c.fillStyle = color
  c.beginPath(); c.arc(x, y - r * 1.15, r, 0, TAU); c.fill()
  c.fillStyle = rgba(P.light, 0.22)
  c.beginPath(); c.arc(x - r * 0.3, y - r * 1.4, r * 0.55, 0, TAU); c.fill()
}

function paintCliff(c: Ctx, L: HomeSceneLayout, P: ScenePalette, prop: Extract<MidProp, { type: 'cliff' }>) {
  const R = P.rock!, M = P.moss!
  const rnd = mulberry32(L.seed + 11)
  /** รูปทรงของแต่ละขั้น = ฐานหิน + ก้อนหินมนเรียงตามขอบบน (ไม่ใช่กล่องเหลี่ยม) */
  const tierShape = (t: (typeof prop.tiers)[number]) => {
    const hgt = t.bottom - t.top
    const n = t.bumps.length
    const boulders = t.bumps.map((b, k) => {
      const span = (t.x1 - t.x0) / n
      const r = hgt * (0.42 + b * 0.2)
      return { x: t.x0 + span * (k + 0.5) + (k === 0 ? span * 0.15 : 0), y: t.top + r * 0.62, rx: span * 0.7 + r * 0.35, ry: r * 0.62 }
    })
    return { boulders, baseTop: t.top + hgt * 0.4 }
  }
  const outline = (t: (typeof prop.tiers)[number]) => {
    const { boulders, baseTop } = tierShape(t)
    c.moveTo(t.x0 + 14, t.bottom)
    c.quadraticCurveTo(t.x0 - 8, t.bottom - 4, t.x0 + 2, baseTop)
    c.lineTo(t.x1, baseTop)
    c.lineTo(t.x1, t.bottom)
    c.closePath()
    for (const b of boulders) { c.moveTo(b.x + b.rx, b.y); c.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2) }
  }
  // ขั้นบนก่อน (อยู่หลัง) → ขั้นล่างทับ
  for (let i = prop.tiers.length - 1; i >= 0; i--) {
    const t = prop.tiers[i]
    const { boulders, baseTop } = tierShape(t)
    // ฐาน: หน้าซ้ายสว่าง → ขวามืด
    const g = c.createLinearGradient(t.x0, 0, t.x1, 0)
    g.addColorStop(0, R[0]); g.addColorStop(0.4, R[1]); g.addColorStop(1, R[2])
    c.fillStyle = g
    c.beginPath()
    c.moveTo(t.x0 + 14, t.bottom)
    c.quadraticCurveTo(t.x0 - 8, t.bottom - 4, t.x0 + 2, baseTop)
    c.lineTo(t.x1, baseTop); c.lineTo(t.x1, t.bottom); c.closePath()
    c.fill()
    // ก้อนหินมน แสงจากซ้ายบน (ขวา → ซ้าย ให้ก้อนสว่างทางซ้ายอยู่บน)
    for (let k = boulders.length - 1; k >= 0; k--) {
      const b = boulders[k]
      const bg = c.createRadialGradient(b.x - b.rx * 0.45, b.y - b.ry * 0.55, b.ry * 0.1, b.x, b.y, b.rx * 1.1)
      bg.addColorStop(0, R[0]); bg.addColorStop(0.55, R[1]); bg.addColorStop(1, R[2])
      c.fillStyle = bg
      c.beginPath(); c.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2); c.fill()
      // ร่องหินบางๆ
      c.strokeStyle = 'rgba(70,60,52,.2)'; c.lineWidth = 1.3
      c.beginPath(); c.moveTo(b.x + b.rx * (0.2 + rnd() * 0.3), b.y - b.ry * 0.6); c.quadraticCurveTo(b.x + b.rx * 0.1, b.y, b.x + b.rx * 0.35, b.y + b.ry * 0.7); c.stroke()
      // มอสบนยอดก้อน
      for (let m = 0; m < 4; m++) {
        c.fillStyle = M[Math.floor(rnd() * 2)]
        const a = Math.PI * (1.15 + rnd() * 0.7)
        c.beginPath(); c.ellipse(b.x + Math.cos(a) * b.rx * 0.85, b.y + Math.sin(a) * b.ry * 0.9, 6 + rnd() * 6, 3 + rnd() * 2, a + Math.PI / 2, 0, Math.PI * 2); c.fill()
      }
    }
  }
  // ลดคอนทราสต์/ความสดลงเมื่อใกล้กลางจอ — ไอหมอกจากขอบซ้ายของหน้าผา (ตัดเฉพาะรูปหน้าผา ไม่ทาท้องฟ้า)
  c.save()
  c.beginPath()
  for (const t of prop.tiers) outline(t)
  c.clip()
  const x0 = Math.min(...prop.tiers.map((t) => t.x0)), x1 = x0 + (L.W - x0) * 0.6
  const hz = c.createLinearGradient(x0 - 10, 0, x1, 0)
  hz.addColorStop(0, rgba(P.haze, P.atmosphere.propHaze)); hz.addColorStop(1, rgba(P.haze, P.atmosphere.propHaze * 0.3))
  c.fillStyle = hz
  c.fillRect(x0 - 30, 0, L.W, L.h)
  c.restore()
}

function paintTrunk(c: Ctx, P: ScenePalette, t: Extract<MidProp, { type: 'trunk' }>, L: HomeSceneLayout) {
  const T = P.trunks!
  const col = T[t.layer]
  const x2 = t.x + t.lean * (t.bottom - t.top)
  c.beginPath()
  c.moveTo(t.x - t.w / 2, t.top)
  c.lineTo(t.x + t.w / 2, t.top)
  c.lineTo(x2 + t.w * 0.6, t.bottom)
  c.quadraticCurveTo(x2, t.bottom + t.w * 0.15, x2 - t.w * 0.6, t.bottom)
  c.closePath()
  const g = c.createLinearGradient(t.x - t.w / 2, 0, t.x + t.w / 2, 0)
  g.addColorStop(0, mix(col, '#ffffff', t.layer === 2 ? 0.18 : 0.08)); g.addColorStop(0.4, col); g.addColorStop(1, mix(col, '#1e2620', 0.25))
  c.fillStyle = g
  c.fill()
  if (t.layer === 0) {
    c.fillStyle = rgba(P.haze, P.atmosphere.farHaze); c.fill()
  } else {
    // ลายเปลือกไม้
    c.strokeStyle = 'rgba(30,35,30,.18)'
    c.lineWidth = t.layer === 2 ? 2 : 1.2
    const rnd = mulberry32(Math.round(t.x * 13))
    for (let k = 0; k < (t.layer === 2 ? 9 : 4); k++) {
      const y0 = t.top + rnd() * (t.bottom - t.top), xx = t.x + (rnd() - 0.5) * t.w * 0.6
      c.beginPath(); c.moveTo(xx, y0); c.quadraticCurveTo(xx + 3, y0 + 20, xx - 1, y0 + 40 + rnd() * 30); c.stroke()
    }
    if (t.layer === 2) {
      c.fillStyle = P.moss![0]
      for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(t.x - t.w * 0.3, L.h * (0.4 + rnd() * 0.35), t.w * 0.2, 5, 0.3, 0, TAU); c.fill() }
    }
  }
}

/** ใบไม้ 1 ใบ (ปลายแหลม + เส้นกลางใบ) */
function leafShape(c: Ctx, x: number, y: number, len: number, ang: number, color: string, vein: string) {
  c.save()
  c.translate(x, y); c.rotate(ang)
  c.fillStyle = color
  c.beginPath()
  c.moveTo(0, 0)
  c.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0)
  c.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0)
  c.fill()
  c.strokeStyle = vein; c.lineWidth = Math.max(0.6, len * 0.05)
  c.beginPath(); c.moveTo(len * 0.08, 0); c.lineTo(len * 0.85, 0); c.stroke()
  c.restore()
}

/** [แก้ตามที่ระบุ — เรือนยอดฉาก 7 ละเอียด/มีเลเยอร์สี] พื้นเงาลึก → ช่องแสงลอด → กลุ่มใบ 3 ชั้น (ไกลเข้ม → ใกล้สว่าง)
 *  แต่ละกลุ่มไล่แสงซ้ายบน + ขอบแสงอุ่น + แต้มใบ · ขอบล่างเป็นช่อใบห้อยและเถาวัลย์ (ไม่ใช่ขอบหยักเรียบ) */
function paintCanopy(c: Ctx, L: HomeSceneLayout, P: ScenePalette, p: Extract<MidProp, { type: 'canopy' }>) {
  const C = P.canopy!
  const [deep, mid, light, hi] = P.canopyTones ?? [C[0], C[1], mix(C[1], '#cfe8a0', 0.3), '#d8f0a8']
  const rnd = mulberry32(L.seed + 5)
  const s = Math.max(L.w, L.h) / 1000
  const B = p.bottom
  // 1) พื้นเงาลึกของเรือนยอด
  const bg = c.createLinearGradient(0, 0, 0, B)
  bg.addColorStop(0, mix(deep, '#0e2416', 0.35)); bg.addColorStop(1, deep)
  c.fillStyle = bg
  c.fillRect(-4, -4, L.W + 8, B * 0.82 + 4)
  // 2) ช่องแสงลอด (ใบชั้นหน้าทับบางส่วน)
  for (const hole of p.holes) {
    const hg = c.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, hole.r)
    hg.addColorStop(0, rgba(P.sunGlow, 0.85)); hg.addColorStop(0.5, rgba(P.sunGlow, 0.35)); hg.addColorStop(1, rgba(P.sunGlow, 0))
    c.fillStyle = hg
    c.beginPath(); c.arc(hole.x, hole.y, hole.r, 0, TAU); c.fill()
  }
  // 3) กลุ่มใบ 3 ชั้น
  const layers = [
    { y: 0.3, step: 46, r: 30, from: deep, to: mid, rim: 0.18, daub: [mid, deep] },
    { y: 0.58, step: 40, r: 28, from: mix(deep, mid, 0.5), to: light, rim: 0.28, daub: [light, mid, deep] },
    { y: 0.86, step: 34, r: 24, from: mid, to: hi, rim: 0.4, daub: [hi, light, mid] },
  ]
  for (const ly of layers) {
    for (let x = -20 + rnd() * 20; x < L.W + 30; x += ly.step * s * (0.75 + rnd() * 0.5)) {
      const r = ly.r * s * (0.75 + rnd() * 0.55)
      const y = B * ly.y + (rnd() - 0.5) * B * 0.16
      // ก้อนใบ: หลายวงซ้อน (ขอบไม่กลมเป๊ะ)
      const g = c.createRadialGradient(x - r * 0.45, y - r * 0.5, r * 0.1, x, y, r * 1.25)
      g.addColorStop(0, ly.to); g.addColorStop(0.6, ly.from); g.addColorStop(1, mix(ly.from, '#0e2416', 0.3))
      c.fillStyle = g
      c.beginPath()
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + rnd() * 0.6
        c.moveTo(x + Math.cos(a) * r * 0.45 + r * 0.6, y + Math.sin(a) * r * 0.35)
        c.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.35, r * 0.6, 0, TAU)
      }
      c.fill()
      // ขอบแสงอุ่นด้านซ้ายบน
      c.strokeStyle = rgba(P.sunGlow, ly.rim); c.lineWidth = Math.max(1, r * 0.08)
      c.beginPath(); c.arc(x - r * 0.15, y - r * 0.1, r * 0.82, Math.PI * 1.05, Math.PI * 1.55); c.stroke()
      // แต้มใบ: บนซ้ายสว่าง ล่างขวาเข้ม
      for (let k = 0; k < 9; k++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.85
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.75
        const upper = py < y
        leafShape(c, px, py, r * (0.28 + rnd() * 0.16), rnd() * TAU, upper ? ly.daub[0] : ly.daub[ly.daub.length - 1], rgba([20, 50, 30], 0.25))
      }
    }
  }
  // 4) ขอบล่าง: ช่อใบห้อย + เถาวัลย์ยาวบางเส้น
  for (let x = rnd() * 16; x < L.W; x += 22 * s * (0.7 + rnd() * 0.6)) {
    const n = 3 + Math.floor(rnd() * 4)
    const y0 = B * (0.9 + rnd() * 0.12)
    for (let k = 0; k < n; k++) {
      const len = 9 * s * (0.8 + rnd() * 0.6)
      leafShape(c, x + (rnd() - 0.5) * 10 * s, y0 + k * len * 0.55, len, Math.PI / 2 + (rnd() - 0.5) * 1.2, k % 2 ? light : mid, rgba([20, 50, 30], 0.3))
    }
  }
  for (let v = 0; v < 7; v++) {
    const vx = rnd() * L.W, vy = B * 0.85, vl = (50 + rnd() * 80) * s
    c.strokeStyle = mix(deep, mid, 0.4); c.lineWidth = Math.max(1, 1.6 * s)
    c.beginPath(); c.moveTo(vx, vy); c.quadraticCurveTo(vx + 8 * s, vy + vl * 0.5, vx - 3 * s, vy + vl); c.stroke()
    for (let k = 1; k <= 5; k++) leafShape(c, vx + (k % 2 ? 2 : -2) * s, vy + (vl * k) / 5.5, 8 * s, Math.PI / 2 + (k % 2 ? -0.9 : 0.9), k % 2 ? light : mid, rgba([20, 50, 30], 0.3))
  }
  // 5) แสงกระเซ็นบนใบ
  for (let k = 0; k < 40; k++) {
    c.fillStyle = rgba(P.sunGlow, 0.25 + rnd() * 0.3)
    c.beginPath(); c.arc(rnd() * L.W, rnd() * B, (1 + rnd() * 2.5) * s, 0, TAU); c.fill()
  }
}

function paintArch(c: Ctx, P: ScenePalette, a: Extract<MidProp, { type: 'arch' }>) {
  const A = P.arch!, Rs = P.rose!
  const post = Math.max(8, a.w * 0.11)
  const r = a.w / 2
  c.lineCap = 'round'
  // เสา + โค้งซุ้ม (ฝั่งขวาเป็นเงา)
  c.strokeStyle = A[1]; c.lineWidth = post
  c.beginPath(); c.moveTo(a.x - r, a.y); c.lineTo(a.x - r, a.y - a.h + r); c.arc(a.x, a.y - a.h + r, r, Math.PI, TAU); c.lineTo(a.x + r, a.y); c.stroke()
  c.strokeStyle = A[0]; c.lineWidth = post * 0.6
  c.beginPath(); c.moveTo(a.x - r - post * 0.15, a.y); c.lineTo(a.x - r - post * 0.15, a.y - a.h + r); c.arc(a.x, a.y - a.h + r, r + post * 0.15, Math.PI, Math.PI * 1.6); c.stroke()
  // ใบ + กุหลาบเลื้อย
  const rnd = mulberry32(Math.round(a.x))
  for (let k = 0; k < 70; k++) {
    const u = rnd()
    let x: number, y: number
    if (u < 0.55) { const ang = Math.PI + rnd() * Math.PI; x = a.x + Math.cos(ang) * r; y = a.y - a.h + r + Math.sin(ang) * r }
    else { x = a.x + (rnd() < 0.5 ? -r : r); y = a.y - rnd() * (a.h - r) }
    c.fillStyle = rnd() < 0.5 ? P.bush![0] : P.bush![1]
    c.beginPath(); c.ellipse(x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 8, 5, 3, rnd() * 3, 0, TAU); c.fill()
    if (rnd() < 0.35) { c.fillStyle = Rs[Math.floor(rnd() * 2)]; c.beginPath(); c.arc(x + (rnd() - 0.5) * 6, y + (rnd() - 0.5) * 6, 3.4, 0, TAU); c.fill() }
  }
}

function paintMidProp(c: Ctx, L: HomeSceneLayout, P: ScenePalette, p: MidProp) {
  switch (p.type) {
    case 'cliff': return paintCliff(c, L, P, p)
    case 'trunk': return paintTrunk(c, P, p, L)
    case 'canopy': return paintCanopy(c, L, P, p)
    case 'arch': return paintArch(c, P, p)
    case 'rock': {
      const R = P.rock!
      const g = c.createRadialGradient(p.x - p.rx * 0.4, p.y - p.ry * 0.5, 1, p.x, p.y, p.rx * 1.2)
      g.addColorStop(0, R[0]); g.addColorStop(1, R[2])
      c.fillStyle = g
      c.beginPath(); c.ellipse(p.x, p.y, p.rx, p.ry, 0, Math.PI, TAU); c.lineTo(p.x + p.rx, p.y + p.ry * 0.3); c.lineTo(p.x - p.rx, p.y + p.ry * 0.3); c.fill()
      c.fillStyle = P.moss ? P.moss[0] : P.bush![0]
      c.beginPath(); c.ellipse(p.x - p.rx * 0.2, p.y - p.ry * 0.85, p.rx * 0.45, p.ry * 0.25, 0, 0, TAU); c.fill()
      return
    }
    case 'bush': {
      const B = P.bush!
      for (const [dx, dy, k] of [[-0.6, 0.1, 0.7], [0.6, 0.1, 0.7], [0, -0.25, 1]] as const) {
        c.fillStyle = B[p.tone]
        c.beginPath(); c.arc(p.x + dx * p.r, p.y + dy * p.r - p.r * 0.6, p.r * k, 0, TAU); c.fill()
      }
      c.fillStyle = rgba(P.light, 0.25)
      c.beginPath(); c.arc(p.x - p.r * 0.3, p.y - p.r * 1.15, p.r * 0.45, 0, TAU); c.fill()
      return
    }
    case 'log': {
      const T = P.trunks!
      c.fillStyle = mix(T[1], '#8a6346', 0.6)
      c.beginPath(); c.roundRect(p.x - p.len / 2, p.y - p.r * 2, p.len, p.r * 2, p.r); c.fill()
      c.fillStyle = rgba(P.light, 0.2); c.fillRect(p.x - p.len / 2 + p.r, p.y - p.r * 1.9, p.len - p.r * 2, p.r * 0.5)
      c.fillStyle = '#c9b48f'; c.beginPath(); c.ellipse(p.x + p.len / 2 - p.r * 0.2, p.y - p.r, p.r * 0.45, p.r * 0.95, 0, 0, TAU); c.fill()
      c.strokeStyle = 'rgba(120,90,60,.5)'; c.lineWidth = 1; c.beginPath(); c.ellipse(p.x + p.len / 2 - p.r * 0.2, p.y - p.r, p.r * 0.22, p.r * 0.5, 0, 0, TAU); c.stroke()
      c.fillStyle = P.moss![1]; c.beginPath(); c.ellipse(p.x - p.len * 0.1, p.y - p.r * 2, p.len * 0.25, p.r * 0.35, 0, 0, TAU); c.fill()
      return
    }
    case 'mushroom': {
      c.fillStyle = '#f2e8d6'; c.fillRect(p.x - p.s * 0.18, p.y - p.s * 0.9, p.s * 0.36, p.s * 0.9)
      c.fillStyle = P.mushroom!
      c.beginPath(); c.ellipse(p.x, p.y - p.s * 0.9, p.s * 0.6, p.s * 0.45, 0, Math.PI, TAU); c.fill()
      c.fillStyle = 'rgba(255,255,255,.8)'
      c.beginPath(); c.arc(p.x - p.s * 0.2, p.y - p.s * 1.1, p.s * 0.09, 0, TAU); c.arc(p.x + p.s * 0.18, p.y - p.s * 1.0, p.s * 0.07, 0, TAU); c.fill()
      return
    }
    case 'hedge': {
      const H = P.hedge!
      c.beginPath()
      c.moveTo(p.x0, p.y)
      const step = (p.x1 - p.x0) / (p.bumps.length - 1)
      c.lineTo(p.x0, p.y - p.h)
      p.bumps.forEach((b, k) => c.quadraticCurveTo(p.x0 + k * step - step / 2, p.y - p.h - 6 - b * 6, p.x0 + k * step, p.y - p.h))
      c.lineTo(p.x1, p.y)
      c.closePath()
      const g = c.createLinearGradient(0, p.y - p.h, 0, p.y)
      g.addColorStop(0, H[0]); g.addColorStop(1, H[1])
      c.fillStyle = g; c.fill()
      c.fillStyle = rgba(P.haze, P.atmosphere.farHaze * 0.7); c.fill()
      return
    }
    case 'topiary': {
      c.fillStyle = '#8a6b4f'; c.fillRect(p.x - 2, p.y - p.r * 1.2, 4, p.r * 1.2)
      const g = c.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 2.1, 1, p.x, p.y - p.r * 1.8, p.r * 1.1)
      g.addColorStop(0, mix(P.hedge![0], '#ffffff', 0.25)); g.addColorStop(1, P.hedge![1])
      c.fillStyle = g
      c.beginPath(); c.arc(p.x, p.y - p.r * 1.8, p.r, 0, TAU); c.fill()
      return
    }
  }
}

function paintMid(c: Ctx, L: HomeSceneLayout, P: ScenePalette, species?: Species) {
  L.hills.forEach((hl, i) => {
    fillRidge(c, hl.pts, L.h)
    const top = Math.min(...hl.pts.map((p) => p[1]))
    const g = c.createLinearGradient(0, top, 0, L.groundTop)
    g.addColorStop(0, P.hills[Math.min(i, P.hills.length - 1)]); g.addColorStop(1, mix(P.hills[Math.min(i, P.hills.length - 1)], P.ground[0], 0.5))
    c.fillStyle = g
    c.fill()
  })
  if (species && L.kind === 'meadow-falls') {
    // [แก้ตามที่ระบุ] ต้นไกลฉาก 3 (ทุ่งหญ้าน้ำตก) = สายพันธุ์/สีเดียวกับต้นไม้ MBTI ของผู้เล่น (เล็กกว่า · ผสมไอฟ้าบางๆ ตามระยะ)
    const rnd = mulberry32(L.seed + 41)
    const haze = `#${P.haze.map((v) => v.toString(16).padStart(2, '0')).join('')}`
    const tone = (hex: string) => mixHex(hex, haze, P.atmosphere.farHaze)
    for (const t of L.farTrees) drawMiniSpeciesTree(c, t.x, t.y, t.r, species, { tone, rnd })
  } else {
    for (const t of L.farTrees) roundTree(c, t.x, t.y, t.r, t.accent ? P.farTreeAccent : P.farTrees[t.tone], P)
  }
  const isBack = (p: MidProp) => p.type === 'cliff' || p.type === 'canopy' || (p.type === 'trunk' && p.layer < 2)
  // ลำต้นชั้นไกล → เรือนยอด → ลำต้นชั้นกลาง (ให้ปลายลำต้นหายเข้าเรือนยอด)
  for (const p of L.mid) if (p.type === 'trunk' && p.layer === 0) paintMidProp(c, L, P, p)
  for (const p of L.mid) if (p.type === 'canopy' || (p.type === 'trunk' && p.layer === 1) || p.type === 'cliff') paintMidProp(c, L, P, p)
  // พื้นทุ่ง (ซีดจางที่ไกล → เข้มขึ้นเมื่อใกล้)
  const gg = c.createLinearGradient(0, L.groundTop - 4, 0, L.h)
  gg.addColorStop(0, P.ground[0]); gg.addColorStop(1, P.ground[1])
  c.fillStyle = gg
  c.beginPath()
  const hl = L.hills[L.hills.length - 1].pts
  c.moveTo(0, L.h); for (const [x, y] of hl) c.lineTo(x, Math.max(y + 6, L.groundTop - 2)); c.lineTo(L.W, L.h); c.closePath()
  c.fill()
  if (L.falls) {
    const pl = L.falls.pool
    const pg = c.createRadialGradient(pl.x, pl.y, 1, pl.x, pl.y, pl.rx)
    pg.addColorStop(0, L.falls ? P.water!.body : '#000'); pg.addColorStop(1, P.water!.pool)
    c.fillStyle = pg
    c.beginPath(); c.ellipse(pl.x, pl.y, pl.rx, pl.ry, 0, 0, TAU); c.fill()
  }
  for (const p of L.mid) if (!isBack(p) && !(p.type === 'trunk')) paintMidProp(c, L, P, p)
  for (const p of L.mid) if (p.type === 'trunk' && p.layer === 2) paintMidProp(c, L, P, p)
}

// ───────────────────────────── rows ─────────────────────────────
function paintRow(c: Ctx, row: GrassRow, top: number, P: ScenePalette) {
  const d = row.depth
  const base = d < 0.5 ? mix(P.grass[0], P.grass[1], d * 2) : mix(P.grass[1], P.grass[2], (d - 0.5) * 2)
  const dark = mix(P.grass[d < 0.5 ? 1 : 2], '#2f4a2a', 0.25)
  const light = mix(P.grass[d < 0.5 ? 0 : 1], P.grassTip, 0.5)
  for (const b of row.blades) {
    const y = b.y - top, tipX = b.x + b.lean * b.h
    c.fillStyle = b.tone < 0.3 ? dark : b.tone > 0.8 ? light : base
    c.beginPath()
    c.moveTo(b.x - b.w / 2, y)
    c.quadraticCurveTo(b.x + b.lean * b.h * 0.4 - b.w * 0.2, y - b.h * 0.55, tipX, y - b.h)
    c.quadraticCurveTo(b.x + b.lean * b.h * 0.4 + b.w * 0.35, y - b.h * 0.5, b.x + b.w / 2, y)
    c.closePath()
    c.fill()
  }
  for (const f of row.flowers) {
    const y = f.y - top
    const col = P.flowers[f.color % P.flowers.length]
    c.strokeStyle = mix(P.grass[2], '#2f4a2a', 0.2)
    c.lineWidth = Math.max(0.8, f.r * 0.28)
    c.beginPath(); c.moveTo(f.x, y); c.quadraticCurveTo(f.x + 1.5, y - f.stem * 0.5, f.x, y - f.stem); c.stroke()
    const hy = y - f.stem
    if (f.kind === 'tulip') {
      c.fillStyle = col
      c.beginPath()
      c.moveTo(f.x - f.r, hy - f.r * 0.2)
      c.quadraticCurveTo(f.x - f.r, hy + f.r, f.x, hy + f.r)
      c.quadraticCurveTo(f.x + f.r, hy + f.r, f.x + f.r, hy - f.r * 0.2)
      c.lineTo(f.x + f.r * 0.5, hy - f.r * 0.9); c.lineTo(f.x, hy - f.r * 0.3); c.lineTo(f.x - f.r * 0.5, hy - f.r * 0.9)
      c.closePath(); c.fill()
      c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(f.x - f.r * 0.4, hy + f.r * 0.1, f.r * 0.22, f.r * 0.5, 0, 0, TAU); c.fill()
    } else if (f.kind === 'daisy') {
      c.fillStyle = col
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.beginPath(); c.ellipse(f.x + Math.cos(a) * f.r * 0.6, hy + Math.sin(a) * f.r * 0.6, f.r * 0.5, f.r * 0.3, a, 0, TAU); c.fill() }
      c.fillStyle = '#f6c74a'; c.beginPath(); c.arc(f.x, hy, f.r * 0.32, 0, TAU); c.fill()
    } else {
      c.fillStyle = col; c.beginPath(); c.arc(f.x, hy, f.r * 0.7, 0, TAU); c.fill()
    }
  }
}

// ───────────────────────────── overlay ─────────────────────────────
function paintOverlay(c: Ctx, L: HomeSceneLayout, P: ScenePalette, make: MakeCanvas, dpr: number) {
  const lg = c.createRadialGradient(L.w * 0.12, L.h * 0.05, 0, L.w * 0.12, L.h * 0.05, Math.max(L.w, L.h) * 0.75)
  lg.addColorStop(0, rgba(P.light, 0.22)); lg.addColorStop(1, rgba(P.light, 0))
  c.fillStyle = lg; c.fillRect(0, 0, L.w, L.h)
  const vg = c.createRadialGradient(L.w / 2, L.h * 0.55, Math.min(L.w, L.h) * 0.35, L.w / 2, L.h * 0.55, Math.max(L.w, L.h) * 0.8)
  vg.addColorStop(0, rgba(P.vignette, 0)); vg.addColorStop(1, rgba(P.vignette, P.atmosphere.vignette))
  c.fillStyle = vg; c.fillRect(0, 0, L.w, L.h)
  // เกรนกระดาษ: แผ่นนอยส์เล็ก 128px ปูซ้ำ (เม็ดขนาดเท่ากันทุกความละเอียด)
  const tile = make(128, 128)
  const tc = ctx2d(tile)
  const img = tc.createImageData(128, 128)
  const rnd = mulberry32(L.seed + 99)
  for (let i = 0; i < img.data.length; i += 4) {
    // เม็ดเทากลางอ่อน-เข้มเล็กน้อย (บางๆ ไม่เป็นจุดขาวดำ)
    const v = rnd() < 0.5 ? 90 : 235
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = Math.round(rnd() * 255 * P.grainAlpha)
  }
  tc.putImageData(img, 0, 0)
  const pat = c.createPattern(tile as CanvasImageSource, 'repeat')
  if (pat) {
    c.save()
    c.scale(1 / dpr, 1 / dpr)
    c.fillStyle = pat
    c.fillRect(0, 0, L.w * dpr, L.h * dpr)
    c.restore()
  }
}

/** วาดทุกชั้นนิ่ง — คืนบิตแมปพร้อมประกอบทุกเฟรม (bytes = หน่วยความจำโดยประมาณ) */
export function paintStatic(L: HomeSceneLayout, P: ScenePalette, dpr: number, make: MakeCanvas, species?: Species): StaticLayers {
  const full = (w: number, h: number) => {
    const cv = make(Math.ceil(w * dpr), Math.ceil(h * dpr))
    const c = ctx2d(cv)
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { cv, c }
  }
  const back = full(L.W, L.h); paintBack(back.c, L, P)
  const mid = full(L.W, L.h); paintMid(mid.c, L, P, species)
  const rows: RowLayer[] = L.rows.map((r) => {
    const pad = 4
    const top = Math.floor(r.rootTop - r.maxH * 1.15 - pad)
    const height = Math.ceil(r.rootBottom - top + pad)
    const layer = full(L.W, height)
    paintRow(layer.c, r, top, P)
    return { canvas: layer.cv, top, height, root: r.rootBottom, amp: r.amp, depth: r.depth }
  })
  const overlay = full(L.w, L.h); paintOverlay(overlay.c, L, P, make, dpr)
  let fore: Canvas | null = null
  if (L.fore.length) {
    const f = full(L.W, L.h)
    for (const p of L.fore) paintMidProp(f.c, L, P, p)
    fore = f.cv
  }
  const px = (cv: Canvas | null) => (cv ? cv.width * cv.height : 0)
  const bytes = 4 * (px(back.cv) + px(mid.cv) + px(fore) + px(overlay.cv) + rows.reduce((a, r) => a + px(r.canvas), 0))
  return { dpr, back: back.cv, mid: mid.cv, fore, rows, overlay: overlay.cv, bytes }
}
