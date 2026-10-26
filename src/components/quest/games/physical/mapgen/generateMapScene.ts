import { mulberry32 } from '../../../../../utils/seededRandom'
import { footprintOf, groundYOf, type Circle, type GateStyle, type MushroomKind, type SceneryObject, type TreeSpecies } from '../../../../scenery/sceneryShapes'
import { catmullRom, cumulativeLengths, nearestIndex, PathField, pointAtLength, type PathStroke, type Vec2 } from './geometry'

/*============================================================================*\
  generateMapScene — สร้างแผนที่ 9 (ป่าเห็ดมหัศจรรย์) ทั้งใบจาก seed (ฟังก์ชันล้วน ไม่แตะ canvas)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ] โลกจัตุรัส 3200×3200 หน่วย (เดิม 1600 — ขยาย 2 เท่าทั้งสองแกน แผนที่บนจอเป็น 2048px
  ลากเลื่อนได้ทั้งซ้าย-ขวา ขึ้น-ลง · ของแต่ละชิ้นขนาดเท่าเดิม แผนที่จึงมีพื้นที่/รายละเอียดเพิ่มขึ้น 4 เท่า)
  แปลงเป็น % ของแผนที่ = หาร 32
  - ทางหลักโค้ง Catmull-Rom ผ่านจุดควบคุม + สุ่มเบี่ยงเล็กน้อย · ประตูเริ่มซ้ายล่าง → ประตูเส้นชัย + หีบขวาบน
  - ทางแยก 5 สาย (ตกแต่ง — ผู้เล่นเดินเฉพาะทางหลัก): ทางตันไปลานเห็ดวงแหวนนางฟ้า / ทางวนรอบเกาะ
    เห็ดสีรุ้งยักษ์แล้วบรรจบทางหลัก / ทางสั้นไปถ้ำคริสตัล / ทางไปปราสาทหิน / ทางเข้าป่าพิศวง
    — ปลายทางแยกมี id ไว้ใส่รางวัลภายหลัง · จุดเด่นที่มีชื่อ (label) แสดงเป็นป้ายบนแผนที่
  - วางของด้วย "รอยเท้า" จริงของแต่ละชิ้น (sceneryShapes) เทียบระยะถึงขอบทางทุกสาย — ไม่มีอะไรทับทาง
    และไม่มีอะไรอยู่ในลานโล่งของประตู/หีบ/จุดเด่น
  - seed เดิม = ฉากเดิมเป๊ะทุกครั้ง
  generateMapRoute เบามาก (ไม่มีการวางของ) — ใช้หาพิกัดเส้นทางให้นกฮูก/จุด/หีบตอนโหลดหน้า
\*============================================================================*/

export const MAP_WORLD = 3200
/** seed ของแผนที่ 9 ที่ใช้จริงในเกม — เปลี่ยนเลขนี้ = แผนที่หน้าตาใหม่ทั้งใบ (เส้นทางด้วย) */
export const MUSHROOM_FOREST_SEED = 777
/** จุดหมายเลขบนเส้นทาง 1-7 (หีบที่เส้นชัยเป็นจุดที่ 8) */
export const MILESTONE_COUNT = 7

export type BranchKind = 'dead-end' | 'loop' | 'spur'
export type FeatureKind = 'grove' | 'island' | 'crystal-nook' | 'castle' | 'mystic' | 'gate' | 'chest'

export interface SceneBranch extends PathStroke {
  id: string
  kind: BranchKind
  /** id ของจุดเด่นที่ทางแยกนี้พาไป (ไว้ผูกรางวัลภายหลัง) */
  endId: string
  /** จุดที่ทางแยกต่อกับทางหลัก (ทางวน = 2 จุด) */
  junctions: Vec2[]
}

/** label = ชื่อสถานที่ที่แสดงเป็นป้ายบนแผนที่ (ไม่มี = ไม่แสดง) */
export interface SceneFeature { id: string; kind: FeatureKind; x: number; y: number; r: number; label?: string }

export interface SceneRoute {
  /** polyline ทางที่ผู้เล่นเดิน จากประตูเริ่ม → หีบ */
  points: Vec2[]
  cum: number[]
  length: number
  start: Vec2
  goal: Vec2
  /** จุดหมายเลข 1-7 แบ่งระยะทางเท่าๆ กัน (ระยะ i/8 ของทาง) */
  milestones: Vec2[]
}

export interface SceneGate { id: string; x: number; y: number; style: GateStyle }

export interface MapRouteLayout {
  seed: number
  world: number
  main: PathStroke
  branches: SceneBranch[]
  route: SceneRoute
  features: SceneFeature[]
  gates: SceneGate[]
}

export interface SceneFlower { x: number; y: number; r: number; color: number }

export interface MapScene extends MapRouteLayout {
  /** ฉากประกอบเรียงลำดับการวาดแล้ว (ไกล → ใกล้) รวมประตูทั้งสอง */
  objects: SceneryObject[]
  tufts: Vec2[]
  flowers: SceneFlower[]
  fireflies: Circle[]
}

export interface MapSceneOptions {
  /** ความหนาแน่นของป่า 0.6-1.4 (ค่าเริ่ม 1) */
  forestDensity?: number
  /** ปริมาณเห็ดริมทาง 0-1 (ค่าเริ่ม 0.6) */
  mushroomAmount?: number
  /** ปริมาณคริสตัลกระจาย 0-1 (ค่าเริ่ม 0.3) */
  crystalAmount?: number
}

const MAIN_HALF_WIDTH = 34
/** ระยะเผื่อขั้นต่ำระหว่างขอบของกับขอบทาง */
const PATH_MARGIN = 6
const MUSHROOM_KINDS: MushroomKind[] = ['red', 'orange', 'purple', 'blue', 'pink']

/** สัดส่วนสายพันธุ์ต้นไม้ตามโซน — สนริมขอบโลก · ต้นดอกรอบลานเห็ด/เกาะสีรุ้ง · กิ่งห้อยใกล้ซอกคริสตัล */
const ZONE_MIX: Record<'grove' | 'island' | 'nook' | 'mystic' | 'castle' | 'edge' | 'forest', [TreeSpecies, number][]> = {
  grove: [['blossom', 0.6], ['oak', 0.25], ['birch', 0.15]],
  island: [['blossom', 0.4], ['weeping', 0.3], ['oak', 0.3]],
  nook: [['weeping', 0.45], ['fir', 0.3], ['birch', 0.25]],
  /** ป่าพิศวง: กิ่งห้อย + สนทึบ แซมต้นดอก */
  mystic: [['weeping', 0.5], ['fir', 0.35], ['blossom', 0.15]],
  castle: [['oak', 0.45], ['fir', 0.35], ['birch', 0.2]],
  edge: [['fir', 0.65], ['birch', 0.2], ['oak', 0.15]],
  forest: [['oak', 0.4], ['weeping', 0.2], ['birch', 0.2], ['fir', 0.1], ['blossom', 0.1]],
}
const ZONE_EDGE = 190
/** กอคริสตัลรอบถ้ำคริสตัล [dx, dy, r] จากกลางจุดเด่น — ชั้นแสงกะพริบบนแผนที่ (MapLandmarks) ใช้ตำแหน่งเดียวกัน */
export const NOOK_CRYSTALS = [[-170, 50, 46], [130, -60, 44], [-60, 120, 40], [140, 60, 36], [-190, -70, 36], [20, -170, 32]] as const
/** รัศมีโซนป่าพิศวง (ต้นไม้มืด เห็ดเรืองแสง หมอกม่วง) */
export const MYSTIC_ZONE = 360


export function generateMapRoute(seed: number): MapRouteLayout {
  const rnd = mulberry32(seed)
  const J = (v: number, a: number) => v + (rnd() - 0.5) * 2 * a
  // ทางหลักไหลจากบนขวา (เลยประตูเส้นชัยออกขอบบน) คดเคี้ยวลงมาถึงประตูเริ่มซ้ายล่าง (เลยขอบล่าง)
  const mainCtl: Vec2[] = [
    [2400, 0], [2400, 610], [J(2380, 24), J(820, 30)], [J(2180, 50), J(840, 36)], [J(1800, 50), J(860, 50)],
    [J(1440, 50), J(800, 44)], [J(1120, 50), J(900, 40)], [J(940, 50), J(1160, 50)], [J(1080, 50), J(1400, 40)],
    [J(1520, 50), J(1500, 44)], [J(1920, 50), J(1580, 44)], [J(2260, 44), J(1800, 50)], [J(2180, 44), J(2080, 44)],
    [J(1800, 50), J(2200, 44)], [J(1400, 50), J(2260, 40)], [J(1080, 50), J(2460, 40)], [J(940, 36), J(2680, 40)],
    [800, 2880], [800, 3240],
  ]
  const main = catmullRom(mainCtl, 28)
  const onMain = (x: number, y: number): Vec2 => main[nearestIndex(main, x, y)]
  const a1 = onMain(1440, 800), a2 = onMain(1920, 1580), e2 = onMain(2180, 2090), a3 = onMain(1400, 2260)
  const a4 = onMain(2000, 2140), a5 = onMain(940, 1160)
  const branch = (pts: Vec2[]) => catmullRom(pts, 20)

  const branches: SceneBranch[] = [
    {
      id: 'grove-trail', kind: 'dead-end', endId: 'mushroom-grove', halfWidth: 25, junctions: [a1],
      points: branch([a1, [J(1310, 20), J(650, 20)], [J(1170, 20), J(544, 20)], [J(1040, 20), J(476, 20)], [940, 410]]),
    },
    {
      id: 'island-loop', kind: 'loop', endId: 'rainbow-island', halfWidth: 25, junctions: [a2, e2],
      points: branch([
        a2, [J(2240, 16), J(1380, 16)], [J(2580, 16), J(1400, 16)], [J(2800, 16), J(1630, 16)], [J(2780, 16), J(1930, 16)],
        [J(2570, 16), J(2130, 16)], [J(2360, 16), J(2170, 14)], e2,
      ]),
    },
    {
      id: 'crystal-spur', kind: 'spur', endId: 'crystal-nook', halfWidth: 24, junctions: [a3],
      points: branch([a3, [J(1180, 16), J(2164, 16)], [J(940, 16), J(2176, 16)], [J(730, 16), J(2136, 16)], [580, 2110]]),
    },
    {
      // [ใหม่] ทางไปปราสาทหิน — อ้อมลงใต้แล้วเลี้ยวเข้าหน้าประตูปราสาท (ขวาล่าง)
      id: 'castle-road', kind: 'dead-end', endId: 'stone-castle', halfWidth: 26, junctions: [a4],
      points: branch([a4, [J(2080, 16), J(2360, 16)], [J(2160, 16), J(2620, 16)], [J(2300, 16), J(2830, 16)], [2470, 2905], [2600, 2890]]),
    },
    {
      // [ใหม่] ทางเข้าป่าพิศวง (ซ้ายกลาง)
      id: 'mystic-trail', kind: 'dead-end', endId: 'mystic-forest', halfWidth: 22, junctions: [a5],
      points: branch([a5, [J(760, 16), J(1240, 16)], [J(610, 16), J(1320, 16)], [J(490, 16), J(1400, 16)], [420, 1460]]),
    },
  ]

  // ทางที่ผู้เล่นเดิน: จากกลางประตูเริ่ม (ซ้ายล่าง) ไปจบหน้าซุ้มประตูเส้นชัย (ขวาบน) ที่หีบตั้งอยู่
  const iGoal = nearestIndex(main, 2400, 650), iStart = nearestIndex(main, 800, 2895)
  const points = main.slice(iGoal, iStart + 1).reverse()
  const cum = cumulativeLengths(points)
  const length = cum[cum.length - 1]
  const milestones = Array.from({ length: MILESTONE_COUNT }, (_, i) => pointAtLength(points, cum, (length * (i + 1)) / (MILESTONE_COUNT + 1)))
  const route: SceneRoute = { points, cum, length, start: points[0], goal: points[points.length - 1], milestones }

  const features: SceneFeature[] = [
    { id: 'mushroom-grove', kind: 'grove', x: 940, y: 400, r: 150, label: 'ลานเห็ดนางฟ้า' },
    { id: 'rainbow-island', kind: 'island', x: 2530, y: 1760, r: 150, label: 'เกาะเห็ดสีรุ้ง' },
    { id: 'crystal-nook', kind: 'crystal-nook', x: 420, y: 2040, r: 170, label: 'ถ้ำคริสตัล' },
    { id: 'stone-castle', kind: 'castle', x: 2600, y: 2600, r: 250, label: 'ปราสาทหิน' },
    { id: 'mystic-forest', kind: 'mystic', x: 360, y: 1550, r: 110, label: 'ป่าพิศวง' },
    { id: 'goal-gate', kind: 'gate', x: 2400, y: 505, r: 185 },
    { id: 'start-gate', kind: 'gate', x: 800, y: 2900, r: 175 },
    { id: 'goal-chest', kind: 'chest', x: route.goal[0], y: route.goal[1], r: 60 },
  ]
  const gates: SceneGate[] = [
    { id: 'goal-gate', x: 2400, y: 610, style: 'stone' },
    { id: 'start-gate', x: 800, y: 3000, style: 'wood' },
  ]
  return { seed, world: MAP_WORLD, main: { points: main, halfWidth: MAIN_HALF_WIDTH }, branches, route, features, gates }
}

/** ลานโล่งของประตู/หีบห้ามมีอะไรล้ำเลย · ลานจุดเด่นยอมให้ขอบพุ่มล้ำได้ครึ่งรัศมี (ยกเว้นของประจำลานนั้น) */
export function clearingAllows(f: SceneFeature, c: Circle, ownFeatureId?: string): boolean {
  if (f.id === ownFeatureId) return true
  const strict = f.kind === 'gate' || f.kind === 'chest'
  return Math.hypot(c.x - f.x, c.y - f.y) >= f.r + c.r * (strict ? 1 : 0.5)
}

/** ตารางช่องเก็บของที่วางแล้ว — เช็คชนเฉพาะช่องรอบๆ (ระยะสนใจไม่เกิน CELL) */
class Occupancy {
  private static readonly CELL = 128
  private readonly cells = new Map<number, Circle[]>()
  private key(gx: number, gy: number) { return gx * 4096 + gy }
  add(c: Circle) {
    const k = this.key(Math.floor(c.x / Occupancy.CELL), Math.floor(c.y / Occupancy.CELL))
    const list = this.cells.get(k)
    if (list) list.push(c)
    else this.cells.set(k, [c])
  }
  /** ไม่มีชิ้นไหนใกล้กว่า (r + o.r) × spacing */
  isFree(x: number, y: number, r: number, spacing: number): boolean {
    const gx = Math.floor(x / Occupancy.CELL), gy = Math.floor(y / Occupancy.CELL)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const o of this.cells.get(this.key(gx + dx, gy + dy)) ?? []) {
          if (Math.hypot(o.x - x, o.y - y) < (o.r + r) * spacing) return false
        }
      }
    }
    return true
  }
}

export function generateMapScene(seed: number, options: MapSceneOptions = {}): MapScene {
  const density = options.forestDensity ?? 1
  const mush = options.mushroomAmount ?? 0.6
  const crys = options.crystalAmount ?? 0.3
  const layout = generateMapRoute(seed)
  const W = layout.world
  // ตัวสุ่มของการวางของแยกจากตัวสุ่มเส้นทาง → ปรับปริมาณของไม่ทำให้เส้นทางเปลี่ยน
  const rnd = mulberry32((seed ^ 0x5bd1e995) >>> 0)
  const subSeed = () => Math.floor(rnd() * 1e9)
  const strokes: PathStroke[] = [layout.main, ...layout.branches]
  const field = new PathField(strokes, W)
  const occ = new Occupancy()
  const objects: SceneryObject[] = []

  const fits = (o: SceneryObject, ownFeatureId?: string) => {
    const fp = footprintOf(o)
    return fp.every((c) => field.clearance(c.x, c.y) >= c.r + PATH_MARGIN)
      && layout.features.every((f) => fp.every((c) => clearingAllows(f, c, ownFeatureId)))
  }
  /** วางถ้าไม่ทับทาง/ลานโล่ง/ของอื่น — คืน true เมื่อวางได้ */
  const place = (o: Exclude<SceneryObject, { type: 'gate' }>, spacing: number, ownFeatureId?: string): boolean => {
    // ชิ้นใหญ่ (ปราสาท/ถ้ำ) กันชนด้วยรอยเท้าทุกวง ไม่ใช่วงเดียวที่จุดอ้างอิง
    const zones: Circle[] = o.type === 'castle' || o.type === 'cave'
      ? footprintOf(o)
      : [{ x: o.x, y: o.y, r: o.type === 'mushroom' ? o.size * 0.6 : o.type === 'crystal' ? o.r * 0.9 : o.r }]
    if (!zones.every((z) => occ.isFree(z.x, z.y, z.r, spacing)) || !fits(o, ownFeatureId)) return false
    objects.push(o)
    for (const z of zones) occ.add(z)
    return true
  }
  const mushroom = (x: number, y: number, size: number, kind: MushroomKind, featureId?: string) =>
    place({ type: 'mushroom', x, y, size, kind, ...(featureId ? { featureId } : {}) }, 0.62, featureId)
  const pickKind = () => MUSHROOM_KINDS[Math.floor(rnd() * MUSHROOM_KINDS.length)]

  // ── ลานเห็ด: วงแหวนนางฟ้า 12 ดอก + เห็ดสีรุ้งกลางวง ──
  const grove = layout.features.find((f) => f.id === 'mushroom-grove')!
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rnd() * 0.2, R = 92 + rnd() * 10
    mushroom(grove.x + Math.cos(a) * R, grove.y + Math.sin(a) * R * 0.8, 24 + rnd() * 12, pickKind(), grove.id)
  }
  mushroom(grove.x - 40, grove.y - 40, 46, 'rainbow', grove.id)

  // ── เกาะกลางทางวน: เห็ดสีรุ้งยักษ์ใหญ่ที่สุดที่ยังไม่ล้ำทาง + เห็ดบริวาร ──
  const island = layout.features.find((f) => f.id === 'rainbow-island')!
  let best: { x: number; y: number; size: number } | null = null
  for (let dx = -70; dx <= 70; dx += 14) {
    for (let dy = -70; dy <= 70; dy += 14) {
      const x = island.x + 7 + dx, y = island.y + 25 + dy
      for (let size = 88; size >= 44; size -= 4) {
        if (!fits({ type: 'mushroom', x, y, size, kind: 'rainbow' }, island.id)) continue
        if (!best || size > best.size) best = { x, y, size }
        break
      }
    }
  }
  if (best) mushroom(best.x, best.y, best.size, 'rainbow', island.id)
  const friends: [number, number, number, MushroomKind][] = [[-40, -45, 36, 'red'], [75, -30, 40, 'purple'], [-43, 95, 32, 'blue'], [70, 95, 30, 'pink'], [25, -90, 28, 'orange']]
  for (const [dx, dy, s, kind] of friends) mushroom(island.x + dx, island.y + dy, s + rnd() * 6, kind, island.id)

  // ── เห็ดเป็นกลุ่มริมทางหลัก ──
  const main = layout.main.points
  main.forEach((p, idx) => {
    if (idx % 11 !== 0 || rnd() > mush * 0.75) return
    const side = rnd() < 0.5 ? -1 : 1
    const nxt = main[Math.min(idx + 1, main.length - 1)]
    const ang = Math.atan2(nxt[1] - p[1], nxt[0] - p[0]) + (side * Math.PI) / 2
    const off = MAIN_HALF_WIDTH + 30 + rnd() * 34
    const n = 2 + Math.floor(rnd() * 3)
    for (let j = 0; j < n; j++) {
      const d = off + rnd() * 30
      mushroom(p[0] + Math.cos(ang) * d + (rnd() - 0.5) * 40, p[1] + Math.sin(ang) * d + (rnd() - 0.5) * 40, 16 + rnd() * 18, pickKind())
    }
  })
  for (let t = 0; t < Math.round(640 * mush); t++) mushroom(rnd() * W, rnd() * W, 16 + rnd() * 22, pickKind())

  /** หาจุดวางชิ้นใหญ่ใกล้ (tx, ty) ที่ไม่ทับทาง — ไล่จากจุดเป้าออกไปทีละวง */
  const placeNear = (make: (x: number, y: number) => Exclude<SceneryObject, { type: 'gate' }>, tx: number, ty: number, ownFeatureId: string, reach = 220) => {
    for (let d = 0; d <= reach; d += 12) {
      const n = d === 0 ? 1 : Math.ceil((d * Math.PI * 2) / 24)
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2
        if (place(make(tx + Math.cos(a) * d, ty + Math.sin(a) * d * 0.7), 0.5, ownFeatureId)) return true
      }
    }
    return false
  }

  // ── [ใหม่] ปราสาทหิน: หน้าประตูหันลงหาปลายทางแยก ──
  const castle = layout.features.find((f) => f.id === 'stone-castle')!
  placeNear((x, y) => ({ type: 'castle', x, y, seed: subSeed(), featureId: castle.id }), castle.x, castle.y + 160, castle.id)

  // ── คริสตัล: ถ้ำคริสตัล (เนินหินปากถ้ำเรืองแสง) + กอใหญ่รอบปากถ้ำ + กระจายในป่า ──
  const nook = layout.features.find((f) => f.id === 'crystal-nook')!
  placeNear((x, y) => ({ type: 'cave', x, y, r: 110, seed: subSeed(), featureId: nook.id }), nook.x - 30, nook.y - 20, nook.id)
  for (const [dx, dy, r] of NOOK_CRYSTALS) {
    place({ type: 'crystal', x: nook.x + dx, y: nook.y + dy, r, seed: subSeed(), featureId: nook.id }, 0.58, nook.id)
  }
  const crystalTarget = 6 + Math.round(crys * 40)
  for (let t = 0, placed = 0; t < 1600 && placed < crystalTarget - 6; t++) {
    if (place({ type: 'crystal', x: rnd() * W, y: rnd() * W, r: 50 + rnd() * 14, seed: subSeed() }, 0.58)) placed++
  }

  // ── [ใหม่] ป่าพิศวง: วงเห็ดเรืองแสงฟ้า/ม่วง + คริสตัลเล็กกลางวง + เห็ดเรืองแสงกระจายทั่วโซน ──
  const mystic = layout.features.find((f) => f.id === 'mystic-forest')!
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rnd() * 0.3, R = 70 + rnd() * 14
    mushroom(mystic.x + Math.cos(a) * R, mystic.y + Math.sin(a) * R * 0.75, 22 + rnd() * 12, rnd() < 0.5 ? 'blue' : 'purple', mystic.id)
  }
  place({ type: 'crystal', x: mystic.x, y: mystic.y + 10, r: 34, seed: subSeed(), featureId: mystic.id }, 0.58, mystic.id)
  for (let t = 0; t < 90; t++) {
    const a = rnd() * Math.PI * 2, d = 120 + rnd() * (MYSTIC_ZONE - 60)
    mushroom(mystic.x + Math.cos(a) * d, mystic.y + Math.sin(a) * d, 14 + rnd() * 20, rnd() < 0.55 ? 'blue' : 'purple')
  }

  // ── ต้นไม้/พุ่มเติมพื้นที่ที่เหลือ (ใหญ่ก่อน เล็กแทรกช่องว่าง) — สายพันธุ์ตามโซน · ขอบบนไกลกว่า ──
  const zoneOf = (x: number, y: number): keyof typeof ZONE_MIX => {
    const near = (id: string, d: number) => { const f = layout.features.find((q) => q.id === id)!; return Math.hypot(x - f.x, y - f.y) < d }
    if (near('mushroom-grove', 330)) return 'grove'
    if (near('rainbow-island', 280)) return 'island'
    if (near('crystal-nook', 340)) return 'nook'
    if (near('mystic-forest', MYSTIC_ZONE)) return 'mystic'
    if (near('stone-castle', 420)) return 'castle'
    if (Math.min(x, y, W - x, W - y) < ZONE_EDGE) return 'edge'
    return 'forest'
  }
  const pickSpecies = (x: number, y: number): TreeSpecies => {
    const mix = ZONE_MIX[zoneOf(x, y)]
    let u = rnd()
    for (const [sp, w] of mix) { if ((u -= w) < 0) return sp }
    return mix[0][0]
  }
  const depthAt = (y: number) => Math.max(0, Math.min(1, 1 - y / W)) * 0.6
  const fill = (type: 'tree' | 'bush', r: number, tries: number) => {
    for (let t = 0; t < tries; t++) {
      const x = -20 + rnd() * (W + 40), y = -20 + rnd() * (W + 40)
      const variant = rnd(), seed = subSeed()
      const o: Exclude<SceneryObject, { type: 'gate' }> = type === 'tree'
        ? { type, x, y, r, species: pickSpecies(x, y), seed, depth: depthAt(y) }
        : { type, x, y, r, tone: Math.floor(variant * 3), seed, depth: depthAt(y) }
      place(o, 0.58)
    }
  }
  // พื้นที่โลก 4 เท่าของเดิม → จำนวนครั้งที่ลองวาง 4 เท่า
  fill('tree', 84, Math.round(8800 * density))
  fill('tree', 64, Math.round(12800 * density))
  fill('bush', 44, Math.round(15200 * density))
  fill('bush', 30, Math.round(16800 * density))

  for (const g of layout.gates) objects.push({ type: 'gate', x: g.x, y: g.y, style: g.style, id: g.id })
  objects.sort((a, b) => groundYOf(a) - groundYOf(b))

  // ── รายละเอียดพื้น: กอหญ้า (ใต้ทาง ทางวาดทับ) · ดอกไม้ริมทาง · หิ่งห้อย ──
  const tufts: Vec2[] = Array.from({ length: 3600 }, () => [rnd() * W, rnd() * W])
  const flowers: SceneFlower[] = []
  const strict = layout.features.filter((f) => f.kind === 'gate' || f.kind === 'chest')
  for (let i = 0; i < 1400; i++) {
    const s = strokes[Math.floor(rnd() * strokes.length)]
    const q = s.points[Math.floor(rnd() * s.points.length)]
    const a = rnd() * Math.PI * 2, d = s.halfWidth + 10 + rnd() * 80
    const f: SceneFlower = { x: q[0] + Math.cos(a) * d, y: q[1] + Math.sin(a) * d, r: 2.2 + rnd() * 1.6, color: rnd() }
    if (field.clearance(f.x, f.y) < f.r + 2 || strict.some((c) => !clearingAllows(c, f))) continue
    flowers.push(f)
  }
  const fireflies: Circle[] = Array.from({ length: 240 }, () => {
    const s = strokes[Math.floor(rnd() * strokes.length)]
    const q = s.points[Math.floor(rnd() * s.points.length)]
    return { x: q[0] + (rnd() - 0.5) * 260, y: q[1] + (rnd() - 0.5) * 200, r: 10 + rnd() * 8 }
  })
  // ป่าพิศวงมีหิ่งห้อยหนาแน่นกว่าที่อื่น
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * MYSTIC_ZONE
    fireflies.push({ x: mystic.x + Math.cos(a) * d, y: mystic.y + Math.sin(a) * d, r: 9 + rnd() * 9 })
  }

  return { ...layout, objects, tufts, flowers, fireflies }
}
