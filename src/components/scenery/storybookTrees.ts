import { shade } from '../tree/procedural/color'
import { mulberry32 } from '../../utils/seededRandom'
import type { CanopyTones, SpeciesTones, TreeStyle } from '../../config/generatedMapArt'
import { rgba, type Ctx2D } from './sceneryPrimitives'
import type { TreeSpecies } from './sceneryShapes'

export type { TreeSpecies } from './sceneryShapes'
export { TREE_SPECIES } from './sceneryShapes'
export { TREE_STYLES, TREE_STYLE_A, TREE_STYLE_B, type TreeStyle } from '../../config/generatedMapArt'

/*============================================================================*\
  storybookTrees — ต้นไม้ฉากประกอบแบบใหม่ (อ้วนกลม น่ารัก โทนสีน้ำอุ่น) 5 สายพันธุ์ × 2 สไตล์ให้เลือก
  ────────────────────────────────────────────────────────────────────────────
  สายพันธุ์: oak (พุ่มกลม ลำต้นแตกง่าม) · fir (สนชั้นกลมมน ไม่แหลม) · blossom (ดอกชมพู/ม่วงลาเวนเดอร์)
            weeping (กิ่งห้อยนุ่ม) · birch (ลำต้นขาวซีด พุ่มโปร่ง)
  พุ่ม = ก้อนนุ่มขอบไม่กลมเป๊ะ + แต้มรูปใบไม้ · แสงจากซ้ายบนทิศเดียวทั้งฉาก · เงาโทนเย็น · ขอบแสงอุ่น
  เส้นขอบวาดเป็นชั้นล่างสุดชั้นเดียว → เห็นเฉพาะขอบนอกของทรง ไม่มีเส้นตรงที่พุ่มซ้อนกันเอง
  lod 'simple' = ต้นเล็ก/ไกล: ก้อนพุ่มน้อยลง ไม่มีแต้มใบ/ลายเปลือก/ของวิเศษ (ประหยัดงานวาด)
  ทั้งหมดอยู่ในรอยเท้าต้นไม้ใน sceneryShapes.ts (พุ่ม ≤ 1.25r รอบ (x, y-0.2r) · โคนต้น+หญ้าที่ y+0.9r)
  สี/สไตล์อยู่ที่ config/generatedMapArt.ts (TREE_STYLE_A ที่ใช้จริง · TREE_STYLE_B เก็บไว้เทียบ)
  สีไม่ใช้ชุดของต้นไม้ MBTI หน้า Home — เป็นต้นไม้ฉาก ไม่ให้สับสนกับต้นของผู้เล่น
\*============================================================================*/

export interface StyledTree {
  x: number
  y: number
  r: number
  species: TreeSpecies
  seed: number
  /** 0 = ใกล้ → 1 = ไกล (สีจางและอิ่มน้อยลงเล็กน้อย) */
  depth?: number
  /** ต้นดอก: บังคับสี (ไม่ใส่ = สุ่มตาม seed ชมพู 60% / ลาเวนเดอร์ 40%) */
  blossom?: 'pink' | 'lavender'
}

export type TreeLod = 'full' | 'simple'

const TAU = Math.PI * 2
/** ทิศแสง (ซ้ายบน) — ใช้ทั้งไล่แสงพุ่ม ลำต้น และทิศเงาบนพื้น */
const LIGHT = { x: -0.62, y: -0.78 }

/* ── รูปทรงพื้นฐาน ── */

interface Clump { x: number; y: number; r: number; sy: number; a: number; b: number }

function clump(x: number, y: number, r: number, rnd: () => number, sy = 1): Clump {
  return { x, y, r, sy, a: rnd() * TAU, b: rnd() * TAU }
}

/** ก้อนนุ่มขอบไม่กลมเป๊ะ (รัศมีแกว่งเบาๆ) — grow = ขยายออกทุกทิศ (ใช้ทำเส้นขอบ/สีซึม) */
function clumpPath(c: Ctx2D, k: Clump, grow = 0) {
  const N = 26
  c.beginPath()
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TAU
    const rr = k.r * (1 + 0.07 * Math.sin(3 * t + k.a) + 0.045 * Math.sin(5 * t + k.b)) + grow
    const px = k.x + Math.cos(t) * rr, py = k.y + Math.sin(t) * rr * k.sy
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
}

const insideClump = (k: Clump, x: number, y: number) => ((x - k.x) / k.r) ** 2 + ((y - k.y) / (k.r * k.sy)) ** 2 < 1

/** แต้มรูปใบไม้ (วงรีปลายมน) */
function daub(c: Ctx2D, x: number, y: number, len: number, wid: number, ang: number) {
  c.beginPath(); c.ellipse(x, y, len / 2, wid / 2, ang, 0, TAU); c.fill()
}

/** สีตามระยะ: ไกล → จางและอิ่มน้อยลง + สุ่มเฉดต่อต้นเล็กน้อย */
function toneOf(hex: string, depth: number, jit: [number, number, number]) {
  return shade(hex, jit[0] + depth * 0.05, jit[1], jit[2] - depth * 0.14)
}

/* ── พุ่ม: เส้นขอบชั้นล่าง → สีซึม → ก้อนไล่แสง 3 ระดับ (หลัง→หน้า) → แต้มใบ → ขอบแสงอุ่น ── */

/** เพดานแต้มใบต่อพุ่ม — คุมงบเวลาวาดของต้นใหญ่บนภาพความละเอียดสูง */
const MAX_DAUBS = 220

function paintCanopy(c: Ctx2D, clumps: Clump[], tones: CanopyTones, st: TreeStyle, rnd: () => number, lod: TreeLod, tint: (h: string) => string, pxScale = 1) {
  const shadow = tint(tones.shadow), mid = tint(tones.mid), light = tint(tones.light), hi = tint(tones.highlight)
  if (st.outline) {
    c.fillStyle = st.outline.color
    for (const k of clumps) { clumpPath(c, k, st.outline.width); c.fill() }
  }
  if (st.pool > 0) {
    // สีขังขอบแบบสีน้ำ: เส้นเข้มใต้ทุกก้อน → ก้อนที่วาดทับปิดครึ่งใน เหลือแต่ขอบนอกของทรง
    c.save(); c.globalAlpha = st.pool; c.strokeStyle = shadow; c.lineWidth = 2.2
    for (const k of clumps) { clumpPath(c, k); c.stroke() }
    c.restore()
  }
  if (st.bleed > 0) {
    c.save(); c.globalAlpha = st.bleed; c.fillStyle = mid
    for (const k of clumps) { clumpPath(c, k, k.r * 0.07); c.fill() }
    c.restore()
  }
  c.save()
  c.globalAlpha = st.fillAlpha
  for (const k of clumps) {
    c.save()
    clumpPath(c, k); c.clip()
    c.fillStyle = shadow; c.fillRect(k.x - k.r * 1.3, k.y - k.r * 1.3 * k.sy, k.r * 2.6, k.r * 2.6 * k.sy)
    c.fillStyle = mid
    c.beginPath(); c.ellipse(k.x + LIGHT.x * k.r * 0.2, k.y + LIGHT.y * k.r * 0.2 * k.sy, k.r * 0.9, k.r * 0.9 * k.sy, 0, 0, TAU); c.fill()
    c.fillStyle = light
    c.beginPath(); c.ellipse(k.x + LIGHT.x * k.r * 0.46, k.y + LIGHT.y * k.r * 0.46 * k.sy, k.r * 0.52, k.r * 0.5 * k.sy, -0.5, 0, TAU); c.fill()
    c.restore()
  }
  c.restore()

  if (lod === 'full') {
    // แต้มใบ: สีตามก้อนหน้าสุดที่จุดนั้นอยู่ — ด้านรับแสงสว่าง ด้านหลบแสงเข้ม
    // จำนวนตามพื้นที่บนจอจริง (px²) → ภาพเล็ก/ใหญ่ได้ความถี่แต้มเท่ากัน
    const area = clumps.reduce((s, k) => s + k.r * k.r * k.sy, 0) * pxScale * pxScale
    const n = Math.min(MAX_DAUBS, Math.round((area / 9) * st.daubDensity))
    c.save(); c.globalAlpha = st.daubAlpha
    for (let i = 0; i < n; i++) {
      const k0 = clumps[Math.floor(rnd() * clumps.length)]
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * k0.r * 0.92
      const x = k0.x + Math.cos(a) * d, y = k0.y + Math.sin(a) * d * k0.sy
      let front = k0
      for (let j = clumps.length - 1; j >= 0; j--) if (insideClump(clumps[j], x, y)) { front = clumps[j]; break }
      const lit = ((x - front.x) * LIGHT.x + (y - front.y) * LIGHT.y) / front.r
      c.fillStyle = lit > 0.35 ? (rnd() < 0.4 ? hi : light) : lit > -0.2 ? (rnd() < 0.5 ? light : mid) : (rnd() < 0.6 ? shadow : mid)
      const len = Math.max(2.5 / pxScale, front.r * (0.16 + rnd() * 0.08))
      daub(c, x, y, len, len * 0.55, -0.6 + (rnd() - 0.5) * 1.4)
    }
    c.restore()

    // ขอบแสงอุ่นด้านซ้ายบน — เฉพาะช่วงขอบที่ไม่ถูกก้อนอื่นบัง (ขอบนอกของทรงจริง)
    c.save(); c.globalAlpha = st.rim.alpha; c.strokeStyle = st.rim.color; c.lineCap = 'round'
    for (const k of clumps) {
      c.lineWidth = Math.max(1.2, k.r * 0.07)
      for (let t = Math.PI * 1.02; t < Math.PI * 1.62; t += 0.12) {
        const tm = t + 0.06, inset = k.r * 0.9
        const mx = k.x + Math.cos(tm) * k.r * 1.04, my = k.y + Math.sin(tm) * k.r * 1.04 * k.sy
        if (clumps.some((o) => o !== k && insideClump(o, mx, my))) continue
        c.beginPath()
        c.moveTo(k.x + Math.cos(t) * inset, k.y + Math.sin(t) * inset * k.sy)
        c.lineTo(k.x + Math.cos(t + 0.12) * inset, k.y + Math.sin(t + 0.12) * inset * k.sy)
        c.stroke()
      }
    }
    c.restore()
  }
}

/* ── ลำต้น: เรียวจากโคนบานมีราก + ลายเปลือก + ง่ามกิ่งใต้พุ่ม + โพรงหน้าต่างเรือง ── */

interface TrunkSpec { topY: number; baseW: number; topW: number; lean: number; fork: number; pale: boolean }

function trunkOutlinePath(c: Ctx2D, x: number, gy: number, s: TrunkSpec, w: (n: number) => number) {
  const h = gy - s.topY
  const tx = x + s.lean
  c.beginPath()
  c.moveTo(x - s.baseW * 0.95 + w(1), gy)
  // ราก: นูนเบาๆ 2 จุดตามขอบล่าง
  c.quadraticCurveTo(x - s.baseW * 0.55, gy - h * 0.02 + w(2), x - s.baseW * 0.42, gy - h * 0.08)
  c.bezierCurveTo(x - s.topW * 0.7 + w(3), gy - h * 0.35, tx - s.topW * 0.55, s.topY + h * 0.3, tx - s.topW / 2, s.topY)
  c.lineTo(tx + s.topW / 2, s.topY)
  c.bezierCurveTo(tx + s.topW * 0.55, s.topY + h * 0.3, x + s.topW * 0.7 + w(4), gy - h * 0.35, x + s.baseW * 0.42, gy - h * 0.08)
  c.quadraticCurveTo(x + s.baseW * 0.55, gy - h * 0.02 + w(5), x + s.baseW * 0.95 + w(6), gy)
  c.quadraticCurveTo(x, gy + h * 0.03, x - s.baseW * 0.95 + w(1), gy)
  c.closePath()
}

function paintTrunk(c: Ctx2D, x: number, gy: number, s: TrunkSpec, tones: SpeciesTones, st: TreeStyle, rnd: () => number, lod: TreeLod, tint: (h: string) => string, hollow: boolean) {
  const [dark, mid, light] = tones.trunk.map(tint)
  const wob = Array.from({ length: 8 }, () => (rnd() - 0.5) * s.baseW * 0.12)
  const w = (n: number) => wob[n] ?? 0
  const h = gy - s.topY

  // ง่ามกิ่ง (วาดก่อนลำต้น ให้โคนกิ่งกลืนกับลำต้น) — ปลายหายเข้าไปในพุ่ม
  if (s.fork > 0) {
    c.lineCap = 'round'
    const forkY = s.topY + h * 0.38
    for (const side of [-1, 1]) {
      const ex = x + s.lean + side * s.fork, ey = s.topY - h * 0.2
      const pathFork = () => { c.beginPath(); c.moveTo(x + s.lean * 0.6, forkY); c.quadraticCurveTo(x + side * s.fork * 0.25, forkY - h * 0.25, ex, ey) }
      if (st.outline) { c.strokeStyle = st.outline.color; c.lineWidth = s.topW * 0.62 + st.outline.width * 2; pathFork(); c.stroke() }
      c.strokeStyle = side < 0 ? mid : dark; c.lineWidth = s.topW * 0.62; pathFork(); c.stroke()
    }
  }

  if (st.outline) { c.strokeStyle = st.outline.color; c.lineWidth = st.outline.width * 2; trunkOutlinePath(c, x, gy, s, w); c.stroke() }
  const g = c.createLinearGradient(x - s.baseW, 0, x + s.baseW, 0)
  g.addColorStop(0, light); g.addColorStop(0.45, mid); g.addColorStop(1, dark)
  c.fillStyle = g
  trunkOutlinePath(c, x, gy, s, w); c.fill()
  if (st.pool > 0) { c.save(); c.globalAlpha = st.pool * 0.7; c.strokeStyle = dark; c.lineWidth = 1.4; trunkOutlinePath(c, x, gy, s, w); c.stroke(); c.restore() }

  if (lod === 'full') {
    c.save(); c.lineCap = 'round'
    if (s.pale) {
      // เบิร์ช: ขีดสีเข้มแนวนอนสั้นๆ ตามลำต้น
      c.strokeStyle = st.bark.lenticel; c.lineWidth = Math.max(1, s.baseW * 0.08)
      for (let i = 0; i < 6; i++) {
        const yy = gy - h * (0.12 + rnd() * 0.8), half = s.topW * (0.18 + rnd() * 0.2)
        const xx = x + s.lean * ((gy - yy) / h) + (rnd() - 0.5) * s.topW * 0.4
        c.beginPath(); c.moveTo(xx - half, yy); c.quadraticCurveTo(xx, yy + 1.2, xx + half, yy - 0.4); c.stroke()
      }
    } else {
      // ลายเปลือก: เส้นบางโค้งๆ แนวตั้ง ด้านหลบแสงชัดกว่า
      c.strokeStyle = dark; c.globalAlpha = 0.42; c.lineWidth = Math.max(0.8, s.baseW * 0.05)
      for (let i = 0; i < 3; i++) {
        const fx = (i - 0.6) * s.topW * 0.32
        c.beginPath()
        c.moveTo(x + fx * 1.4, gy - h * 0.06)
        c.bezierCurveTo(x + fx + (rnd() - 0.5) * 2, gy - h * 0.35, x + s.lean * 0.5 + fx * 0.8, gy - h * 0.6, x + s.lean * 0.7 + fx * 0.7, gy - h * (0.78 + rnd() * 0.1))
        c.stroke()
      }
    }
    c.restore()
    if (hollow) {
      // โพรงต้นไม้ + หน้าต่างจิ๋วเรืองแสง (ระลึกถึงต้นไม้กลวงในแผนที่ 1)
      const hx = x + s.lean * 0.25 + s.topW * 0.05, hy = gy - h * 0.42, hr = s.topW * 0.36
      c.fillStyle = st.bark.hollow
      c.beginPath(); c.ellipse(hx, hy, hr, hr * 1.35, 0, 0, TAU); c.fill()
      const gl = c.createRadialGradient(hx, hy, 0, hx, hy, hr * 2.4)
      gl.addColorStop(0, rgba(st.magic.glow, 0.55)); gl.addColorStop(1, rgba(st.magic.glow, 0))
      c.fillStyle = gl; c.beginPath(); c.arc(hx, hy, hr * 2.4, 0, TAU); c.fill()
      c.fillStyle = st.magic.window
      c.beginPath(); c.moveTo(hx - hr * 0.45, hy + hr * 0.55); c.lineTo(hx - hr * 0.45, hy - hr * 0.1)
      c.arc(hx, hy - hr * 0.1, hr * 0.45, Math.PI, TAU); c.lineTo(hx + hr * 0.45, hy + hr * 0.55); c.closePath(); c.fill()
      c.strokeStyle = st.bark.windowFrame; c.lineWidth = Math.max(0.6, hr * 0.1)
      c.beginPath(); c.moveTo(hx, hy - hr * 0.5); c.lineTo(hx, hy + hr * 0.55); c.moveTo(hx - hr * 0.45, hy + hr * 0.1); c.lineTo(hx + hr * 0.45, hy + hr * 0.1); c.stroke()
    }
  }
}

/* ── พื้นใต้ต้น: เงาตกทิศเดียวกันทุกต้น (ขวาล่าง) + กอหญ้า ดอกจิ๋ว ใบไม้ร่วง ── */

function paintGround(c: Ctx2D, t: StyledTree, st: TreeStyle, rnd: () => number, lod: TreeLod, petals?: readonly string[]) {
  const { x, r } = t, gy = t.y + 0.9 * r
  const sx = x - LIGHT.x * r * 0.35, sy = gy + r * 0.04
  const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * 0.95)
  g.addColorStop(0, rgba(st.ground.shadow, st.ground.shadowAlpha)); g.addColorStop(0.7, rgba(st.ground.shadow, st.ground.shadowAlpha * 0.55)); g.addColorStop(1, rgba(st.ground.shadow, 0))
  c.save(); c.translate(sx, sy); c.scale(1, 0.24); c.translate(-sx, -sy)
  c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r * 0.95, 0, TAU); c.fill()
  c.restore()
  if (lod !== 'full') return
  c.save(); c.lineCap = 'round'
  c.strokeStyle = st.ground.grass; c.lineWidth = Math.max(1, r * 0.022)
  for (let i = 0; i < 4; i++) {
    const gx = x + (rnd() - 0.5) * r * 0.62, base = gy + (rnd() - 0.3) * r * 0.06, hgt = r * (0.07 + rnd() * 0.05)
    c.beginPath()
    c.moveTo(gx, base); c.quadraticCurveTo(gx - hgt * 0.3, base - hgt * 0.6, gx - hgt * 0.5, base - hgt)
    c.moveTo(gx, base); c.quadraticCurveTo(gx + hgt * 0.1, base - hgt * 0.7, gx + hgt * 0.25, base - hgt * 1.15)
    c.moveTo(gx, base); c.quadraticCurveTo(gx + hgt * 0.4, base - hgt * 0.5, gx + hgt * 0.6, base - hgt * 0.8)
    c.stroke()
  }
  for (let i = 0; i < 3; i++) {
    c.fillStyle = st.ground.flowers[Math.floor(rnd() * st.ground.flowers.length)]
    c.beginPath(); c.arc(x + (rnd() - 0.5) * r * 0.66, gy + (rnd() - 0.4) * r * 0.08, Math.max(1, r * 0.022), 0, TAU); c.fill()
  }
  if (petals || rnd() < 0.5) {
    const n = petals ? 4 : 1 + Math.floor(rnd() * 2)
    for (let i = 0; i < n; i++) {
      c.fillStyle = petals ? petals[Math.floor(rnd() * petals.length)] : st.ground.leaf
      daub(c, x + (rnd() - 0.2) * r * 0.62, gy + (rnd() - 0.3) * r * 0.1, r * 0.07, r * 0.04, rnd() * TAU)
    }
  }
  c.restore()
}

/* ── ของวิเศษ (ใส่บางต้นเท่านั้น) ── */

function paintGlowMushrooms(c: Ctx2D, x: number, gy: number, r: number, st: TreeStyle, rnd: () => number) {
  const n = 1 + (rnd() < 0.5 ? 1 : 0)
  for (let i = 0; i < n; i++) {
    const mx = x + (i ? 1 : -1) * r * (0.2 + rnd() * 0.08), s = r * (0.07 + rnd() * 0.03), my = gy + r * 0.01
    const g = c.createRadialGradient(mx, my - s, 0, mx, my - s, s * 3)
    g.addColorStop(0, rgba(st.magic.mushroomGlow, 0.55)); g.addColorStop(1, rgba(st.magic.mushroomGlow, 0))
    c.fillStyle = g; c.beginPath(); c.arc(mx, my - s, s * 3, 0, TAU); c.fill()
    c.fillStyle = st.magic.mushroomStem; c.fillRect(mx - s * 0.18, my - s * 0.9, s * 0.36, s * 0.9)
    c.fillStyle = st.magic.mushroom
    c.beginPath(); c.ellipse(mx, my - s * 0.9, s * 0.62, s * 0.45, 0, Math.PI, TAU); c.closePath(); c.fill()
  }
}

function paintLantern(c: Ctx2D, x: number, y: number, r: number, st: TreeStyle) {
  const s = r * 0.08
  c.strokeStyle = st.magic.lanternString; c.lineWidth = Math.max(0.7, s * 0.12)
  c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x, y - s * 0.6); c.stroke()
  const g = c.createRadialGradient(x, y, 0, x, y, s * 3.2)
  g.addColorStop(0, rgba(st.magic.glow, 0.7)); g.addColorStop(1, rgba(st.magic.glow, 0))
  c.fillStyle = g; c.beginPath(); c.arc(x, y, s * 3.2, 0, TAU); c.fill()
  c.fillStyle = st.magic.lantern
  c.beginPath(); c.roundRect(x - s * 0.5, y - s * 0.6, s, s * 1.3, s * 0.35); c.fill()
  c.fillStyle = st.magic.lanternFrame; c.fillRect(x - s * 0.6, y - s * 0.75, s * 1.2, s * 0.22)
}

function paintVine(c: Ctx2D, x: number, gy: number, topY: number, w: number, st: TreeStyle, rnd: () => number) {
  c.save(); c.strokeStyle = st.magic.vine; c.lineWidth = Math.max(0.8, w * 0.1); c.lineCap = 'round'
  const h = gy - topY
  c.beginPath()
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, yy = gy - h * t * 0.85, xx = x + Math.sin(t * 7 + rnd() * 0.3) * w * 0.42
    if (i === 0) c.moveTo(xx, yy)
    else c.lineTo(xx, yy)
  }
  c.stroke()
  c.fillStyle = st.magic.vineLeaf
  for (let i = 1; i < 6; i++) {
    const t = i / 6, yy = gy - h * t * 0.85, xx = x + Math.sin(t * 7) * w * 0.42
    daub(c, xx + w * 0.12, yy, w * 0.32, w * 0.18, -0.6)
  }
  c.restore()
}

function paintFireflies(c: Ctx2D, t: StyledTree, st: TreeStyle, rnd: () => number) {
  for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) {
    const fx = t.x + (rnd() - 0.5) * t.r * 1.6, fy = t.y + (rnd() - 0.2) * t.r * 0.9, fr = t.r * 0.09
    const g = c.createRadialGradient(fx, fy, 0, fx, fy, fr)
    g.addColorStop(0, rgba(st.magic.firefly, 0.9)); g.addColorStop(1, rgba(st.magic.firefly, 0))
    c.fillStyle = g; c.beginPath(); c.arc(fx, fy, fr, 0, TAU); c.fill()
  }
}

/* ── ทรงพุ่มต่อสายพันธุ์ (อยู่ในรอยเท้าต้นไม้เสมอ) ── */

function roundCrown(t: StyledTree, rnd: () => number, opts: { count: [number, number]; size: [number, number]; spread: number; cy: number }): Clump[] {
  const { x, y, r } = t
  const skew = rnd() < 0.5 ? -1 : 1 // พุ่มเอียงไปข้างหนึ่งเล็กน้อย — ทุกต้นทรงไม่เหมือนกัน
  const cx = x + skew * r * 0.06, cy = y + opts.cy * r
  const n = opts.count[0] + Math.floor(rnd() * (opts.count[1] - opts.count[0] + 1))
  const ring: Clump[] = []
  const start = rnd() * TAU
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * TAU + (rnd() - 0.5) * 0.5
    const d = r * opts.spread * (0.8 + rnd() * 0.35) * (Math.cos(a) * skew > 0 ? 1.12 : 0.94)
    const rr = r * (opts.size[0] + rnd() * (opts.size[1] - opts.size[0]))
    ring.push(clump(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.78, rr, rnd, 0.92))
  }
  // ก้อนบนวาดก่อน (อยู่หลัง) ก้อนล่างวาดทีหลัง (อยู่หน้า) · ก้อนกลางใหญ่อยู่หลังสุด
  ring.sort((p, q) => p.y - q.y)
  return [clump(cx, cy - r * 0.08, r * (opts.size[1] + 0.06), rnd, 0.9), ...ring]
}

function firTiers(t: StyledTree, rnd: () => number): Clump[] {
  const { x, y, r } = t
  const n = 4 + (rnd() < 0.5 ? 1 : 0)
  const bottom = y + 0.36 * r, top = y - 0.98 * r
  const out: Clump[] = []
  // ชั้นบนวาดก่อน ชั้นล่างทับหน้า — แต่ละชั้นเป็นขอบล่างหยักมน (ก้อนเรียงแถว) + ก้อนกลางยอดชั้น
  for (let i = n - 1; i >= 0; i--) {
    const u = i / (n - 1)
    const ty = bottom + (top - bottom) * u
    const half = r * (0.74 - 0.56 * u) * (0.94 + rnd() * 0.12)
    const k = Math.max(2, Math.round(half / (r * 0.17)))
    const sr = (half / Math.max(1, k - 1)) * 0.9 + r * 0.05
    out.push(clump(x + (rnd() - 0.5) * r * 0.04, ty - sr * 0.55, half * 0.72 + r * 0.04, rnd, 0.62))
    for (let j = 0; j < k; j++) {
      const px = x - half + (k === 1 ? half : (2 * half * j) / (k - 1)) * 1
      out.push(clump(px * 0.92 + x * 0.08, ty + (rnd() - 0.5) * r * 0.03, sr, rnd, 0.8))
    }
  }
  out.unshift(clump(x, top - r * 0.17, r * 0.15, rnd, 0.95))
  return out
}

function weepingCrown(t: StyledTree, rnd: () => number): { back: Clump[]; dome: Clump[]; front: Clump[] } {
  const { x, y, r } = t
  const dome = roundCrown(t, rnd, { count: [4, 5], size: [0.34, 0.44], spread: 0.48, cy: -0.42 })
  // สายห้อย: ก้อนเล็กเรียงลง เรียวลงและพลิ้วออกด้านข้างทีละนิด (ไม่ใช่แท่งตรง)
  const strand = (sx: number, startY: number, len: number): Clump[] => {
    const parts = 4, sway = (rnd() - 0.5) * r * 0.1
    return Array.from({ length: parts }, (_, i) => {
      const u = (i + 0.5) / parts
      return clump(sx + sway * u * u, startY + len * u, r * (0.085 - i * 0.012), rnd, 1.7)
    })
  }
  const back: Clump[] = [], front: Clump[] = []
  const m = 7 + Math.floor(rnd() * 3)
  for (let i = 0; i < m; i++) {
    const u = (i + 0.5) / m, sx = x + (u - 0.5) * r * 1.5
    const edge = Math.abs(u - 0.5) * 2
    const startY = y - r * (0.12 - edge * 0.12), len = r * (0.5 + rnd() * 0.18 - edge * 0.12)
    ;(i % 2 ? front : back).push(...strand(sx, startY, len))
  }
  return { back, dome, front }
}

/* ── พุ่มไม้เตี้ย (สไตล์เดียวกับต้นไม้) — ก้อนเรียงแนวนอน อยู่ในรอยเท้าพุ่มของ sceneryShapes ── */

export interface StyledBush { x: number; y: number; r: number; seed: number; tone: number; depth?: number }

export function drawStyledBush(c: Ctx2D, b: StyledBush, st: TreeStyle, lod: TreeLod = 'full', pxScale = 1) {
  const rnd = mulberry32(Math.imul(b.seed ^ 0x85ebca6b, 2654435761) >>> 0)
  const jit: [number, number, number] = [(rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.018, (rnd() - 0.5) * 0.08]
  const tint = (h: string) => toneOf(h, b.depth ?? 0, jit)
  const tones = st.bushes[b.tone % st.bushes.length]
  const { x, y, r } = b
  // เงาตกขวาล่างทิศเดียวกับต้นไม้
  const sx = x - LIGHT.x * r * 0.25, sy = y + r * 0.42
  const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * 1.05)
  g.addColorStop(0, rgba(st.ground.shadow, st.ground.shadowAlpha)); g.addColorStop(1, rgba(st.ground.shadow, 0))
  c.save(); c.translate(sx, sy); c.scale(1, 0.3); c.translate(-sx, -sy)
  c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r * 1.05, 0, TAU); c.fill()
  c.restore()
  const n = 3 + (rnd() < 0.5 ? 1 : 0)
  const clumps: Clump[] = []
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1)
    clumps.push(clump(x + (u - 0.5) * r * 1.2 + (rnd() - 0.5) * r * 0.1, y - r * (0.02 + rnd() * 0.1), r * (0.4 + rnd() * 0.12), rnd, 0.82))
  }
  clumps.push(clump(x + (rnd() - 0.5) * r * 0.3, y - r * 0.2, r * 0.46, rnd, 0.8))
  clumps.sort((p, q) => p.y - q.y)
  paintCanopy(c, clumps, tones, st, rnd, lod, tint, pxScale)
  if (lod === 'full' && rnd() < 0.4) {
    for (let i = 0; i < 4; i++) {
      c.fillStyle = st.ground.flowers[Math.floor(rnd() * st.ground.flowers.length)]
      c.beginPath(); c.arc(x + (rnd() - 0.5) * r * 1.2, y - r * 0.15 + (rnd() - 0.5) * r * 0.4, Math.max(1 / pxScale, r * 0.05), 0, TAU); c.fill()
    }
  }
}

/* ── วาดต้นไม้ 1 ต้น ── */

/** ระดับรายละเอียดตามขนาดบนจอ — ต้นที่เล็กกว่า 30px ใช้แบบง่าย */
export function treeLodFor(rPixels: number): TreeLod {
  return rPixels < 30 ? 'simple' : 'full'
}

/** pxScale = พิกเซลต่อหน่วยวาด (ฉากแผนที่ย่อ/ขยาย) — ใช้คุมความถี่แต้มใบ */
export function drawStyledTree(c: Ctx2D, t: StyledTree, st: TreeStyle, lod: TreeLod = 'full', pxScale = 1) {
  // คลุก seed ก่อน — seed ที่ใกล้กัน (101, 138, …) ไม่ให้ค่าสุ่มช่วงแรกคล้ายกันจนของวิเศษขึ้นถี่เกิน
  const rnd = mulberry32(Math.imul(t.seed ^ 0x9e3779b9, 2654435761) >>> 0)
  const depth = t.depth ?? 0
  const jit: [number, number, number] = [(rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.018, (rnd() - 0.5) * 0.08]
  const tint = (h: string) => toneOf(h, depth, jit)
  const lavenderRoll = rnd()
  const lavender = t.species === 'blossom' && (t.blossom ? t.blossom === 'lavender' : lavenderRoll < 0.4)
  const tones = lavender ? st.tones.blossomAlt : st.tones[t.species]
  const { x, y, r } = t
  const gy = y + 0.9 * r
  const simplify = (cl: Clump[]) => (lod === 'simple' ? [...cl].sort((a, b) => b.r - a.r).slice(0, 4).sort((a, b) => a.y - b.y) : cl)
  const magicRoll = rnd()

  paintGround(c, t, st, rnd, lod, t.species === 'blossom' ? tones.petals : undefined)

  switch (t.species) {
    case 'fir': {
      paintTrunk(c, x, gy, { topY: y + 0.3 * r, baseW: r * 0.17, topW: r * 0.1, lean: 0, fork: 0, pale: false }, tones, st, rnd, lod, tint, false)
      paintCanopy(c, simplify(firTiers(t, rnd)), tones.canopy, st, rnd, lod, tint, pxScale)
      break
    }
    case 'weeping': {
      const crown = weepingCrown(t, rnd)
      if (lod === 'full') paintCanopy(c, crown.back, tones.canopy, st, rnd, lod, tint, pxScale)
      const hollow = lod === 'full' && magicRoll < 0.18
      paintTrunk(c, x, gy, { topY: y - 0.25 * r, baseW: r * 0.24, topW: r * 0.13, lean: (rnd() - 0.5) * r * 0.08, fork: r * 0.22, pale: false }, tones, st, rnd, lod, tint, hollow)
      paintCanopy(c, simplify(crown.dome), tones.canopy, st, rnd, lod, tint, pxScale)
      if (lod === 'full') paintCanopy(c, crown.front, tones.canopy, st, rnd, lod, tint, pxScale)
      break
    }
    case 'birch': {
      const lean = (rnd() - 0.5) * r * 0.14
      paintTrunk(c, x, gy, { topY: y - 0.2 * r, baseW: r * 0.15, topW: r * 0.08, lean, fork: r * 0.16, pale: true }, tones, st, rnd, lod, tint, false)
      paintCanopy(c, simplify(roundCrown({ ...t, x: x + lean }, rnd, { count: [7, 9], size: [0.22, 0.3], spread: 0.55, cy: -0.36 })), tones.canopy, st, rnd, lod, tint, pxScale)
      break
    }
    default: {
      // oak / blossom: ลำต้นแตกง่าม พุ่มกลมอ้วน
      const hollow = lod === 'full' && t.species === 'oak' && magicRoll < 0.2
      paintTrunk(c, x, gy, { topY: y - 0.05 * r, baseW: r * 0.27, topW: r * 0.15, lean: (rnd() - 0.5) * r * 0.06, fork: r * 0.3, pale: false }, tones, st, rnd, lod, tint, hollow)
      paintCanopy(c, simplify(roundCrown(t, rnd, { count: [5, 7], size: [0.36, 0.48], spread: 0.5, cy: -0.24 })), tones.canopy, st, rnd, lod, tint, pxScale)
      if (t.species === 'blossom' && lod === 'full' && tones.petals) {
        for (let i = 0; i < Math.round(r * 0.5); i++) {
          const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.85
          c.fillStyle = tones.petals[Math.floor(rnd() * tones.petals.length)]
          c.beginPath(); c.arc(x + Math.cos(a) * d, y - 0.24 * r + Math.sin(a) * d * 0.72, Math.max(0.9, r * 0.028), 0, TAU); c.fill()
        }
      }
    }
  }

  if (lod === 'full') {
    // ของวิเศษ — ใส่บางต้นเท่านั้น (สุ่มตาม seed ต้นเดิมได้ของเดิม)
    if (magicRoll > 0.82) paintGlowMushrooms(c, x, gy, r, st, rnd)
    else if (magicRoll > 0.72 && t.species !== 'fir') paintLantern(c, x + (rnd() < 0.5 ? -1 : 1) * r * 0.5, y + 0.26 * r, r, st)
    else if (magicRoll > 0.64 && (t.species === 'oak' || t.species === 'weeping')) paintVine(c, x, gy, y + 0.2 * r, r * 0.22, st, rnd)
    if (rnd() < 0.2) paintFireflies(c, t, st, rnd)
  }
}

/* ── ชั้นเก็บงานทั้งฉาก: เกรนกระดาษสีน้ำ + ขอบมืดนุ่มๆ — ให้แผนที่วาดด้วยโค้ดเข้ากับแผนที่ภาพวาด ── */

let grainTile: OffscreenCanvas | HTMLCanvasElement | null = null
function grain(): OffscreenCanvas | HTMLCanvasElement {
  if (grainTile) return grainTile
  const S = 128
  const tile = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S })
  const g = tile.getContext('2d') as Ctx2D
  const rnd = mulberry32(90210)
  const img = g.createImageData(S, S)
  for (let i = 0; i < S * S; i++) {
    const v = 128 + (rnd() - 0.5) * 70
    img.data.set([v, v, v, 255], i * 4)
  }
  g.putImageData(img, 0, 0)
  grainTile = tile
  return tile
}

/** strength 0-1 — A ใช้ราว 1 (เกรนชัด) · B ราว 0.6 · tileScale = ขนาดเม็ดเกรน (หน่วยวาด ต่อ 1 px ของลาย) */
export function paintPaperFinish(c: Ctx2D, w: number, h: number, st: TreeStyle, strength: number, tileScale = 1) {
  c.save()
  const pat = c.createPattern(grain(), 'repeat')
  if (pat) {
    if (typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(tileScale))
    c.globalCompositeOperation = 'overlay'
    c.globalAlpha = st.finish.grainAlpha * strength
    c.fillStyle = pat
    c.fillRect(0, 0, w, h)
  }
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.hypot(w, h) * 0.56)
  v.addColorStop(0, rgba(st.finish.vignette, 0))
  v.addColorStop(1, rgba(st.finish.vignette, st.finish.vignetteAlpha * strength))
  c.fillStyle = v
  c.fillRect(0, 0, w, h)
  c.restore()
}
