import { MBTI_TREE_THEME, type MbtiType } from '../../../types'
import { MBTI_SHAPE_MAP, getLeafDensityRange, toTrunkVisualLevel, type TreeShape } from '../../../config/treeAssets'
import { seededRandom } from '../../../utils/seededRandom'
import { generateTree, type BranchSegment, type TreeParams, type Vec3 } from './generateTree'

/*============================================================================*\
  buildTreeModel — แปลง "ความคืบหน้าของผู้เล่น" เป็นข้อมูลต้นไม้ที่พร้อมวาด (ตรรกะล้วน ไม่วาดเอง)
  ────────────────────────────────────────────────────────────────────────────
  - รูปทรง: ตามกลุ่ม MBTI (MBTI_SHAPE_MAP 1-4 ชุดเดียวกับระบบรูปภาพเดิม) + seed ผูกกับ MBTI
  - โตตามเลเวล: สร้าง "ต้นโตเต็มที่" ครั้งเดียว (seed เดิมเสมอ) แล้วแสดงเฉพาะกิ่งถึงชั้นที่เลเวลอนุญาต
    → เลเวลขึ้น ต้นเดิมแตกกิ่ง/ใบเพิ่ม ไม่ใช่กลายเป็นต้นใหม่หน้าตาต่างไปทุกเลเวล
  - ใบ: เกมเลเวล ≤20 (getLeafDensityRange ยังคืน null) มี "ใบอ่อน" ประปราย เล็ก สีอ่อนอมเหลือง
    เพิ่มขึ้นทีละนิดตามเลเวล → เลเวล 21+ ใบเต็มตามความหนาแน่นเดิม ทุกใบหันออกนอกพุ่ม+หาแสง
  - สี: MBTI_TREE_THEME (ลำต้น/ใบ/ดอก ชุดเดียวกับที่เคยใช้) — ดอกผูกกับ leafFlowerLevel (หมวดจิตใจ)
  พิกัดเป็นหน่วยของต้นไม้ (y ขึ้นฟ้า, z เข้าหากล้อง) ผู้วาดแปลงเป็นพิกเซลเอง (drawTree2D.ts)
\*============================================================================*/

/** ทิศแสง (ซ้ายบน ค่อนมาทางกล้อง) — normalized */
export const SUN_DIR: Vec3 = normalize([-0.45, 0.8, 0.4])

const FULL_DEPTH = 6

/** ชั้นกิ่งสูงสุดที่แสดง ตาม trunk visual level 1-8 (lv1 ต้นกล้า → lv8 ต้นโตเต็มที่) */
const DEPTH_BY_VISUAL_LEVEL = [2, 3, 3, 4, 4, 5, 5, 6]

/** รูปทรงต่อกลุ่ม MBTI — NT ตั้งตรงสูงโปร่ง, NF แผ่กิ่งอ่อนช้อย, SJ ทรงโดมกลม, SP กว้างแผ่ออก */
const SHAPE_PARAMS: Record<TreeShape, Partial<TreeParams>> = {
  1: { branchAngle: 34, upwardBias: 0.26, lengthDecay: 0.78, gnarl: 0.1 },
  2: { branchAngle: 56, upwardBias: 0.04, lengthDecay: 0.82, gnarl: 0.18 },
  3: { branchAngle: 48, upwardBias: 0.12, lengthDecay: 0.8, gnarl: 0.12 },
  4: { branchAngle: 62, upwardBias: 0.08, lengthDecay: 0.84, gnarl: 0.14 },
}

export interface TreeLeaf {
  position: Vec3
  /** ความยาวใบ (หน่วยต้นไม้) */
  length: number
  /** มุมปลายใบบนจอ (เรเดียน, 0 = ชี้ขึ้น, หมุนตามเข็มนาฬิกา) — หันออกนอกพุ่ม+หาแสง */
  angle: number
  /** ความกว้างใบที่เห็น 0.4-1 (ใบที่หันข้างเข้ากล้องดูแคบลง) */
  widthScale: number
  color: string
}

export interface TreeFlower {
  position: Vec3
  radius: number
  color: string
  rotation: number
}

export interface TreeModel {
  branches: BranchSegment[]
  leaves: TreeLeaf[]
  flowers: TreeFlower[]
  trunkColor: string
  /** 0-1 สัดส่วนความสูงต้นเทียบกับต้นโตเต็มที่ (ผู้วาดใช้ย่อ/ขยายในกล่อง) */
  growth: number
  /** trunk visual level 1-8 (ตรงกับระบบเดิม ใช้แสดงใน tooltip) */
  visualLevel: number
  /** ขอบเขตพิกัดของต้นที่แสดง (รวมพุ่มใบ) */
  bounds: { minX: number; maxX: number; maxY: number }
}

export interface TreeProgress {
  mbtiType: MbtiType | null | undefined
  /** เกมเลเวลจาก knowledgeStack — คุมขนาด/ชั้นกิ่ง/ใบ */
  trunkBranchLevel: number
  /** เลเวลหมวดจิตใจ — คุมจำนวนดอก */
  leafFlowerLevel: number
  /** จอเล็ก → ใบ/ดอกน้อยลง (ประหยัดงานวาด) */
  compact?: boolean
}

export function buildTreeModel({ mbtiType, trunkBranchLevel, leafFlowerLevel, compact = false }: TreeProgress): TreeModel {
  const key = mbtiType ?? 'BALANCED'
  const shape: TreeShape = (mbtiType && MBTI_SHAPE_MAP[mbtiType]) || 3
  const theme = MBTI_TREE_THEME[mbtiType ?? 'INFP'] ?? MBTI_TREE_THEME.INFP
  const visualLevel = toTrunkVisualLevel(trunkBranchLevel)
  const shownDepth = DEPTH_BY_VISUAL_LEVEL[visualLevel - 1]

  // ต้นโตเต็มที่ seed เดิมเสมอสำหรับ MBTI เดียวกัน แล้วตัดเหลือเฉพาะชั้นที่เลเวลนี้แสดง
  const seed = Math.floor(seededRandom(`tree-${key}`)() * 1e9)
  const full = generateTree({ seed, maxDepth: FULL_DEPTH, ...SHAPE_PARAMS[shape] })
  const branches = full.branches.filter((b) => b.depth <= shownDepth)

  const rand = seededRandom(`tree-foliage-${key}-${visualLevel}`)
  const leaves: TreeLeaf[] = []
  const flowers: TreeFlower[] = []

  // ใบเกาะปลายกิ่ง 2 ชั้นนอกสุดที่แสดงอยู่ (ต้นเล็กจึงมีพุ่มเล็กตามกิ่งที่มี)
  const anchorBranches = branches.filter((b) => b.depth >= Math.max(1, shownDepth - 1))
  const density = getLeafDensityRange(trunkBranchLevel)
  // ต้นอ่อน (ยังไม่ถึงเกณฑ์ใบเต็ม): ใบอ่อน 3-7 ใบต่อปลายกิ่ง เพิ่มตามเลเวล 1-20
  const young = !density
  if (anchorBranches.length) {
    const cap = compact ? 3500 : 8000
    const wanted = young
      ? 3 + Math.floor(Math.min(Math.max(trunkBranchLevel, 1), 20) / 5)
      : Math.round((density[0] + density[1]) * 1.6)
    const perAnchor = young ? wanted : Math.max(3, Math.min(wanted, Math.floor(cap / anchorBranches.length)))

    const center = average(anchorBranches.map((b) => b.end))
    // ใบอ่อนตั้งใหญ่กว่าใบปกติเล็กน้อย — ต้นกล้ามีใบน้อย ถ้าเล็กเท่าใบปกติจะแทบมองไม่เห็นบนจอ
    const leafLength = young ? 0.42 : 0.34
    for (const b of anchorBranches) {
      const len = dist(b.start, b.end)
      // ใบอ่อนเกาะชิดปลายกิ่ง (ยังไม่แผ่เป็นพุ่ม)
      const clusterR = young ? Math.max(0.3, len * 0.35) : Math.max(0.35, len * 0.6)
      for (let i = 0; i < perAnchor; i++) {
        const r = clusterR * Math.cbrt(rand())
        const th = rand() * Math.PI * 2
        const ph = Math.acos(2 * rand() - 1)
        const p: Vec3 = [
          b.end[0] + r * Math.sin(ph) * Math.cos(th),
          b.end[1] + r * Math.cos(ph) * 0.75,
          b.end[2] + r * Math.sin(ph) * Math.sin(th),
        ]
        const out = normalize([p[0] - center[0], (p[1] - center[1]) * 0.8, p[2] - center[2]])
        // ทิศปลายใบบนจอ: ออกนอกพุ่ม 75% + หาแสง 25% + สุ่มเล็กน้อย
        const tipX = out[0] * 0.75 + SUN_DIR[0] * 0.25 + (rand() - 0.5) * 0.6
        const tipY = out[1] * 0.75 + SUN_DIR[1] * 0.25 + (rand() - 0.5) * 0.6
        // ความสว่าง: หันรับแสง + อยู่ด้านหน้าพุ่ม (z มาก) + อยู่สูง
        const facing = dot(out, SUN_DIR) * 0.5 + 0.5
        const front = clamp01((p[2] - center[2]) / (clusterR * 3) * 0.5 + 0.5)
        const lift = clamp01((p[1] - center[1]) / 6 + 0.5)
        const base = theme.leaves[Math.floor(rand() * theme.leaves.length)]
        leaves.push({
          position: p,
          length: leafLength * (0.75 + rand() * 0.6),
          angle: Math.atan2(tipX, tipY),
          widthScale: 0.45 + rand() * 0.55,
          // ใบอ่อน: สว่างขึ้น อมเหลือง (hue ถอยไปทางเหลือง) และสีจางลงเล็กน้อย เหมือนใบแตกใหม่
          color: shade(
            base,
            (facing - 0.5) * 0.24 + (front - 0.5) * 0.12 + (lift - 0.5) * 0.06 + (young ? 0.08 : 0),
            (rand() - 0.5) * 0.03 + (young ? -0.035 : 0),
            (rand() - 0.5) * 0.08 + (young ? -0.06 : 0),
          ),
        })
      }
    }
    // วาดจากหลังมาหน้า (z น้อย → มาก) ให้ใบด้านหน้าทับด้านหลังถูกลำดับ
    leaves.sort((a, b) => a.position[2] - b.position[2])

    // ดอก: เลเวลหมวดจิตใจ 0-100 → 0-18 ดอก (จอเล็ก 0-8) โผล่ที่ผิวนอกของพุ่ม — ต้นอ่อนยังไม่ออกดอก
    const maxFlowers = compact ? 8 : 18
    const flowerCount = young ? 0 : Math.min(maxFlowers, Math.round((leafFlowerLevel / 100) * maxFlowers))
    const outer = leaves.filter((l) => dist(l.position, center) > 1)
    for (let i = 0; i < flowerCount && outer.length; i++) {
      const host = outer[Math.floor(rand() * outer.length)]
      flowers.push({
        position: [host.position[0], host.position[1], host.position[2] + 0.05],
        radius: 0.13 + rand() * 0.06,
        color: theme.flowers[Math.floor(rand() * theme.flowers.length)],
        rotation: rand() * Math.PI * 2,
      })
    }
  }

  let minX = 0, maxX = 0, maxY = 0
  for (const b of branches) {
    minX = Math.min(minX, b.end[0]); maxX = Math.max(maxX, b.end[0]); maxY = Math.max(maxY, b.end[1])
  }
  for (const l of leaves) {
    minX = Math.min(minX, l.position[0] - l.length); maxX = Math.max(maxX, l.position[0] + l.length)
    maxY = Math.max(maxY, l.position[1] + l.length)
  }

  return {
    branches,
    leaves,
    flowers,
    trunkColor: theme.trunk,
    growth: 0.38 + ((visualLevel - 1) / 7) * 0.62,
    visualLevel,
    bounds: { minX, maxX, maxY },
  }
}

/* ── คณิต/สี ── */
function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
function dot(a: Vec3, b: Vec3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function dist(a: Vec3, b: Vec3) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }
function clamp01(x: number) { return Math.max(0, Math.min(1, x)) }
function average(points: Vec3[]): Vec3 {
  const s: Vec3 = [0, 0, 0]
  for (const p of points) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2] }
  return [s[0] / points.length, s[1] / points.length, s[2] / points.length]
}

/** ปรับสี hex ใน HSL: dl = ความสว่าง ±, dh = hue ±, ds = saturation ± → 'hsl(...)' */
export function shade(hex: string, dl: number, dh = 0, ds = 0): string {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  const H = (((h + dh) % 1) + 1) % 1
  return `hsl(${Math.round(H * 360)} ${Math.round(clamp01(s + ds) * 100)}% ${Math.round(clamp01(l + dl) * 100)}%)`
}
