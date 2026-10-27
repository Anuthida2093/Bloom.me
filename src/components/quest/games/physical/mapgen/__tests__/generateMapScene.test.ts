import { describe, expect, it } from 'vitest'
import { footprintOf, gatePillarRects } from '../../../../../scenery/sceneryShapes'
import { JOURNEY_MAPS } from '../../../../../../config/journeyMaps'
import { MAP_PATH_POINTS, markerWaypoints, samplePath } from '../../journeyPathMath'
import { distToPolyline, exactPathClearance } from '../geometry'
import { clearingAllows, generateMapRoute, generateMapScene, MAP_WORLD, MILESTONE_COUNT, MUSHROOM_FOREST_SEED } from '../generateMapScene'
import { sceneToPathPoints } from '../sceneRoute'

const SEEDS = [MUSHROOM_FOREST_SEED, 1, 42, 2024]

describe('generateMapScene', () => {
  it('seed เดิมได้ฉากเดิมเป๊ะ · seed ต่างได้ฉากต่าง', () => {
    expect(generateMapScene(MUSHROOM_FOREST_SEED)).toEqual(generateMapScene(MUSHROOM_FOREST_SEED))
    expect(generateMapScene(1).objects).not.toEqual(generateMapScene(2).objects)
  })

  it('ปรับปริมาณของไม่ทำให้เส้นทางเปลี่ยน', () => {
    const a = generateMapScene(42), b = generateMapScene(42, { forestDensity: 0.6, mushroomAmount: 0, crystalAmount: 1 })
    expect(b.route).toEqual(a.route)
    expect(b.branches).toEqual(a.branches)
  })

  for (const seed of SEEDS) {
    describe(`seed ${seed}`, () => {
      const scene = generateMapScene(seed)
      const strokes = [scene.main, ...scene.branches]
      const placed = scene.objects.filter((o) => o.type !== 'gate')

      it('มีของครบทุกชนิด (เห็ด 6 แบบ คริสตัล ต้นไม้ พุ่ม ปราสาท ถ้ำ ประตู 2 บาน)', () => {
        const kinds = new Set(placed.flatMap((o) => (o.type === 'mushroom' ? [o.kind] : [])))
        expect([...kinds].sort()).toEqual(['blue', 'orange', 'pink', 'purple', 'rainbow', 'red'])
        for (const t of ['tree', 'bush', 'crystal'] as const) expect(placed.some((o) => o.type === t)).toBe(true)
        expect(placed.filter((o) => o.type === 'castle')).toHaveLength(1)
        expect(placed.filter((o) => o.type === 'cave')).toHaveLength(1)
        expect(scene.objects.filter((o) => o.type === 'gate')).toHaveLength(2)
      })

      it('ต้นไม้ครบ 5 สายพันธุ์ จัดตามโซน (สนริมขอบ · ต้นดอกรอบลานเห็ด)', () => {
        const trees = placed.flatMap((o) => (o.type === 'tree' ? [o] : []))
        expect(new Set(trees.map((t) => t.species)).size).toBe(5)
        const grove = scene.features.find((f) => f.id === 'mushroom-grove')!
        const share = (list: typeof trees, sp: string) => list.filter((t) => t.species === sp).length / Math.max(1, list.length)
        const nearGrove = trees.filter((t) => Math.hypot(t.x - grove.x, t.y - grove.y) < 330)
        const edge = trees.filter((t) => Math.min(t.x, t.y, MAP_WORLD - t.x, MAP_WORLD - t.y) < 190 && Math.hypot(t.x - grove.x, t.y - grove.y) >= 330)
        expect(share(nearGrove, 'blossom')).toBeGreaterThan(0.35)
        expect(share(edge, 'fir')).toBeGreaterThan(0.45)
        // ขอบบน (ไกล) สีจางกว่าขอบล่าง
        for (const t of trees) expect(t.depth).toBeCloseTo(Math.max(0, Math.min(1, 1 - t.y / MAP_WORLD)) * 0.6, 6)
      })

      it('ไม่มีของชิ้นไหนทับทาง (วัดจากรอยเท้าจริง รวมหมวกเห็ด)', () => {
        for (const o of placed) {
          for (const c of footprintOf(o)) expect(exactPathClearance(c.x, c.y, strokes)).toBeGreaterThanOrEqual(c.r)
        }
        for (const f of scene.flowers) expect(exactPathClearance(f.x, f.y, strokes)).toBeGreaterThanOrEqual(f.r)
      })

      it('ไม่มีอะไรอยู่ในลานประตู/หีบ และของทั่วไปไม่ล้ำลานจุดเด่น', () => {
        for (const o of placed) {
          const own = o.type === 'mushroom' || o.type === 'crystal' || o.type === 'castle' || o.type === 'cave' ? o.featureId : undefined
          for (const f of scene.features) for (const c of footprintOf(o)) expect(clearingAllows(f, c, own)).toBe(true)
        }
        // ของประจำลาน (featureId) ก็ห้ามล้ำลานประตู/หีบ
        for (const o of placed) {
          for (const f of scene.features.filter((x) => x.kind === 'gate' || x.kind === 'chest')) {
            for (const c of footprintOf(o)) expect(clearingAllows(f, c)).toBe(true)
          }
        }
      })

      it('ทางเดินอยู่ในโลก · เริ่มที่ประตูซ้ายล่าง · จบที่หีบขวาบน', () => {
        for (const [x, y] of scene.route.points) {
          expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(MAP_WORLD)
          expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(MAP_WORLD)
        }
        const [sx, sy] = scene.route.start, [gx, gy] = scene.route.goal
        // จุดควบคุมทางสุ่มเบี่ยงได้ → จุดเริ่ม/จบคลาดจากเป้าได้เล็กน้อย แต่ยังอยู่ในช่องประตู
        expect(Math.hypot(sx - 800, sy - 2895)).toBeLessThan(35)
        expect(Math.hypot(gx - 2400, gy - 650)).toBeLessThan(35)
        const start = scene.gates.find((g) => g.id === 'start-gate')!, goal = scene.gates.find((g) => g.id === 'goal-gate')!
        expect(start.x).toBeLessThan(MAP_WORLD / 2); expect(start.y).toBeGreaterThan(MAP_WORLD / 2)
        expect(goal.x).toBeGreaterThan(MAP_WORLD / 2); expect(goal.y).toBeLessThan(MAP_WORLD / 2)
        // หีบตั้งตรงปลายทางที่ผู้เล่นเดิน
        const chest = scene.features.find((f) => f.kind === 'chest')!
        expect([chest.x, chest.y]).toEqual(scene.route.goal)
      })

      it('ทางแยก 5 สาย ต่อกับทางหลักพอดี และปลายทางแยกมี id ของจุดเด่นที่มีอยู่จริง', () => {
        expect(scene.branches.map((b) => b.kind).sort()).toEqual(['dead-end', 'dead-end', 'dead-end', 'loop', 'spur'])
        for (const b of scene.branches) {
          expect(scene.features.some((f) => f.id === b.endId)).toBe(true)
          for (const [x, y] of b.junctions) expect(distToPolyline(x, y, scene.main.points)).toBeLessThan(0.5)
        }
        const loop = scene.branches.find((b) => b.kind === 'loop')!
        expect(loop.junctions).toHaveLength(2)
        expect(loop.points[loop.points.length - 1]).toEqual(loop.junctions[1])
      })

      it('จุดหมายเลข 7 จุดเรียงตามระยะทาง ไม่ทับเสาประตูหรือหีบ', () => {
        expect(scene.route.milestones).toHaveLength(MILESTONE_COUNT)
        const chest = scene.features.find((f) => f.kind === 'chest')!
        const pillars = scene.gates.flatMap((g) => gatePillarRects(g.x, g.y))
        const DOT = 24 // จุด + ตัวเลข (หน่วยฉาก)
        for (const [x, y] of scene.route.milestones) {
          expect(Math.hypot(x - chest.x, y - chest.y)).toBeGreaterThan(chest.r + DOT)
          for (const [x0, y0, x1, y1] of pillars) {
            const inside = x > x0 - DOT && x < x1 + DOT && y > y0 - DOT && y < y1 + DOT
            expect(inside).toBe(false)
          }
        }
      })
    })
  }
})

describe('แผนที่ 9 ในเกม', () => {
  it('อยู่ในรายการแผนที่เป็นใบที่ 9 และวาดด้วยโค้ด', () => {
    expect(JOURNEY_MAPS).toHaveLength(9)
    const m = JOURNEY_MAPS[8]
    expect(m).toMatchObject({ id: 'mushroom-forest', order: 9, name: 'ป่าเห็ดมหัศจรรย์', generated: { seed: MUSHROOM_FOREST_SEED } })
    expect(markerWaypoints(m)).toHaveLength(MILESTONE_COUNT)
  })

  it('จุดเด่นที่มีชื่อ (ป้ายบนแผนที่) ครบ — ปราสาทหิน ป่าพิศวง ถ้ำคริสตัล', () => {
    const labels = generateMapRoute(MUSHROOM_FOREST_SEED).features.flatMap((f) => (f.label ? [f.label] : []))
    expect(labels).toEqual(expect.arrayContaining(['ปราสาทหิน', 'ป่าพิศวง', 'ถ้ำคริสตัล']))
  })

  it('เส้นโค้งที่เกมคำนวณจากจุดเส้นทาง ทับทางที่วาดจริง (คลาดไม่เกิน 1 หน่วยภาพของแผนที่)', () => {
    const layout = generateMapRoute(MUSHROOM_FOREST_SEED)
    const path = MAP_PATH_POINTS['mushroom-forest']
    expect(path).toEqual(sceneToPathPoints(layout))
    const samples = samplePath({ entryPct: path.start, waypoints: path.points, exitPct: path.end }, 16)
    const toWorld = MAP_WORLD / 100
    let worst = 0
    for (const { pt } of samples) worst = Math.max(worst, distToPolyline(pt.x * toWorld, pt.y * toWorld, layout.route.points))
    expect(worst).toBeLessThan(MAP_WORLD / 1024)
  })
})
