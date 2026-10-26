import { hashSeed, mulberry32 } from '../../../utils/seededRandom'
import { pointOnBranch, type BranchSegment, type Vec3 } from './generateTree'
import type { TreeClump, TreeLeaf } from './buildTreeModel'
import type { FormInput, FormOutput } from './speciesForms'

/*============================================================================*\
  speciesSkeleton — โครง "ลำต้น + การแตกกิ่ง" ของสายพันธุ์จากข้อมูล (SpeciesSpec) ไม่ใช่โค้ดวาดแยกรายต้น
  ────────────────────────────────────────────────────────────────────────────
  ขนาดทุกค่าเป็นสัดส่วนของ H (ความสูงทั้งต้น พื้น → ยอดพุ่ม) · seed เดิม = โครงเดิมเป๊ะ
  - ใบ/ดอก "ไม่" มาจากที่นี่: buildTreeModel วางใบเดิมของ MBTI นั้นตามกิ่งที่ได้ (ตามที่ผู้ใช้กำหนด —
    เอาแค่ลักษณะลำต้นและการแตกกิ่ง) ข้อมูล canopy ใช้กำหนดทรงพุ่ม (ความกว้าง/ขอบล่าง) ให้ใบวางตาม
  - การเติบโต: เลเวล → g (0-1) ด้วยเส้นโค้งอิ่มตัว 1 - e^(-(L-1)/k) → เลเวลสูงมากเต็มที่และนิ่ง ไม่โตไม่สิ้นสุด
    ต้นกล้า (g < 0.3): ลำต้นเล็ก กิ่ง 1-2 · กำลังโต: เริ่มแตกง่าม 2-3 ชั้น · โตเต็มที่: ครบตามสเปก
  - lod 'simple' (จอเล็ก/ต้นไกล): ตัดชั้นกิ่งเล็กสุดออก 1 ชั้น
  ใช้ผ่าน buildTreeModel({ ..., skeleton }) — ยังไม่ผูกกับ MBTI ไหน (รออนุมัติจากหน้า /dev/species-sheet)
\*============================================================================*/

type Range = [number, number]

export interface SpeciesSpec {
  id: string
  /** ชื่อแสดงในหน้าตัวอย่าง */
  name: string
  trunk: {
    /** ความสูงลำต้นที่เห็น (ถึงจุดแตกง่าม) */
    heightH: Range
    /** ความกว้างโคนลำต้น (เหนือรากค้ำ) */
    baseWidthH: number
    /** ความกว้างรวมของรากค้ำที่แผ่บนพื้น (ไม่มี = ไม่มีรากค้ำ) */
    flareWidthH?: number
    /** ความกว้างที่จุดแตกง่าม ÷ ความกว้างโคน */
    taperToForkH: number
    barkStyle: 'lenticel' | 'ridged' | 'segmented'
  }
  limbs: {
    /** ความสูงที่แตกง่าม */
    forkAtH: Range
    /** จำนวนกิ่งหลัก */
    count: Range
    /** มุมกางจากแนวตั้ง (องศา) */
    spreadDeg: Range
    /** จำนวนชั้นการแตกกิ่งหลังกิ่งหลัก */
    levels: number
    /** ความยาวกิ่งลูก ÷ กิ่งแม่ */
    lengthFalloff: number
    /** ความโค้งกิ่ง (สัดส่วนความยาว) */
    curve: number
    /** สัดส่วนกิ่งปลายที่ห้อยลง */
    droop?: number
    /** ความคดเล็กๆ ของกิ่งปลาย */
    wave?: number
  }
  canopy: {
    shape: 'dome' | 'clump' | 'none'
    widthH: Range
    /** ขอบล่างของพุ่ม */
    bottomAtH: number
    edge: 'ragged' | 'smooth'
    /** หน่วยใบในสเปกต้นฉบับ — ไม่ใช้วาด (ใบเป็นของ MBTI เดิม) เก็บไว้อ้างอิง */
    unit: 'blossom' | 'heart' | 'leafFan'
    seeThroughLowerBranches: boolean
  }
  /** ไผ่: กอลำ (canopy.shape = 'none') */
  culms?: {
    count: Range
    nodeEveryH: Range
    baseWidthH: number
    topWidthH: number
    /** เอนออกด้านนอกที่ยอด ± องศา */
    leanDeg: number
    heightH: Range
    /** ช่วงบนของลำที่มีพัดใบ (สัดส่วนจากยอดลงมา) ตอนโตเต็มที่ */
    fanZone: number
    /** จำนวนใบต่อพัด */
    fanLeaves: Range
  }
  palette: { trunk: string; rim?: string; mound?: string }
  ground: { mound: boolean; rootRidges?: number }
  /** k ของเส้นโค้งการเติบโต (เลเวลที่โตได้ ~63%) */
  growthK: number
}

/** ความสูงต้นโตเต็มที่ (หน่วยต้นไม้) — เท่าต้นไม้แบบอื่นในระบบ */
export const SKELETON_FULL_HEIGHT = 10

/** เลเวล (ไม่จำกัด) → ความโต 0-1 แบบอิ่มตัว */
export function growthOf(level: number, k: number): number {
  return Math.max(0, Math.min(1, 1 - Math.exp(-Math.max(0, level - 1) / k)))
}

export type GrowthStage = 'sapling' | 'growing' | 'mature'
export function stageOf(g: number): GrowthStage {
  return g < 0.3 ? 'sapling' : g < 0.75 ? 'growing' : 'mature'
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const pick = (r: Range, rnd: () => number) => lerp(r[0], r[1], rnd())
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
const DEG = Math.PI / 180

const seg = (start: Vec3, end: Vec3, r0: number, r1: number, depth: number, bend: Vec3 = [0, 0, 0]): BranchSegment => ({
  start, end, radiusStart: r0, radiusEnd: r1, depth,
  mid: [(start[0] + end[0]) / 2 + bend[0], (start[1] + end[1]) / 2 + bend[1], (start[2] + end[2]) / 2 + bend[2]],
})

export interface Skeleton {
  branches: BranchSegment[]
  /** กิ่งที่ใบผลิ (2-3 ชั้นนอกสุด) */
  twigs: BranchSegment[]
  maxDepth: number
  height: number
  /** วงรีทรงพุ่มตามสเปก (ความกว้าง/ขอบล่าง/ยอด) */
  crown: { cx: number; cy: number; rx: number; ry: number }
  mound?: { rx: number; ry: number; color: string }
  growth: number
}

/** ต้นแตกกิ่ง (ซากุระ / ต้นใบหัวใจ): ลำต้น → แตกง่าม → กิ่งหลัก n กิ่งทรงแจกัน → แตกต่ออีก levels ชั้น */
export function buildSkeleton(spec: SpeciesSpec, seedKey: string, level: number, lod: 'full' | 'simple' = 'full'): Skeleton {
  const rnd = mulberry32(hashSeed(`skel-${spec.id}-${seedKey}`))
  const g = growthOf(level, spec.growthK)
  const H = SKELETON_FULL_HEIGHT * (0.35 + 0.65 * g)
  const forkY = H * pick(spec.limbs.forkAtH, rnd) * (spec.trunk.flareWidthH ? 1 : lerp(0.85, 1, g))
  const baseR = (spec.trunk.baseWidthH * H) / 2 * lerp(0.55, 1, g)
  const forkR = baseR * spec.trunk.taperToForkH
  const branches: BranchSegment[] = []

  // ลำต้น 1 ท่อน (หน้าต้นไม้วาดบนท่อนนี้) เอนเล็กน้อย
  // ต้นที่มีรากค้ำ: เริ่มเหนือพื้นนิดเดียว → ตัววาดไม่บานโคนอัตโนมัติ ให้รากค้ำเป็นตัวแผ่โคนแทน (เห็นเป็นรากแยกกัน)
  const lean = (rnd() - 0.5) * H * 0.03
  const fork: Vec3 = [lean, forkY, 0]
  const hasButtress = !!(spec.trunk.flareWidthH && spec.ground.rootRidges)
  branches.push(seg([0, hasButtress ? H * 0.002 + 0.011 : 0, 0], fork, baseR, forkR, 0, [lean * 0.4 + (rnd() - 0.5) * baseR * 0.3, 0, 0]))

  // รากค้ำแผ่บนพื้น (ต้นใบหัวใจ)
  if (hasButtress) {
    // รากค้ำ: แผ่ออกรอบโคนเป็นพัด (ซ้าย-ขวา-หน้า) ปลายเรียวแตะพื้น วาดหน้าลำต้น (z บวก) ให้เห็นทุกราก
    const n = spec.ground.rootRidges!
    const half = (spec.trunk.flareWidthH! * H) / 2 * lerp(0.6, 1, g)
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1)
      const side = (u - 0.5) * 2 // -1 … 1
      const reach = half * (0.55 + 0.45 * Math.abs(side)) * (0.9 + rnd() * 0.18)
      const end: Vec3 = [side * reach, 0, 0.15 + (1 - Math.abs(side)) * half * 0.4]
      const start: Vec3 = [lean * 0.05 + side * baseR * 0.45, H * (0.07 + rnd() * 0.03), 0.12]
      branches.push(seg(start, end, baseR * 0.5, baseR * 0.07, 0, [side * reach * 0.12, -H * 0.02, 0]))
    }
  }

  // กิ่งหลัก: ต้นกล้า 1-2 กิ่ง → ครบตามสเปก
  const fullCount = Math.round(pick(spec.limbs.count, rnd))
  const count = Math.max(1, Math.round(lerp(Math.min(2, fullCount), fullCount, smooth((g - 0.15) / 0.55))))
  const levels = Math.max(0, Math.round(spec.limbs.levels * smooth((g - 0.1) / 0.6)) - (lod === 'simple' ? 1 : 0))
  const limbLen = (H - forkY) * 0.55
  const limbs: BranchSegment[] = []
  const grow = (start: Vec3, ang: number, zDir: number, len: number, r: number, depth: number) => {
    const end: Vec3 = [start[0] + Math.sin(ang) * len, start[1] + Math.cos(ang) * len, start[2] + zDir * len * 0.35]
    // โค้งออกด้านนอก-ขึ้นแบบแจกัน + คดเล็กๆ ที่กิ่งปลาย
    const outward = Math.sign(ang || 1)
    const wave = (spec.limbs.wave ?? 0) * (depth >= 3 ? 1 : 0.3) * (rnd() - 0.5) * len
    // กลางกิ่งดันออกด้านนอกและต่ำลงนิด → กิ่งโค้งขึ้นแบบแจกัน
    const bend: Vec3 = [Math.cos(ang) * outward * len * spec.limbs.curve * 0.5 + wave, -Math.abs(Math.sin(ang)) * len * spec.limbs.curve * 0.3, 0]
    const rEnd = r * 0.68
    const b = seg(start, end, r, rEnd, depth, bend)
    limbs.push(b)
    if (depth >= levels + 1) return
    const kids = rnd() < 0.3 ? 3 : 2
    for (let k = 0; k < kids; k++) {
      const spread = (18 + rnd() * 16) * DEG
      // กิ่งลูกโน้มกลับเข้าแนวตั้ง (×0.72) → กลางพุ่มไม่โหว่ แม้กิ่งหลักกางทรงแจกันกว้าง
      let a = ang * 0.72 + (k - (kids - 1) / 2) * spread * 1.25 + (rnd() - 0.5) * 10 * DEG
      // กิ่งหลักแตกกิ่งรอง 1 กิ่งชี้เกือบตรงขึ้นเข้าหากลางพุ่ม (แบบซากุระจริง) → ยอดกลางเต็ม ไม่แยกเป็น 2 ก้อน
      if (depth === 1 && k === kids - 1) a = ang * 0.15 + (rnd() - 0.5) * 8 * DEG
      // กิ่งปลายบางส่วนห้อยลง
      if (depth + 1 === levels + 1 && rnd() < (spec.limbs.droop ?? 0)) a = Math.sign(a || 1) * (95 + rnd() * 35) * DEG
      const from = pointOnBranch(b, k === 0 ? 1 : 0.7 + rnd() * 0.3)
      grow(from, a, zDir + (rnd() - 0.5) * 0.6, len * spec.limbs.lengthFalloff * (0.88 + rnd() * 0.24), rEnd * (0.82 + rnd() * 0.12), depth + 1)
    }
  }
  const [s0, s1] = spec.limbs.spreadDeg
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : i / (count - 1)
    const side = u - 0.5
    const mag = count === 1 ? (rnd() - 0.5) * s0 : lerp(s0, s1, Math.abs(side) * 2) * Math.sign(side || (rnd() - 0.5))
    const a = (Math.abs(side) < 0.1 && count % 2 === 1 ? (rnd() - 0.5) * s0 * 0.5 : mag) * DEG
    grow(fork, a + (rnd() - 0.5) * 8 * DEG, (rnd() - 0.5) * 0.8, limbLen * (0.9 + rnd() * 0.2), forkR * 0.78, 1)
  }

  // ปรับสัดส่วนกิ่งให้ปลายกิ่งเต็มทรงพุ่มตามสเปก (ยอด ~0.92H · กว้าง ~0.88 ของความกว้างพุ่ม)
  const width = H * pick(spec.canopy.widthH, rnd)
  let top = forkY, halfW = 0.01
  for (const b of limbs) { top = Math.max(top, b.end[1]); halfW = Math.max(halfW, Math.abs(b.end[0] - fork[0])) }
  const sy = (H * 0.92 - forkY) / Math.max(0.01, top - forkY)
  const sx = (width / 2) * 0.88 / halfW
  const fit = (p: Vec3): Vec3 => (p[1] < forkY - 1e-6 ? p : [fork[0] + (p[0] - fork[0]) * sx, forkY + (p[1] - forkY) * sy, p[2] * sx])
  for (const b of limbs) branches.push({ ...b, start: fit(b.start), mid: fit(b.mid), end: fit(b.end) })

  const maxDepth = Math.max(0, ...branches.map((b) => b.depth))
  const twigs = branches.filter((b) => b.depth >= Math.max(1, maxDepth - 2))
  const bottom = H * spec.canopy.bottomAtH
  const crown = { cx: fork[0], cy: (bottom + H) / 2, rx: width / 2, ry: (H - bottom) / 2 }
  const mound = spec.ground.mound ? { rx: (spec.trunk.flareWidthH ?? spec.trunk.baseWidthH * 3) * H * 0.62, ry: H * 0.035, color: spec.palette.mound ?? '#3d2a2e' } : undefined
  return { branches, twigs: twigs.length ? twigs : branches, maxDepth, height: H, crown, growth: H / SKELETON_FULL_HEIGHT, ...(mound ? { mound } : {}) }
}

/** มุมปลายใบบนจอจากทิศ (dx, dy) — 0 = ชี้ขึ้น หมุนตามเข็มนาฬิกา */
const angleOf = (dx: number, dy: number) => Math.atan2(dx, dy)

/** ไผ่: กอลำชิดกันที่โคน เอนออกที่ยอด มีข้อปล้อง · พัดใบ (ใบเดิมของ MBTI) ที่ข้อช่วงบน บนกิ่งแขนงสั้น */
export function buildCulmClump(spec: SpeciesSpec, inp: FormInput, seedKey: string, level: number): FormOutput & { growth: number } {
  const C = spec.culms!
  const rnd = mulberry32(hashSeed(`culm-${spec.id}-${seedKey}`))
  const g = growthOf(level, spec.growthK)
  const H = SKELETON_FULL_HEIGHT * (0.35 + 0.65 * g)
  const branches: BranchSegment[] = []
  const leaves: TreeLeaf[] = []
  const clumps: TreeClump[] = []
  const flutterable: number[] = []
  const stage = stageOf(g)
  const full = Math.round(pick(C.count, rnd))
  const n = stage === 'sapling' ? 2 : stage === 'growing' ? Math.min(full, 4 + (rnd() < 0.5 ? 1 : 0)) : full
  const zone = stage === 'sapling' ? 0.18 : stage === 'growing' ? 1 / 3 : C.fanZone
  let fansLeft = stage === 'sapling' ? 1 + (rnd() < 0.5 ? 1 : 0) : Infinity
  const rBase = (C.baseWidthH * H) / 2 * lerp(0.6, 1, g), rTop = (C.topWidthH * H) / 2 * lerp(0.6, 1, g)
  let minX = 0, maxX = 0, maxY = 0
  // ลำกลางสูงก่อน (ลำหลัง) → ลำข้างทีหลัง
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2))
  for (const c of order) {
    const u = n === 1 ? 0 : (c - (n - 1) / 2) / ((n - 1) / 2)
    const x0 = u * rBase * 2.2 * (n / 4) + (rnd() - 0.5) * rBase * 0.6
    const h = H * pick(C.heightH, rnd) * (Math.abs(u) < 0.35 ? 1 : 0.9)
    const lean = (u * C.leanDeg + (rnd() - 0.5) * 4) * DEG
    const z = (rnd() - 0.5) * 0.3
    const at = (t: number): Vec3 => [x0 + Math.sin(lean) * h * Math.pow(t, 1.5), h * t, z]
    const step = H * pick(C.nodeEveryH, rnd)
    const nodes = Math.max(3, Math.round(h / step))
    let side = rnd() < 0.5 ? 1 : -1
    for (let i = 0; i < nodes; i++) {
      const t0 = i / nodes, t1 = (i + 1) / nodes
      branches.push(seg(at(t0), at(t1), lerp(rBase, rTop, t0), lerp(rBase, rTop, t1), 0))
      // พัดใบที่ข้อช่วงบน: กิ่งแขนงสั้นชี้ออก-ขึ้น แล้วใบ 3-5 ใบกางเป็นพัด โค้งออกแล้วห้อยลง
      if (t1 < 1 - zone || t1 >= 0.999 || fansLeft <= 0) continue
      fansLeft--
      const node = at(t1)
      const out = Math.sign(u || side) * (Math.abs(u) < 0.3 ? side : 1)
      const shoot: Vec3 = [node[0] + out * H * 0.05, node[1] + H * 0.025, z + 0.02]
      branches.push(seg(node, shoot, rTop * 0.3, rTop * 0.18, 1))
      const k = Math.round(pick(C.fanLeaves, rnd))
      for (let j = 0; j < k; j++) {
        const f = k === 1 ? 0.5 : j / (k - 1)
        leaves.push({
          position: shoot,
          length: inp.leafLength * (1.05 + rnd() * 0.35),
          angle: angleOf(out * (0.75 + rnd() * 0.25), 0.55 - f * 1.05),
          widthScale: inp.widthOf(),
          color: inp.species.leafColors[Math.floor(rnd() * inp.species.leafColors.length)],
        })
        flutterable.push(leaves.length - 1)
      }
      minX = Math.min(minX, shoot[0] - inp.leafLength * 1.4); maxX = Math.max(maxX, shoot[0] + inp.leafLength * 1.4)
      side = -side
    }
    maxY = Math.max(maxY, h)
    minX = Math.min(minX, at(1)[0] - rTop); maxX = Math.max(maxX, at(1)[0] + rTop)
  }
  return {
    branches, leaves, clumps, fruits: [], flutterable, growth: H / SKELETON_FULL_HEIGHT,
    crown: { cx: (minX + maxX) / 2, cy: maxY * 0.72, rx: Math.max(1, (maxX - minX) / 2), ry: maxY * 0.3 },
  }
}

/* ── สามสายพันธุ์ตามสเปก (ภาพอ้างอิงยังไม่ได้แนบ — ใช้ตัวเลขในสเปกเป็นหลัก) ── */

export const CHERRY_SKELETON: SpeciesSpec = {
  id: 'cherry', name: 'ซากุระ (โครงใหม่)',
  trunk: { heightH: [0.14, 0.2], baseWidthH: 0.07, taperToForkH: 0.55, barkStyle: 'lenticel' },
  limbs: { forkAtH: [0.15, 0.22], count: [3, 5], spreadDeg: [30, 60], levels: 3, lengthFalloff: 0.7, curve: 0.18, droop: 0.22, wave: 0.18 },
  canopy: { shape: 'dome', widthH: [1.15, 1.25], bottomAtH: 0.24, edge: 'ragged', unit: 'blossom', seeThroughLowerBranches: true },
  palette: { trunk: '#5e4b45' },
  ground: { mound: false },
  growthK: 24,
}

export const HEART_SKELETON: SpeciesSpec = {
  id: 'heart', name: 'ต้นใบหัวใจ (โครงใหม่)',
  trunk: { heightH: [0.4, 0.45], baseWidthH: 0.16, flareWidthH: 0.3, taperToForkH: 0.62, barkStyle: 'ridged' },
  limbs: { forkAtH: [0.45, 0.5], count: [3, 4], spreadDeg: [22, 55], levels: 3, lengthFalloff: 0.72, curve: 0.14, wave: 0.08 },
  canopy: { shape: 'dome', widthH: [0.95, 1.05], bottomAtH: 0.42, edge: 'ragged', unit: 'heart', seeThroughLowerBranches: true },
  palette: { trunk: '#5a3a4a', rim: '#f4a6c4', mound: '#3b2a33' },
  ground: { mound: true, rootRidges: 6 },
  growthK: 26,
}

export const BAMBOO_SKELETON: SpeciesSpec = {
  id: 'bamboo', name: 'ไผ่ (โครงใหม่)',
  trunk: { heightH: [1, 1], baseWidthH: 0.05, taperToForkH: 0.7, barkStyle: 'segmented' },
  limbs: { forkAtH: [1, 1], count: [0, 0], spreadDeg: [0, 0], levels: 0, lengthFalloff: 0, curve: 0 },
  canopy: { shape: 'none', widthH: [0.6, 0.8], bottomAtH: 0.5, edge: 'smooth', unit: 'leafFan', seeThroughLowerBranches: true },
  culms: { count: [6, 8], nodeEveryH: [0.1, 0.14], baseWidthH: 0.05, topWidthH: 0.035, leanDeg: 12, heightH: [0.82, 1], fanZone: 0.45, fanLeaves: [3, 5] },
  palette: { trunk: '#7fae4a' },
  ground: { mound: false },
  growthK: 20,
}

export const SKELETON_SPECS = [CHERRY_SKELETON, HEART_SKELETON, BAMBOO_SKELETON] as const
