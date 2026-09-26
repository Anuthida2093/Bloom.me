/*============================================================================*\
  generateTree — สร้างโครงกิ่งต้นไม้แบบ procedural (ตรรกะล้วน ไม่มีโค้ดเรนเดอร์)
  ────────────────────────────────────────────────────────────────────────────
  ให้ seed + พารามิเตอร์ → คืนรายการกิ่ง (จุดเริ่ม/จุดโค้ง/จุดปลาย/รัศมี/ความลึก) และจุดยึดพุ่มใบ
  ที่ปลายกิ่ง — ไม่ import three.js เลย จึงทดสอบ/ปรับจูนอัลกอริทึมแยกจากฉาก 3D ได้
  ผู้ใช้: หน้า Home (buildTreeModel.ts → วาด 2D) และหน้าทดลอง 3D (src/experiments/procedural-tree/)

  อัลกอริทึม: แตกกิ่งแบบ recursive — แต่ละกิ่งแตกเป็น "กิ่งนำ" 1 กิ่ง (หักมุมน้อย ยาวเกือบเท่าเดิม
  ทำให้ลำต้นพุ่งขึ้นต่อเนื่อง) + "กิ่งข้าง" อีก 1-3 กิ่ง (หักมุมมากกว่า กระจายรอบแกนด้วยมุมทองคำ
  ไม่ให้ทุกกิ่งชี้ไปทางเดียวกัน) ทุกทิศถูกดึงขึ้นฟ้าเล็กน้อย (upwardBias) และมีจุดโค้งกลางกิ่ง
  (gnarl) ให้ดูเป็นธรรมชาติแทนท่อนตรง
\*============================================================================*/

export type Vec3 = [number, number, number]

export interface TreeParams {
  /** seed ของตัวสุ่ม — seed เดิมได้ต้นไม้หน้าตาเดิมทุกครั้ง */
  seed: number
  /** ความยาวท่อนลำต้นท่อนแรก (หน่วยฉาก) */
  trunkHeight: number
  /** รัศมีโคนต้น */
  trunkRadius: number
  /** จำนวนชั้นการแตกกิ่งสูงสุด (0 = ลำต้น) */
  maxDepth: number
  /** จำนวนกิ่งข้างต่อข้อ [ต่ำสุด, สูงสุด] (ไม่นับกิ่งนำ) */
  lateralBranches: [number, number]
  /** อัตราความยาวกิ่งลูก ÷ กิ่งแม่ */
  lengthDecay: number
  /** อัตรารัศมีปลายกิ่ง ÷ โคนกิ่ง (ความเรียวในกิ่งเดียว) */
  taper: number
  /** มุมหักของกิ่งข้างจากกิ่งแม่ (องศา) */
  branchAngle: number
  /** ความสุ่มของมุม ± (องศา) */
  angleJitter: number
  /** แรงดึงทิศกิ่งขึ้นฟ้า 0-1 */
  upwardBias: number
  /** ความคดงอกลางกิ่ง (สัดส่วนของความยาวกิ่ง) */
  gnarl: number
  /** เริ่มมีพุ่มใบตั้งแต่กิ่งชั้นนี้ขึ้นไป */
  leafFromDepth: number
}

export const DEFAULT_TREE_PARAMS: TreeParams = {
  seed: 7,
  trunkHeight: 3.2,
  trunkRadius: 0.38,
  maxDepth: 6,
  lateralBranches: [1, 3],
  lengthDecay: 0.8,
  taper: 0.78,
  branchAngle: 50,
  angleJitter: 14,
  upwardBias: 0.12,
  gnarl: 0.12,
  leafFromDepth: 4,
}

export interface BranchSegment {
  start: Vec3
  /** จุดกลางที่เบี่ยงออกเล็กน้อย — ผู้เรนเดอร์ใช้ทำเส้นโค้ง (เช่น CatmullRom) ผ่าน start→mid→end */
  mid: Vec3
  end: Vec3
  radiusStart: number
  radiusEnd: number
  /** 0 = ลำต้น, เพิ่มขึ้นทีละชั้นการแตกกิ่ง */
  depth: number
}

export interface LeafAnchor {
  position: Vec3
  /** ทิศของกิ่งที่พุ่มใบนี้เกาะ (normalized) */
  direction: Vec3
  depth: number
  /** ขนาดพุ่มโดยประมาณ (ใหญ่ที่ปลายกิ่งเล็กสุด) */
  size: number
}

export interface GeneratedTree {
  branches: BranchSegment[]
  leafAnchors: LeafAnchor[]
}

/* ── ตัวสุ่มแบบ seed ได้ (mulberry32) — ไม่ใช้ Math.random เพื่อให้ผลซ้ำได้ ── */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── คณิตเวกเตอร์เล็กๆ (tuple ล้วน) ── */
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const normalize = (a: Vec3): Vec3 => {
  const l = length(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** หมุนเวกเตอร์ v รอบแกน axis (normalized) ด้วยมุม angle (เรเดียน) — สูตร Rodrigues */
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)))
}

/** เวกเตอร์ใดๆ ที่ตั้งฉากกับ v */
function perpendicular(v: Vec3): Vec3 {
  const helper: Vec3 = Math.abs(v[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  return normalize(cross(v, helper))
}

/** จุดบนกิ่งที่สัดส่วน t (0 = โคน, 1 = ปลาย) ตามเส้นโค้งกำลังสองที่ผ่าน start → mid → end
 *  (control point คำนวณให้เส้นผ่าน mid พอดี) — ใช้ร่วมกันทั้งตอนวาดกิ่งและตอนวางใบตามกิ่ง */
export function pointOnBranch(b: BranchSegment, t: number): Vec3 {
  const c: Vec3 = [2 * b.mid[0] - (b.start[0] + b.end[0]) / 2, 2 * b.mid[1] - (b.start[1] + b.end[1]) / 2, 2 * b.mid[2] - (b.start[2] + b.end[2]) / 2]
  const u = 1 - t
  return [
    u * u * b.start[0] + 2 * u * t * c[0] + t * t * b.end[0],
    u * u * b.start[1] + 2 * u * t * c[1] + t * t * b.end[1],
    u * u * b.start[2] + 2 * u * t * c[2] + t * t * b.end[2],
  ]
}

const UP: Vec3 = [0, 1, 0]
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const DEG = Math.PI / 180

export function generateTree(overrides: Partial<TreeParams> = {}): GeneratedTree {
  const p: TreeParams = { ...DEFAULT_TREE_PARAMS, ...overrides }
  const rand = createRng(p.seed)
  const range = (min: number, max: number) => min + (max - min) * rand()

  const branches: BranchSegment[] = []
  const leafAnchors: LeafAnchor[] = []
  let azimuth = rand() * Math.PI * 2 // มุมรอบแกน สะสมด้วยมุมทองคำให้กิ่งข้างกระจายรอบต้น

  /** เบนทิศ dir ออกไปมุม tilt (เรเดียน) ที่มุมรอบแกน spin */
  const deflect = (dir: Vec3, tilt: number, spin: number): Vec3 => {
    const side = rotate(perpendicular(dir), dir, spin)
    return normalize(rotate(dir, normalize(cross(dir, side)), tilt))
  }

  const grow = (start: Vec3, dir: Vec3, len: number, radius: number, depth: number) => {
    const end = add(start, scale(dir, len))
    // จุดโค้งกลางกิ่ง: เบี่ยงตั้งฉากกับทิศกิ่งแบบสุ่ม (ลำต้นคดน้อยกว่ากิ่งเล็ก)
    const bend = rotate(perpendicular(dir), dir, rand() * Math.PI * 2)
    const mid = add(lerp(start, end, 0.5), scale(bend, len * p.gnarl * range(0.3, 1) * (depth === 0 ? 0.5 : 1)))
    const radiusEnd = radius * p.taper
    branches.push({ start, mid, end, radiusStart: radius, radiusEnd, depth })

    if (depth >= p.leafFromDepth) {
      leafAnchors.push({
        position: end,
        direction: normalize(scale(add(end, scale(start, -1)), 1)),
        depth,
        size: len * range(0.9, 1.3),
      })
    }
    if (depth >= p.maxDepth) return

    // กิ่งนำเริ่มที่รัศมีปลายกิ่งแม่พอดี (ต่อกันเนียนไม่มีรอยขั้น) กิ่งข้างเล็กกว่านั้น
    const childRadius = radiusEnd

    // กิ่งนำ — ต่อแนวเดิมเกือบตรง ยาวใกล้เคียงเดิม (ทำให้ลำต้น/กิ่งหลักไม่ขาดตอน)
    const leaderDir = normalize(lerp(deflect(dir, range(4, 12) * DEG, rand() * Math.PI * 2), UP, p.upwardBias * 0.5))
    grow(end, leaderDir, len * p.lengthDecay * range(0.82, 0.95), childRadius, depth + 1)

    // กิ่งข้าง — หักมุมออกมากกว่า กระจายรอบแกนด้วยมุมทองคำ + สุ่ม
    const [minL, maxL] = p.lateralBranches
    const lateralCount = depth === 0 ? maxL : Math.floor(range(minL, maxL + 1))
    for (let i = 0; i < lateralCount; i++) {
      azimuth += GOLDEN_ANGLE + range(-0.3, 0.3)
      const tilt = (p.branchAngle + range(-p.angleJitter, p.angleJitter)) * DEG
      const lateralDir = normalize(lerp(deflect(dir, tilt, azimuth), UP, p.upwardBias))
      // ลำต้นช่วงล่างไม่แตกกิ่งข้าง — ให้เห็นลำต้นเปลือยก่อนถึงพุ่ม
      if (depth === 0 && i === 0) continue
      grow(end, lateralDir, len * p.lengthDecay * range(0.85, 1.05), childRadius * range(0.62, 0.78), depth + 1)
    }
  }

  grow([0, 0, 0], UP, p.trunkHeight, p.trunkRadius, 0)
  return { branches, leafAnchors }
}
