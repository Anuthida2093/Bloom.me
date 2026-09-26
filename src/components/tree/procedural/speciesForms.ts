import { shade } from './color'
import { pointOnBranch, type BranchSegment, type Vec3 } from './generateTree'
import type { TreeClump, TreeFruit, TreeLeaf } from './buildTreeModel'
import type { Species } from './species'

/*============================================================================*\
  speciesForms — โครงต้นไม้สายพันธุ์ที่ไม่ได้แตกกิ่งแบบต้นไม้ทั่วไป + ส่วนเสริมเฉพาะสายพันธุ์
  ────────────────────────────────────────────────────────────────────────────
  column (สนไซเปรส) / cone (สนสปรูซ) / palm (ปาล์ม) / bamboo (ไผ่) — สร้างกิ่ง/ใบ/ก้อนพุ่มเองทั้งหมด
  weepingStrands (หลิว) / aerialRoots (ไทร) — เติมบนต้นที่แตกกิ่งปกติแล้ว
  ทุกแบบโตตาม g = (ขั้นภาพ - 1) / 7 : ต้นกล้า (g=0) เล็ก องค์ประกอบน้อย → ต้นโตเต็มที่ (g=1)
  พิกัดหน่วยต้นไม้ (y ขึ้นฟ้า) — ต้นโตเต็มที่สูง ~10 หน่วย เท่าต้นไม้แตกกิ่งปกติ
\*============================================================================*/

export interface FormInput {
  species: Species
  /** ขั้นภาพ 1-8 */
  level: number
  rand: () => number
  /** ความยาวใบพื้นฐาน (หน่วยต้นไม้) */
  leafLength: number
  widthOf: () => number
  /** จอเล็ก → องค์ประกอบน้อยลง */
  compact: boolean
}

export interface FormOutput {
  branches: BranchSegment[]
  leaves: TreeLeaf[]
  clumps: TreeClump[]
  fruits: TreeFruit[]
  crown: { cx: number; cy: number; rx: number; ry: number }
  flutterable: number[]
}

const FULL_HEIGHT = 10

/** สีใบจากชุดสีสายพันธุ์: ด้านซ้าย (รับแดด) สว่างกว่า + สุ่มเล็กน้อย */
function leafColor(sp: Species, rand: () => number, lit: number): string {
  const base = sp.leafColors[Math.floor(rand() * sp.leafColors.length)]
  return shade(base, (lit - 0.5) * 0.16 + (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.06)
}

const seg = (start: Vec3, end: Vec3, r0: number, r1: number, depth: number, bend = 0): BranchSegment => {
  const mid: Vec3 = [(start[0] + end[0]) / 2 + bend, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]
  return { start, mid, end, radiusStart: r0, radiusEnd: r1, depth }
}

/** มุมปลายใบบนจอจากทิศ (dx, dy) — 0 = ชี้ขึ้น หมุนตามเข็มนาฬิกา */
const angleOf = (dx: number, dy: number) => Math.atan2(dx, dy)

/* ── สนไซเปรส: ทรงเสาเรียวยอดแหลม (เปลวเทียน) ใบเข็มชี้ขึ้น — ระเบียบ มุ่งตรงสู่เป้าหมาย ── */
function columnOrCone(inp: FormInput, cone: boolean): FormOutput {
  const { species: sp, level, rand, leafLength, widthOf, compact } = inp
  const g = (level - 1) / 7
  const H = FULL_HEIGHT * (0.42 + 0.58 * g)
  const y0 = H * (cone ? 0.1 : 0.07)
  const branches: BranchSegment[] = []
  const leaves: TreeLeaf[] = []
  const clumps: TreeClump[] = []
  const flutterable: number[] = []

  // กรวยสปรูซแบ่งเป็นชั้น (เพิ่มชั้นตามอายุ) ขอบล่างแต่ละชั้นกว้างกว่าบน — สมมาตร เป็นระเบียบ
  const tiers = cone ? 3 + Math.round(level * 1.1) : 0
  const Wb = H * (cone ? 0.34 : 0.13)
  const width = (y: number) => {
    const u = Math.max(0, Math.min(1, (y - y0) / (H - y0)))
    if (!cone) return Wb * (u < 0.3 ? 0.72 + 0.28 * (u / 0.3) : Math.pow((1 - u) / 0.7, 0.85))
    const k = Math.min(tiers - 1, Math.floor(u * tiers))
    const uB = k / tiers, uT = (k + 1) / tiers
    const s = (uT - u) / (uT - uB) // 0 = บนชั้น → 1 = ล่างชั้น
    return Wb * (1 - uB) * (0.3 + 0.7 * s)
  }

  // ลำต้นตรง (โผล่ใต้พุ่มนิดเดียว) หนาตามอายุ
  const r0 = 0.26 * (0.45 + 0.55 * g)
  branches.push(seg([0, 0, 0], [0, H * 0.98, 0], r0, 0.03, 0))
  // กิ่งสั้นๆ ตามลำต้น — ไซเปรสชี้ขึ้น / สปรูซห้อยลงตามชั้น
  const step = H * (cone ? 1 / tiers : 0.07)
  let side = 1
  for (let y = y0 + step * 0.6; y < H * 0.92; y += step) {
    const w = width(cone ? y - step * 0.45 : y) * 0.85
    for (const s of cone ? [1, -1] : [side]) {
      const end: Vec3 = cone ? [s * w, y - step * 0.55, 0] : [s * w * 0.8, y + H * 0.06, 0]
      branches.push(seg([0, y, 0], end, r0 * 0.3, 0.02, 1))
    }
    side = -side
  }

  // ก้อนพุ่มสีเข้มเติมทรง (ตัวพุ่มทึบแน่นแบบสน) — ใบเข็มทับด้านบน
  const clumpStep = H * 0.045
  for (let y = y0 + clumpStep; y < H * 0.95; y += clumpStep) {
    const w = width(y)
    // ก้อนอยู่ลึกในทรง (ขอบก้อนไม่เกิน 75% ของความกว้าง) — ใบเข็มคลุมขอบ ไม่เห็นเป็นลอนกลมๆ
    const r = Math.min(w * 0.42, clumpStep * 2)
    if (r < leafLength * 0.4) continue
    const span = Math.max(0, w * 0.75 - r)
    const n = Math.max(1, Math.round((2 * span) / r) + 1)
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -span + (i / (n - 1)) * 2 * span
      clumps.push({ position: [x, y, 0], radius: r, color: shade(sp.leafColors[0], -0.06 + (rand() - 0.5) * 0.04) })
    }
  }

  // ใบเข็มเต็มทรง: ไซเปรสชี้ขึ้น-ออกนิดๆ / สปรูซชี้ออก-ลงตามกิ่ง
  const count = Math.round((compact ? 0.6 : 1) * (300 + level * (cone ? 230 : 130)))
  for (let i = 0; i < count; i++) {
    const y = y0 + Math.pow(rand(), 1.15) * (H - y0)
    const w = width(y)
    const x = (rand() < 0.5 ? -1 : 1) * Math.sqrt(rand()) * w // หนาแน่นค่อนไปทางขอบ คลุมก้อนพุ่มด้านใน
    const out = w > 0 ? Math.abs(x) / w : 0
    const sx = Math.sign(x) || 1
    const dir = cone ? angleOf(sx * (0.5 + out * 0.6), 0.35 - out * 0.7) : angleOf(sx * out * 0.45, 1)
    leaves.push({
      position: [x, y, (rand() - 0.5) * w],
      length: leafLength * (0.8 + rand() * 0.4),
      angle: dir + (rand() - 0.5) * 0.5,
      widthScale: widthOf(),
      color: leafColor(sp, rand, 0.5 - x / (2 * Wb) + (y / H - 0.5) * 0.3),
    })
    if (out > 0.7) flutterable.push(leaves.length - 1)
  }
  // ยอดแหลม
  for (const off of [-0.3, 0, 0.3]) {
    leaves.push({ position: [0, H * 0.96, 0.1], length: leafLength * 1.2, angle: off, widthScale: widthOf(), color: leafColor(sp, rand, 0.8) })
  }

  return {
    branches, leaves, clumps, fruits: [], flutterable,
    crown: { cx: 0, cy: (y0 + H) / 2, rx: Wb * 1.05, ry: ((H - y0) / 2) * 1.05 },
  }
}

/* ── ปาล์ม: ลำต้นเดี่ยวโค้งมีข้อวงแหวน + ทางใบแผ่รอบยอด (ใบย่อยเรียงสองข้างก้านทาง) ── */
function palm(inp: FormInput): FormOutput {
  const { species: sp, level, rand, leafLength, widthOf, compact } = inp
  const g = (level - 1) / 7
  const H = FULL_HEIGHT * (0.3 + 0.7 * g)
  const lean = (rand() < 0.5 ? -1 : 1) * H * 0.1
  const branches: BranchSegment[] = []
  const leaves: TreeLeaf[] = []
  const fruits: TreeFruit[] = []
  const flutterable: number[] = []

  const trunkAt = (t: number): Vec3 => [lean * t * t, H * t, 0]
  const r0 = 0.3 * (0.5 + 0.5 * g), r1 = r0 * 0.7
  const N = 5
  for (let i = 0; i < N; i++) {
    const a = trunkAt(i / N), b = trunkAt((i + 1) / N)
    branches.push(seg(a, b, r0 + (r1 - r0) * (i / N), r0 + (r1 - r0) * ((i + 1) / N), 0))
  }
  const top = trunkAt(1)

  // ทางใบ: จำนวนเพิ่มตามอายุ แผ่รอบยอด (ด้านข้างมากกว่าด้านบน) โค้งลงตามน้ำหนัก
  const fronds = Math.min(compact ? 10 : 13, 4 + level)
  const frondLen = Math.max(2.2, H * 0.34)
  for (let f = 0; f < fronds; f++) {
    const u = fronds === 1 ? 0.5 : f / (fronds - 1)
    const theta = (u - 0.5) * Math.PI * 1.55 + (rand() - 0.5) * 0.2 // มุมจากแนวตั้ง
    const L = frondLen * (0.8 + rand() * 0.35)
    const droop = 0.22 + 0.32 * Math.abs(Math.sin(theta))
    const z = (rand() - 0.5) * 0.8
    const P = (s: number): Vec3 => [
      top[0] + Math.sin(theta) * s * L,
      top[1] + Math.cos(theta) * s * L * 0.85 - droop * s * s * L,
      z * s,
    ]
    const K = 4
    for (let k = 0; k < K; k++) branches.push(seg(P(k / K), P((k + 1) / K), 0.05 * (1 - k / K) + 0.015, 0.015, 1))
    // ใบย่อยสองข้างก้านทาง ยาวช่วงกลาง สั้นที่ปลาย
    for (let s = 0.12; s <= 1; s += 0.055) {
      const p = P(s), q = P(Math.min(1, s + 0.02))
      const dir = angleOf(q[0] - p[0], q[1] - p[1])
      const len = leafLength * (1.5 - 0.9 * s) * (0.9 + rand() * 0.2)
      for (const side of [1, -1]) {
        leaves.push({
          position: p,
          length: len,
          angle: dir + side * (0.95 + s * 0.35), // ใบย่อยกางออกจากก้านทาง ปลายทางแคบลง
          widthScale: widthOf(),
          color: leafColor(sp, rand, 0.6 - Math.sin(theta) * 0.2),
        })
        if (s > 0.45) flutterable.push(leaves.length - 1)
      }
    }
  }
  // มะพร้าวใต้ยอด (ต้นโตแล้ว)
  if (level >= 4 && sp.fruit) {
    const n = 2 + Math.round(sp.fruit.amount * 6)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      fruits.push({ position: [top[0] + Math.cos(a) * 0.28, top[1] - 0.25 - rand() * 0.2, Math.sin(a) * 0.2 + 0.2], radius: 0.2 * (sp.fruit.size ?? 1), color: sp.fruit.color })
    }
  }
  return {
    branches, leaves, clumps: [], fruits, flutterable,
    crown: { cx: top[0], cy: top[1] - frondLen * 0.1, rx: frondLen * 1.05, ry: frondLen * 0.6 },
  }
}

/* ── ไผ่: หลายลำ มีข้อ ใบเรียวยาวห้อยเป็นกลุ่มจากกิ่งแขนงตามข้อช่วงบน — ยืดหยุ่น โตเร็ว ── */
function bamboo(inp: FormInput): FormOutput {
  const { species: sp, level, rand, leafLength, widthOf } = inp
  const g = (level - 1) / 7
  const H = FULL_HEIGHT * (0.4 + 0.6 * g)
  const branches: BranchSegment[] = []
  const leaves: TreeLeaf[] = []
  const flutterable: number[] = []
  const culms = Math.min(9, 1 + Math.floor(level * 1.1))
  const r = 0.1 * (0.6 + 0.4 * g)
  let minX = 0, maxX = 0
  for (let c = 0; c < culms; c++) {
    const x0 = (c - (culms - 1) / 2) * 0.42 + (rand() - 0.5) * 0.15
    const h = H * (c === Math.floor(culms / 2) ? 1 : 0.62 + rand() * 0.34)
    const lean = x0 * 0.18 + (rand() - 0.5) * 0.3
    const at = (t: number): Vec3 => [x0 + lean * t * t * h * 0.1, h * t, (rand() - 0.5) * 0.02]
    const nodes = Math.max(4, Math.round(h / 0.9))
    for (let i = 0; i < nodes; i++) {
      const a = at(i / nodes), b = at((i + 1) / nodes)
      branches.push(seg(a, b, r * (1 - 0.3 * (i / nodes)), r * (1 - 0.3 * ((i + 1) / nodes)), 0))
      const t = (i + 1) / nodes
      if (t < 0.45) continue
      // กิ่งแขนงที่ข้อ ชี้ออก-ขึ้น แล้วกลุ่มใบห้อยลงออกนอกลำ
      const s = (i % 2 === 0 ? 1 : -1) * (x0 >= 0 ? 1 : -1)
      const twigLen = 0.5 + rand() * 0.5
      const end: Vec3 = [b[0] + s * twigLen, b[1] + twigLen * 0.35, 0.05]
      branches.push(seg(b, end, 0.025, 0.012, 1))
      const n = 4 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        leaves.push({
          position: pointOnBranch(branches[branches.length - 1], 0.55 + (k / n) * 0.45),
          length: leafLength * (0.85 + rand() * 0.35),
          angle: angleOf(s * (0.7 + rand() * 0.5), -0.25 + rand() * 0.7),
          widthScale: widthOf(),
          color: leafColor(sp, rand, s < 0 ? 0.7 : 0.4),
        })
        flutterable.push(leaves.length - 1)
      }
      minX = Math.min(minX, end[0] - leafLength); maxX = Math.max(maxX, end[0] + leafLength)
    }
    // ยอดลำ: ใบอ่อนตั้งขึ้น
    const tip = at(1)
    for (const off of [-0.4, 0.1, 0.5]) {
      leaves.push({ position: tip, length: leafLength * 0.9, angle: off, widthScale: widthOf(), color: leafColor(sp, rand, 0.8) })
      flutterable.push(leaves.length - 1)
    }
  }
  return {
    branches, leaves, clumps: [], fruits: [], flutterable,
    crown: { cx: (minX + maxX) / 2, cy: H * 0.72, rx: Math.max(1, (maxX - minX) / 2), ry: H * 0.32 },
  }
}

export function buildSpecialForm(form: 'column' | 'cone' | 'palm' | 'bamboo', inp: FormInput): FormOutput {
  if (form === 'palm') return palm(inp)
  if (form === 'bamboo') return bamboo(inp)
  return columnOrCone(inp, form === 'cone')
}

/**
 * หลิว: เส้นกิ่งห้อยพริ้วจากปลายกิ่งชั้นนอก ใบเรียวเล็กเรียงสองข้างเส้น — ยาวขึ้นตามอายุ
 * คืน index ใบที่เพิ่ม (ใบบนเส้นห้อยไหวตามลมได้ทั้งหมด)
 */
export function weepingStrands(
  branches: BranchSegment[], leaves: TreeLeaf[], tips: BranchSegment[], inp: FormInput, groundY: number,
): number[] {
  const { species: sp, level, rand, leafLength, widthOf, compact } = inp
  const g = (level - 1) / 7
  const added: number[] = []
  // ม่านกิ่งห้อยหนาแน่นรอบพุ่ม: หลายเส้นต่อกิ่ง เริ่มจากช่วงปลายกิ่ง (ไม่ใช่เฉพาะปลายสุด) ยาวเกือบถึงพื้น
  const maxStrands = compact ? 36 : 75
  const starts: { p: Vec3; depth: number }[] = []
  for (const b of tips) for (let k = 0; k < 3; k++) starts.push({ p: pointOnBranch(b, 0.5 + rand() * 0.5), depth: b.depth })
  const picks = starts.sort(() => rand() - 0.5).slice(0, maxStrands)
  for (const tip of picks) {
    const start = tip.p
    const room = start[1] - groundY
    if (room < 0.8) continue
    const len = room * (0.6 + 0.35 * rand()) * (0.6 + 0.4 * g)
    const drift = Math.sign(start[0] || 1) * len * 0.12
    const P = (s: number): Vec3 => [start[0] + drift * s * s, start[1] - len * s, start[2] + 0.05]
    const K = 3
    const base = branches.length
    for (let k = 0; k < K; k++) branches.push(seg(P(k / K), P((k + 1) / K), 0.016, 0.012, tip.depth))
    let side = 1
    for (let s = 0.04; s <= 1; s += 0.055) {
      const p = pointOnBranch(branches[base + Math.min(K - 1, Math.floor(s * K))], (s * K) % 1)
      leaves.push({
        position: p,
        length: leafLength * (0.7 + rand() * 0.3),
        angle: Math.PI + side * (0.35 + rand() * 0.25), // ชี้ลง เอียงออกข้างเล็กน้อย
        widthScale: widthOf(),
        color: leafColor(sp, rand, 0.55 - s * 0.2),
      })
      added.push(leaves.length - 1)
      side = -side
    }
  }
  return added
}

/** ไทร: รากอากาศห้อยจากกิ่งใหญ่ลงถึงดิน เพิ่มจำนวน/ความหนาตามอายุ */
export function aerialRoots(branches: BranchSegment[], inp: FormInput): BranchSegment[] {
  const { level, rand } = inp
  const g = (level - 1) / 7
  const hosts = branches.filter((b) => b.depth >= 1 && b.depth <= 2 && Math.abs(b.end[0] - b.start[0]) > 0.4)
  const n = Math.min(hosts.length * 3, Math.max(0, 4 + (level - 3) * 3))
  const roots: BranchSegment[] = []
  for (let i = 0; i < n && hosts.length; i++) {
    const h = hosts[Math.floor(rand() * hosts.length)]
    const p = pointOnBranch(h, 0.35 + rand() * 0.6)
    const r = 0.035 + 0.075 * g * (0.6 + rand() * 0.4)
    const wob = (rand() - 0.5) * 0.25
    const mid: Vec3 = [p[0] + wob, p[1] * 0.5, p[2]]
    roots.push(seg(p, mid, r * 0.7, r, 3, wob * 0.5), seg(mid, [p[0] + wob * 0.3, 0, p[2]], r, r * 1.3, 3, -wob * 0.3))
  }
  return roots
}
