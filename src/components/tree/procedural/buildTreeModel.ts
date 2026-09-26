import { MBTI_TREE_THEME, type MbtiType } from '../../../types'
import { MBTI_SHAPE_MAP, getLeafDensityRange, toTrunkVisualLevel, type TreeShape } from '../../../config/treeAssets'
import { seededRandom } from '../../../utils/seededRandom'
import { generateTree, pointOnBranch, type BranchSegment, type TreeParams, type Vec3 } from './generateTree'
import { shade } from './color'
import { DEFAULT_SPECIES, SPECIES, type BarkStyle, type LeafShape, type Species } from './species'
import { aerialRoots, buildSpecialForm, weepingStrands, type FormInput } from './speciesForms'

export { shade } from './color'
export type { LeafShape } from './species'

/*============================================================================*\
  buildTreeModel — แปลง "ความคืบหน้าของผู้เล่น" เป็นข้อมูลต้นไม้ที่พร้อมวาด (ตรรกะล้วน ไม่วาดเอง)
  ────────────────────────────────────────────────────────────────────────────
  - ต้นเดียวกันโตขึ้นเรื่อยๆ: สร้าง "ต้นโตเต็มที่" ครั้งเดียว (seed ผูกกับ MBTI) แล้วแสดงเฉพาะกิ่งถึงชั้นที่
    ขั้นภาพ (visual level 1-8) อนุญาต — ทุกขั้นต่างกันชัด: ความสูง (GROWTH), ความหนาลำต้น (RADIUS),
    จำนวนชั้นกิ่ง (DEPTH) และความหนาแน่นของพุ่ม (FILL)
  - ขั้น 1-2 = ต้นกล้า: ลำต้นเรียว กิ่งอ่อนไม่กี่กิ่ง ใบผลิเป็นคู่/สลับตามกิ่ง + กลุ่มใบที่ยอดกิ่ง
    เรียงเป็นระเบียบแบบต้นกล้าจริง (ไม่สุ่มกระจาย ไม่ทึบ)
  - ขั้น 3+ = ต้นไม้: ใบผลิตามกิ่งในวงรีทรงพุ่ม + ขอบโดมด้านบน + ก้อนพุ่ม (ขั้น 4+) ให้พุ่มฟูกลม
  - ตัวตนตาม MBTI ครบ 16 แบบ: รูปทรงตามกลุ่ม (NT/NF/SJ/SP) + ปรับตาม 4 ตัวอักษร (typeParams)
      E/I: แผ่กว้าง แตกกิ่งมาก / ตั้งตรง กระชับ       S/N: ลำต้นล่ำเตี้ย / สูงโปร่งกิ่งยาว
      T/F: กิ่งตรงคม ใบชี้ขึ้น / กิ่งโค้งอ่อนช้อย ใบแผ่   J/P: สมมาตร ใบออกเป็นคู่ / อิสระ ใบออกสลับ
    ใบแต่ละกลุ่มรูปทรงต่างกัน (LEAF_STYLE — ใบเรียวยาว / ใบมนนุ่ม / ใบรูปไข่ / ใบกว้าง)
    + ใบเฉพาะบาง MBTI (LEAF_SHAPE_BY_TYPE เช่น ESTP = ใบเมเปิ้ล)
  - ต้นไม้ประจำตัว 16 สายพันธุ์ (species.ts): รูปใบ สีใบ เปลือก ดอก ผล และโครงพิเศษ
    (หลิวห้อยกิ่ง / รากอากาศไทร / สนไซเปรส-สปรูซ / ปาล์ม / ไผ่ — ดู speciesForms.ts)
  - ดอกผูกกับ leafFlowerLevel (หมวดจิตใจ) — สายพันธุ์ที่ไม่มีดอกบนต้น (สน/ปาล์ม/ไผ่) ดอกป่าขึ้นรอบโคนแทน
  พิกัดเป็นหน่วยของต้นไม้ (y ขึ้นฟ้า, z เข้าหากล้อง) ผู้วาดแปลงเป็นพิกเซลเอง (drawTree2D.ts)
\*============================================================================*/

/** ทิศแสง (ซ้ายบน ค่อนมาทางกล้อง) — normalized */
export const SUN_DIR: Vec3 = normalize([-0.45, 0.8, 0.4])

const FULL_DEPTH = 6

/** ต่อขั้นภาพ 1-8: ชั้นกิ่งที่แสดง / ความสูงเทียบต้นโตเต็มที่ / ความหนากิ่งเทียบต้นโตเต็มที่ / ความแน่นพุ่ม */
const DEPTH_BY_VISUAL_LEVEL = [1, 2, 3, 4, 4, 5, 5, 6]
const GROWTH_BY_VISUAL_LEVEL = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
const RADIUS_BY_VISUAL_LEVEL = [0.3, 0.4, 0.52, 0.62, 0.72, 0.82, 0.92, 1]
const FILL_BY_VISUAL_LEVEL = [0, 0, 0.55, 0.7, 0.85, 0.92, 1, 1]
/** ขั้นภาพที่ยังเป็นต้นกล้า (ใบเรียงเป็นระเบียบตามกิ่ง ไม่มีพุ่ม) */
const SEEDLING_MAX_LEVEL = 2

/** รูปทรงต่อกลุ่ม MBTI — NT ตั้งตรงสูงโปร่ง, NF แผ่กิ่งอ่อนช้อย, SJ ทรงโดมกลม, SP กว้างแผ่ออก */
const SHAPE_PARAMS: Record<TreeShape, Partial<TreeParams>> = {
  1: { branchAngle: 34, upwardBias: 0.26, lengthDecay: 0.78, gnarl: 0.1 },
  2: { branchAngle: 56, upwardBias: 0.04, lengthDecay: 0.82, gnarl: 0.18 },
  3: { branchAngle: 48, upwardBias: 0.12, lengthDecay: 0.8, gnarl: 0.12 },
  4: { branchAngle: 62, upwardBias: 0.08, lengthDecay: 0.84, gnarl: 0.14 },
}

/** ใบแต่ละแบบ: ความยาว (คูณ) / ช่วงความกว้างใบ */
const LEAF_STYLE: Record<LeafShape, { length: number; width: [number, number] }> = {
  lance: { length: 1.15, width: [0.42, 0.6] }, // ใบเรียวยาวปลายแหลม
  petal: { length: 1, width: [0.7, 0.95] }, // ใบมนนุ่มคล้ายกลีบ
  oval: { length: 1, width: [0.6, 0.85] }, // ใบรูปไข่คลาสสิก
  broad: { length: 0.95, width: [0.8, 1] }, // ใบกว้างแผ่
  maple: { length: 1.05, width: [0.92, 1.05] }, // ใบเมเปิล 5 แฉก
  needle: { length: 0.6, width: [0.8, 1] }, // ใบเข็มสน (รูปทรงแคบอยู่แล้ว)
  fan: { length: 0.95, width: [0.9, 1.05] }, // ใบพัดแปะก๊วย
  oak: { length: 1.1, width: [0.8, 0.95] }, // ใบโอ๊กขอบหยัก
  blade: { length: 1.5, width: [0.8, 1] }, // ใบเรียวยาวไผ่/ใบย่อยปาล์ม
}

interface TypeTraits {
  /** E: แผ่กว้าง */ outgoing: boolean
  /** N: สูงโปร่ง */ intuitive: boolean
  /** F: อ่อนช้อย */ feeling: boolean
  /** J: สมมาตร */ judging: boolean
}

function traitsOf(mbti: MbtiType | null | undefined): TypeTraits {
  const t = mbti ?? 'ISFJ'
  return { outgoing: t[0] === 'E', intuitive: t[1] === 'N', feeling: t[2] === 'F', judging: t[3] === 'J' }
}

/** ปรับพารามิเตอร์ต้นไม้ตาม 4 ตัวอักษร MBTI — 16 แบบไม่ซ้ำกัน แม้อยู่กลุ่มรูปทรงเดียวกัน */
function typeParams(shape: TreeShape, tr: TypeTraits): Partial<TreeParams> {
  const base = SHAPE_PARAMS[shape]
  return {
    ...base,
    branchAngle: (base.branchAngle ?? 50) + (tr.outgoing ? 6 : -4),
    lateralBranches: tr.outgoing ? [1, 3] : [1, 2],
    trunkHeight: tr.intuitive ? 3.4 : 2.9,
    trunkRadius: tr.intuitive ? 0.36 : 0.42,
    lengthDecay: (base.lengthDecay ?? 0.8) + (tr.intuitive ? 0.02 : -0.01),
    gnarl: (base.gnarl ?? 0.12) * (tr.feeling ? 1.5 : 0.65),
    upwardBias: (base.upwardBias ?? 0.12) + (tr.feeling ? -0.03 : 0.04),
    angleJitter: tr.judging ? 7 : 20,
  }
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
  /** blossom = ดอก 5 กลีบ / magnolia = ดอกใหญ่กลีบยาวทรงถ้วย */
  kind?: 'blossom' | 'magnolia'
  /** สีใจกลางดอก (ไม่ระบุ = เหลืองเกสร) */
  center?: string
}

/** ผลไม้บนต้น (แอปเปิล/ส้ม/มะพร้าว) */
export interface TreeFruit {
  position: Vec3
  radius: number
  color: string
}

/** ก้อนพุ่มใบ (วงกลมสีใบเข้ม) วาดใต้ใบแต่ละใบ — อุดช่องโหว่ให้พุ่มดูฟูหนาเป็นกลุ่มๆ */
export interface TreeClump {
  position: Vec3
  radius: number
  color: string
}

/** ลำต้น/กิ่งทุก MBTI ใช้น้ำตาลอ่อนนุ่มโทนเดียวกัน (เดิมใช้ MBTI_TREE_THEME.trunk ซึ่งเข้ม/อิ่มสีต่างกันไป) */
export const TRUNK_COLOR = '#a8835f'

export interface TreeModel {
  branches: BranchSegment[]
  leaves: TreeLeaf[]
  flowers: TreeFlower[]
  fruits: TreeFruit[]
  /** ชื่อสายพันธุ์ (ไทย) เช่น ต้นหลิว */
  speciesName: string
  /** ลายเปลือกไม้ */
  bark: BarkStyle
  /** ก้อนพุ่มใต้ใบ (ขั้นภาพ 4+ เท่านั้น) */
  clumps: TreeClump[]
  /** index ของใบที่ไหวตามลมได้ (ใบริมพุ่ม/ใบต้นกล้า) — ผู้วาดสุ่มไหวทีละ 2-3 ใบ */
  flutterable: number[]
  /** รูปทรงใบตามสายพันธุ์ */
  leafShape: LeafShape
  trunkColor: string
  /** 0-1 สัดส่วนความสูงต้นเทียบกับต้นโตเต็มที่ (ผู้วาดใช้ย่อ/ขยายในกล่อง) */
  growth: number
  /** trunk visual level 1-8 (ตรงกับระบบเดิม ใช้แสดงใน tooltip) */
  visualLevel: number
  /** ชั้นของกิ่งปลายสุดที่แสดง */
  tipDepth: number
  /** วงรีทรงพุ่ม (ระนาบ x-y) ที่ใบทุกใบอยู่ข้างใน */
  crown: { cx: number; cy: number; rx: number; ry: number }
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
  const traits = traitsOf(mbtiType)
  const theme = MBTI_TREE_THEME[mbtiType ?? 'INFP'] ?? MBTI_TREE_THEME.INFP
  const visualLevel = toTrunkVisualLevel(trunkBranchLevel)
  const shownDepth = DEPTH_BY_VISUAL_LEVEL[visualLevel - 1]
  const seedling = visualLevel <= SEEDLING_MAX_LEVEL
  const species = (mbtiType && SPECIES[mbtiType]) || DEFAULT_SPECIES
  const leafShape = species.leafShape
  const style = LEAF_STYLE[leafShape]
  const leafSize = style.length * (species.leafSize ?? 1)

  // ต้นโตเต็มที่ seed เดิมเสมอสำหรับ MBTI เดียวกัน → ตัดเหลือชั้นที่ขั้นนี้แสดง + กิ่งเรียวตามอายุ
  const seed = Math.floor(seededRandom(`tree-${key}`)() * 1e9)
  const full = generateTree({ seed, maxDepth: FULL_DEPTH, ...typeParams(shape, traits), ...species.params })
  const rScale = RADIUS_BY_VISUAL_LEVEL[visualLevel - 1]
  const branches = full.branches
    .filter((b) => b.depth <= shownDepth)
    .map((b) => ({ ...b, radiusStart: b.radiusStart * rScale, radiusEnd: b.radiusEnd * rScale }))

  const rand = seededRandom(`tree-foliage-${key}-${visualLevel}`)
  const leaves: TreeLeaf[] = []
  const flowers: TreeFlower[] = []
  const fruits: TreeFruit[] = []
  const clumps: TreeClump[] = []

  // กิ่งที่ใบผลิ: ต้นกล้า = ทุกกิ่งอ่อน / ต้นไม้ = 2-3 ชั้นนอกสุดที่แสดงอยู่
  const leafBranches = branches.filter((b) => b.depth >= (seedling ? 1 : Math.max(1, shownDepth - 2)))
  const crown = crownEllipse(leafBranches.length ? leafBranches : branches)
  const center: Vec3 = [crown.cx, crown.cy, leafBranches.length ? average(leafBranches.map((b) => b.end))[2] : 0]
  const widthOf = () => style.width[0] + rand() * (style.width[1] - style.width[0])
  const flowerColors = species.flowers?.colors ?? theme.flowers
  const formInput: FormInput = { species, level: visualLevel, rand, leafLength: 0.5 * leafSize, widthOf, compact }

  // ── สายพันธุ์โครงพิเศษ (สน/ปาล์ม/ไผ่): สร้างทั้งต้นใน speciesForms + ดอกป่ารอบโคน (หมวดจิตใจ) ──
  if (species.form === 'column' || species.form === 'cone' || species.form === 'palm' || species.form === 'bamboo') {
    const out = buildSpecialForm(species.form, formInput)
    const wild: TreeFlower[] = []
    const n = Math.round((Math.min(100, leafFlowerLevel) / 100) * (compact ? 6 : 10))
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? 1 : -1
      wild.push({
        position: [side * (0.35 + rand() * 1.1), 0.08 + rand() * 0.25, 0.4 + rand() * 0.3],
        radius: 0.1 + rand() * 0.05,
        color: flowerColors[Math.floor(rand() * flowerColors.length)],
        rotation: rand() * Math.PI * 2,
      })
    }
    return assembleModel({
      ...out, flowers: wild, species, leafShape, visualLevel,
      tipDepth: 1,
    })
  }

  if (seedling) {
    // ── ต้นกล้า: ใบเรียงตามข้อกิ่ง — J ออกเป็นคู่ตรงข้าม / P ออกสลับข้าง, T ใบชี้ขึ้น / F ใบแผ่ออก ──
    const L = 1.0 * leafSize * (traits.intuitive ? 1.08 : 1)
    const spreadAngle = traits.feeling ? 1.05 : 0.8
    const nodes = traits.outgoing ? [0.42, 0.63, 0.84] : [0.5, 0.78]
    const fresh = (i: number, dl = 0) =>
      shade(species.leafColors[i % species.leafColors.length], 0.07 + dl + (rand() - 0.5) * 0.05, -0.02 + (rand() - 0.5) * 0.02, -0.04)
    // คู่ใบบนลำต้นใกล้ยอด (ใบเลี้ยง) ซ้าย-ขวาสมดุล — ต้นกล้าไม่เอียงข้างเดียวแม้กิ่งอ่อนแตกไปทางเดียว
    const trunk = branches.find((b) => b.depth === 0)
    if (trunk) {
      const p = pointOnBranch(trunk, 0.78)
      for (const s of [1, -1]) {
        leaves.push({ position: [p[0], p[1], p[2] + 0.01], length: L * 0.85, angle: s * (spreadAngle + 0.15), widthScale: widthOf(), color: fresh(s > 0 ? 0 : 1) })
      }
    }
    for (const b of leafBranches) {
      const dir = Math.atan2(b.end[0] - b.start[0], b.end[1] - b.start[1])
      const outer = b.depth === shownDepth
      let side = rand() < 0.5 ? 1 : -1
      nodes.forEach((t, k) => {
        if (!outer && t < 0.6) return // กิ่งชั้นในมีใบเฉพาะช่วงปลาย ไม่รกโคนต้น
        const p = pointOnBranch(b, t)
        const sides = traits.judging ? [1, -1] : [side]
        for (const s of sides) {
          leaves.push({
            position: [p[0], p[1], p[2] + s * 0.01],
            length: L * (0.72 + t * 0.3),
            angle: dir + s * (spreadAngle + (rand() - 0.5) * 0.18),
            widthScale: widthOf(),
            color: fresh(k + (s > 0 ? 1 : 0)),
          })
        }
        side = -side
      })
      if (outer) {
        // ยอดกิ่ง: กลุ่มใบแตกใหม่ 3 ใบ บานออกเป็นพัด (ใบกลางยาวสุด)
        for (const [off, len] of [[-0.5, 0.85], [0, 1.05], [0.5, 0.85]] as const) {
          leaves.push({
            position: b.end,
            length: L * len,
            angle: dir + off * (traits.feeling ? 1.2 : 1),
            widthScale: widthOf(),
            color: fresh(1, 0.04),
          })
        }
      }
    }
  } else if (leafBranches.length) {
    // ── ต้นไม้: ใบผลิตามกิ่งในวงรีทรงพุ่ม + ขอบโดม + ก้อนพุ่ม — ความแน่นตามขั้น ──
    const fill = FILL_BY_VISUAL_LEVEL[visualLevel - 1]
    const density = getLeafDensityRange(trunkBranchLevel) ?? [2, 4]
    const cap = compact ? 3500 : 8000
    const wanted = Math.round((density[0] + density[1]) * 1.6 * fill)
    const perBranch = Math.max(3, Math.min(wanted, Math.floor(cap / leafBranches.length)))
    const leafLength = 0.5 * leafSize

    // origin = จุดศูนย์กลางกลุ่มพุ่มย่อย (ซากุระ) — ใบหันออกจากกลุ่มของมันเอง ไม่ใช่จากกลางพุ่มใหญ่
    const addLeaf = (p: Vec3, origin?: { c: Vec3; r: number }) => {
      const oc = origin?.c ?? center, orx = origin?.r ?? crown.rx, ory = origin?.r ?? crown.ry
      const out = normalize([(p[0] - oc[0]) / orx, ((p[1] - oc[1]) / ory) * 0.8, (p[2] - oc[2]) / orx])
      // ทิศปลายใบบนจอ: ออกนอกพุ่ม 75% + หาแสง 25% + สุ่มเล็กน้อย (T ชี้ขึ้นมากกว่า)
      const up = traits.feeling ? 0.2 : 0.32
      const tipX = out[0] * (1 - up) + SUN_DIR[0] * up + (rand() - 0.5) * 0.6
      const tipY = out[1] * (1 - up) + SUN_DIR[1] * up + (rand() - 0.5) * 0.6
      // ความสว่าง: หันรับแสง + อยู่ด้านหน้าพุ่ม (z มาก) + อยู่สูง
      const facing = dot(out, SUN_DIR) * 0.5 + 0.5
      const front = clamp01(((p[2] - center[2]) / crown.rx) * 0.5 + 0.5)
      const lift = clamp01(((p[1] - crown.cy) / crown.ry) * 0.5 + 0.5)
      const base = species.leafColors[Math.floor(rand() * species.leafColors.length)]
      leaves.push({
        position: p,
        length: leafLength * (0.75 + rand() * 0.6),
        angle: Math.atan2(tipX, tipY),
        widthScale: widthOf(),
        color: shade(
          base,
          (facing - 0.5) * 0.24 + (front - 0.5) * 0.12 + (lift - 0.5) * 0.06,
          (rand() - 0.5) * 0.03,
          (rand() - 0.5) * 0.08,
        ),
      })
    }

    for (const b of leafBranches) {
      const len = dist(b.start, b.end)
      const spread = Math.max(0.26, len * 0.32)
      let placed = 0
      for (let attempt = 0; attempt < perBranch * 3 && placed < perBranch; attempt++) {
        // ตำแหน่งตามกิ่ง: ช่วง 35%-100% ของความยาวกิ่ง เอนไปทางปลาย (ปลายกิ่งใบหนากว่าโคน)
        const t = 1 - Math.pow(rand(), 1.4) * 0.65
        const on = pointOnBranch(b, t)
        const r = spread * Math.cbrt(rand())
        const th = rand() * Math.PI * 2
        const ph = Math.acos(2 * rand() - 1)
        const p: Vec3 = [
          on[0] + r * Math.sin(ph) * Math.cos(th),
          on[1] + r * Math.cos(ph) * 0.8,
          on[2] + r * Math.sin(ph) * Math.sin(th),
        ]
        // อยู่ในวงรีทรงพุ่มเท่านั้น — ขอบนุ่มนิดเดียว (สุ่มเกณฑ์ 0.95-1) ให้ขอบพุ่มโค้งเรียบสวย
        const e = ((p[0] - crown.cx) / crown.rx) ** 2 + ((p[1] - crown.cy) / crown.ry) ** 2
        if (e > 1 - rand() * 0.05) continue
        placed++
        addLeaf(p)
      }
    }

    // ซากุระ: กลุ่มดอกฟูๆ ที่ปลายกิ่ง (ขั้น 3+) — ก้อนชมพูเป็นตัวกลุ่ม + กลีบเรียงรอบ หันออกจากกลุ่มตัวเอง
    // เว้นช่องระหว่างกลุ่มให้เห็นกิ่งสีเข้ม เหมือนซากุระจริงที่บานเป็นกระจุกตามกิ่ง
    const puffs = species.puffs
    if (puffs) {
      // เฉพาะปลายกิ่งช่วงบนของพุ่ม — กลุ่มดอกไม่ห้อยต่ำจนรกโคนต้น
      const hosts = branches.filter((b) =>
        (b.depth === shownDepth || (b.depth === shownDepth - 1 && rand() < 0.5)) && b.end[1] > crown.cy - crown.ry * 0.35)
      for (const b of hosts) {
        const c: Vec3 = [b.end[0], b.end[1] + leafLength * 0.25, b.end[2]]
        const R = leafLength * (1.3 + rand() * 0.8) * puffs.size * (0.75 + 0.25 * fill)
        const lift = clamp01(((c[1] - crown.cy) / crown.ry) * 0.5 + 0.5)
        // ตัวกลุ่มเล็กกว่ากลีบรอบๆ พอสมควร — กลีบคลุมขอบหมด ไม่เห็นเป็นวงกลมเรียบ
        clumps.push({ position: c, radius: R * 0.62, color: shade(species.leafColors[2], -0.04 + lift * 0.05 + (rand() - 0.5) * 0.03) })
        const k = Math.round(24 * fill)
        for (let i = 0; i < k && leaves.length < cap; i++) {
          const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R * 0.9
          addLeaf([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.85, c[2] + (rand() - 0.5) * R], { c, r: R })
        }
      }
    }

    // ก้อนพุ่ม (ขั้น 4+): ปลายกิ่งชั้นนอก + แนวโดมด้านบน + กลางพุ่ม — สีใบเข้มลง ใบจริงวาดทับอีกชั้น
    if (visualLevel >= 4 && !puffs) {
      const clumpColor = (lift: number) =>
        shade(species.leafColors[0], -0.1 + lift * 0.06 + (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.02, -0.04)
      for (const b of leafBranches) {
        if (b.depth !== shownDepth) continue
        const lift = clamp01(((b.end[1] - crown.cy) / crown.ry) * 0.5 + 0.5)
        clumps.push({ position: b.end, radius: leafLength * (1.1 + rand() * 0.6), color: clumpColor(lift) })
      }
      const domeClumps = Math.round(Math.PI * Math.sqrt((crown.rx ** 2 + crown.ry ** 2) / 2) / (leafLength * 1.2))
      for (let i = 0; i < domeClumps; i++) {
        const a = Math.PI * (-0.05 + (i + rand() * 0.6) / domeClumps * 1.1)
        const rr = 0.72 + rand() * 0.14
        const pos: Vec3 = [crown.cx + Math.cos(a) * crown.rx * rr, crown.cy + Math.sin(a) * crown.ry * rr, center[2]]
        clumps.push({ position: pos, radius: leafLength * (1.3 + rand() * 0.6), color: clumpColor(clamp01(Math.sin(a) * 0.5 + 0.5)) })
      }
      clumps.push({ position: [crown.cx, crown.cy + crown.ry * 0.2, center[2]], radius: Math.min(crown.rx, crown.ry) * 0.6, color: clumpColor(0.3) })
      // ทุกก้อนอยู่ในวงรีทรงพุ่มทั้งก้อน + ไม่ลงไปช่วงล่างที่ใบปิดไม่มิด — ไม่เห็นเป็นก้อนกลมทื่อๆ
      const inner = Math.min(crown.rx, crown.ry)
      for (let i = clumps.length - 1; i >= 0; i--) {
        const c = clumps[i]
        const e = Math.sqrt(((c.position[0] - crown.cx) / crown.rx) ** 2 + ((c.position[1] - crown.cy) / crown.ry) ** 2)
        const room = (1 - e) * inner - leafLength * 0.3
        const above = c.position[1] - (crown.cy - crown.ry * 0.25)
        if (room < leafLength * 0.5 || above < leafLength * 0.5) clumps.splice(i, 1)
        else c.radius = Math.min(c.radius, room, above)
      }
    }

    // เติมใบทั่วในพุ่ม (ช่วงบน ~3/4) — พุ่มเต็มกลมสม่ำเสมอ ไม่กลวงตรงกลางเป็นซุ้มโค้ง
    const interior = Math.min(
      cap - leaves.length,
      Math.round(((Math.PI * crown.rx * crown.ry) / (leafLength * leafLength)) * 0.9 * fill * (puffs ? 0.3 : 1)),
    )
    for (let i = 0; i < interior; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.9
      const y = crown.cy + Math.sin(a) * crown.ry * r
      if (y < crown.cy - crown.ry * 0.45) continue
      addLeaf([crown.cx + Math.cos(a) * crown.rx * r, y, center[2] + (rand() - 0.5) * crown.rx * 0.8])
    }

    // ขอบบนของพุ่มเป็นโดมโค้งเรียบ: ใบเรียงตามแนวขอบวงรีครึ่งบน — ขั้น 3 แถวเดียว (ยังโปร่ง), ขั้น 4+ สองแถว
    const halfPerimeter = Math.PI * Math.sqrt((crown.rx ** 2 + crown.ry ** 2) / 2)
    const rows = puffs ? 0.6 : visualLevel >= 4 ? 2 : 1
    const shell = Math.min(cap - leaves.length, Math.round((halfPerimeter / (leafLength * 0.42)) * rows * fill))
    for (let i = 0; i < shell; i++) {
      const a = Math.PI * (-0.1 + rand() * 1.2) // มุมของขอบวงรี: 0 = ขวา, π/2 = ยอด, π = ซ้าย
      const rr = 0.8 + rand() * 0.16
      addLeaf([
        crown.cx + Math.cos(a) * crown.rx * rr,
        crown.cy + Math.sin(a) * crown.ry * rr,
        center[2] + (rand() - 0.5) * crown.rx * 0.9,
      ])
    }

    // ดอก: เลเวลหมวดจิตใจ 0-100 → 0-18 ดอก (จอเล็ก 0-8) × ปริมาณดอกของสายพันธุ์ (ซากุระ/จาคารันดาบานเต็มต้น)
    const flowerSpec = species.flowers
    const maxFlowers = Math.round((compact ? 8 : 18) * (flowerSpec?.amount ?? 1))
    const flowerCount = Math.min(maxFlowers, Math.round((Math.min(100, leafFlowerLevel) / 100) * maxFlowers * fill))
    const outer = leaves.filter((l) => ((l.position[0] - crown.cx) / crown.rx) ** 2 + ((l.position[1] - crown.cy) / crown.ry) ** 2 > 0.35)
    for (let i = 0; i < flowerCount && outer.length; i++) {
      const host = outer[Math.floor(rand() * outer.length)]
      flowers.push({
        position: [host.position[0], host.position[1], host.position[2] + 0.05],
        radius: (0.13 + rand() * 0.06) * (flowerSpec?.size ?? 1),
        color: flowerColors[Math.floor(rand() * flowerColors.length)],
        rotation: rand() * Math.PI * 2,
        kind: flowerSpec?.kind ?? 'blossom',
        center: flowerSpec?.center,
      })
    }

    // ผล (ขั้น 4+): แอปเปิลแดง / ส้ม — ห้อยใต้ใบริมพุ่ม จำนวนตามเลเวลหมวดจิตใจ
    if (species.fruit && visualLevel >= 4) {
      const n = Math.round((Math.min(100, leafFlowerLevel) / 100) * 14 * species.fruit.amount * fill) + 2
      for (let i = 0; i < n && outer.length; i++) {
        const host = outer[Math.floor(rand() * outer.length)]
        fruits.push({
          position: [host.position[0], host.position[1] - 0.12, host.position[2] + 0.08],
          radius: 0.17 * (species.fruit.size ?? 1) * (0.9 + rand() * 0.2),
          color: species.fruit.color,
        })
      }
    }
  }

  // ใบที่ไหวตามลมได้: ต้นกล้า = ทุกใบ / ต้นไม้ = ใบริมนอกของพุ่ม (ด้านหน้า) — ใบในพุ่ม/ก้อนพุ่มนิ่ง
  const flutterable: number[] = []
  leaves.forEach((l, i) => {
    const e = ((l.position[0] - crown.cx) / crown.rx) ** 2 + ((l.position[1] - crown.cy) / crown.ry) ** 2
    if (seedling || (e > 0.5 && l.position[2] >= center[2])) flutterable.push(i)
  })

  // หลิว: เส้นกิ่งห้อยพริ้วจากปลายกิ่ง (ขั้น 2+) — ใบบนเส้นห้อยไหวตามลมได้ทั้งหมด
  if (species.form === 'weeping' && visualLevel >= 2) {
    const tips = branches.filter((b) => b.depth >= shownDepth - 1 && b.depth >= 1)
    flutterable.push(...weepingStrands(branches, leaves, tips, formInput, 0.25))
  }
  // ไทร: รากอากาศห้อยจากกิ่งใหญ่ลงดิน (ขั้น 3+)
  if (species.aerialRoots && visualLevel >= 3) branches.push(...aerialRoots(branches, formInput))

  return assembleModel({
    branches, leaves, clumps, fruits, flowers, flutterable, crown, species, leafShape, visualLevel, tipDepth: shownDepth,
  })
}

/** รวมผลลัพธ์เป็น TreeModel: เรียงใบหลัง→หน้า (index ใบไหวตามไปด้วย) + คำนวณขอบเขต */
function assembleModel(p: {
  branches: BranchSegment[]
  leaves: TreeLeaf[]
  clumps: TreeClump[]
  fruits: TreeFruit[]
  flowers: TreeFlower[]
  flutterable: number[]
  crown: TreeModel['crown']
  species: Species
  leafShape: LeafShape
  visualLevel: number
  tipDepth: number
}): TreeModel {
  // วาดจากหลังมาหน้า (z น้อย → มาก) ให้ใบด้านหน้าทับด้านหลังถูกลำดับ
  const order = p.leaves.map((_, i) => i).sort((a, b) => p.leaves[a].position[2] - p.leaves[b].position[2])
  const newIndex = new Array<number>(order.length)
  order.forEach((old, i) => { newIndex[old] = i })
  const leaves = order.map((i) => p.leaves[i])
  const flutterable = p.flutterable.map((i) => newIndex[i])

  let minX = 0, maxX = 0, maxY = 0
  for (const b of p.branches) {
    minX = Math.min(minX, b.end[0]); maxX = Math.max(maxX, b.end[0]); maxY = Math.max(maxY, b.end[1])
  }
  for (const l of leaves) {
    minX = Math.min(minX, l.position[0] - l.length); maxX = Math.max(maxX, l.position[0] + l.length)
    maxY = Math.max(maxY, l.position[1] + l.length)
  }

  return {
    branches: p.branches,
    leaves,
    flowers: p.flowers,
    fruits: p.fruits,
    speciesName: p.species.name,
    bark: p.species.bark ?? 'plain',
    clumps: p.clumps,
    flutterable,
    leafShape: p.leafShape,
    trunkColor: p.species.trunkColor,
    growth: GROWTH_BY_VISUAL_LEVEL[p.visualLevel - 1],
    visualLevel: p.visualLevel,
    tipDepth: p.tipDepth,
    crown: p.crown,
    bounds: { minX, maxX, maxY },
  }
}

/** วงรีทรงพุ่มที่ครอบปลายกิ่งทั้งหมด (+ขอบเผื่อเล็กน้อย) — กว้าง = ช่วง x ของปลายกิ่ง,
 *  สูง = จากโคนกิ่งชั้นใบที่ต่ำสุดถึงปลายกิ่งที่สูงสุด */
function crownEllipse(leafBranches: BranchSegment[]) {
  let minX = Infinity, maxX = -Infinity, top = -Infinity, bottom = Infinity
  for (const b of leafBranches) {
    minX = Math.min(minX, b.end[0]); maxX = Math.max(maxX, b.end[0])
    top = Math.max(top, b.end[1]); bottom = Math.min(bottom, b.start[1], b.end[1])
  }
  const rx = Math.max(0.6, ((maxX - minX) / 2) * 1.08 + 0.3)
  const ry = Math.max(0.6, ((top - bottom) / 2) * 1.05 + 0.3)
  return { cx: (minX + maxX) / 2, cy: (top + bottom) / 2, rx, ry }
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
