import { describe, expect, it } from 'vitest'
import { buildTreeModel } from '../buildTreeModel'

const base = { mbtiType: 'INFJ' as const, leafFlowerLevel: 50 }

describe('buildTreeModel', () => {
  it('is deterministic for the same progress', () => {
    expect(buildTreeModel({ ...base, trunkBranchLevel: 60 })).toEqual(buildTreeModel({ ...base, trunkBranchLevel: 60 }))
  })

  it('gives young trees (game level 1-20) a few young leaves, growing with the level, and no flowers', () => {
    const lv1 = buildTreeModel({ ...base, trunkBranchLevel: 1, leafFlowerLevel: 100 })
    const lv20 = buildTreeModel({ ...base, trunkBranchLevel: 20, leafFlowerLevel: 100 })
    const lv21 = buildTreeModel({ ...base, trunkBranchLevel: 21, leafFlowerLevel: 100 })
    expect(lv1.leaves.length).toBeGreaterThan(0)
    expect(lv1.leaves.length).toBeLessThan(lv20.leaves.length)
    expect(lv20.leaves.length).toBeLessThan(lv21.leaves.length) // เลเวล 21 = ใบเต็มตามเกณฑ์เดิม
    expect(lv1.flowers).toHaveLength(0)
    expect(lv20.flowers).toHaveLength(0)
  })

  it('grows the same tree as the level rises (young tree = inner branches of the grown tree, thinner)', () => {
    const young = buildTreeModel({ ...base, trunkBranchLevel: 25 })
    const grown = buildTreeModel({ ...base, trunkBranchLevel: 130 })
    expect(young.growth).toBeLessThan(grown.growth)
    expect(young.branches.length).toBeLessThan(grown.branches.length)
    const key = (b: { start: number[]; end: number[] }) => `${b.start.join()}|${b.end.join()}`
    const grownKeys = new Set(grown.branches.map(key))
    for (const b of young.branches) expect(grownKeys.has(key(b))).toBe(true)
    expect(young.branches[0].radiusStart).toBeLessThan(grown.branches[0].radiusStart)
  })

  it('makes every visual stage visibly different: taller, thicker trunk, more branches/leaves', () => {
    const stages = [5, 15, 30, 50, 70, 90, 110, 130].map((lv) => buildTreeModel({ ...base, trunkBranchLevel: lv }))
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].visualLevel).toBe(i + 1)
      expect(stages[i].growth).toBeGreaterThan(stages[i - 1].growth)
      expect(stages[i].branches[0].radiusStart).toBeGreaterThan(stages[i - 1].branches[0].radiusStart)
      expect(stages[i].leaves.length + stages[i].branches.length).toBeGreaterThan(stages[i - 1].leaves.length + stages[i - 1].branches.length)
    }
  })

  it('gives all 16 MBTI types their own look (no two identical trees)', () => {
    const types = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'] as const
    const signatures = types.map((mbtiType) => {
      const m = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 130 })
      return `${m.branches.length}:${m.bounds.maxX.toFixed(2)}:${m.bounds.maxY.toFixed(2)}:${m.leafShape}`
    })
    expect(new Set(signatures).size).toBe(16)
  })

  it('lets only some leaves flutter (seedling: all, grown tree: outer front leaves only)', () => {
    const seedling = buildTreeModel({ ...base, trunkBranchLevel: 5 })
    const grown = buildTreeModel({ ...base, trunkBranchLevel: 130 })
    expect(seedling.flutterable).toHaveLength(seedling.leaves.length)
    expect(grown.flutterable.length).toBeGreaterThan(0)
    expect(grown.flutterable.length).toBeLessThan(grown.leaves.length)
  })

  it('shows more flowers for a higher mental-health level, none at level 0', () => {
    const none = buildTreeModel({ ...base, trunkBranchLevel: 130, leafFlowerLevel: 0 })
    const many = buildTreeModel({ ...base, trunkBranchLevel: 130, leafFlowerLevel: 100 })
    expect(none.flowers).toHaveLength(0)
    expect(many.flowers.length).toBeGreaterThan(0)
  })

  it('uses fewer leaves in compact (small-screen) mode', () => {
    const full = buildTreeModel({ ...base, trunkBranchLevel: 130 })
    const compact = buildTreeModel({ ...base, trunkBranchLevel: 130, compact: true })
    expect(compact.leaves.length).toBeLessThan(full.leaves.length)
    expect(compact.leaves.length).toBeLessThanOrEqual(3500 + 400)
  })

  it('gives different MBTI groups different silhouettes', () => {
    const nt = buildTreeModel({ ...base, mbtiType: 'INTJ', trunkBranchLevel: 130 })
    const sp = buildTreeModel({ ...base, mbtiType: 'ESTP', trunkBranchLevel: 130 })
    const width = (m: typeof nt) => m.bounds.maxX - m.bounds.minX
    expect(width(nt) / nt.bounds.maxY).not.toBeCloseTo(width(sp) / sp.bounds.maxY, 1)
  })

  it('keeps every leaf inside the crown ellipse for round-crowned broadleaf species', () => {
    for (const mbtiType of ['ESFJ', 'ISFJ', 'ENTJ', 'ESFP'] as const) { // ซากุระ (INFJ) ตั้งใจให้กลุ่มดอกฟูเลยขอบนิดๆ
      const m = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 130 })
      for (const l of m.leaves) {
        const e = ((l.position[0] - m.crown.cx) / m.crown.rx) ** 2 + ((l.position[1] - m.crown.cy) / m.crown.ry) ** 2
        expect(e).toBeLessThanOrEqual(1)
      }
    }
  })

  it('gives each MBTI its signature tree species and features', () => {
    const grown = (mbtiType: Parameters<typeof buildTreeModel>[0]['mbtiType']) =>
      buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 130, leafFlowerLevel: 100 })
    expect(grown('INFP').speciesName).toBe('ต้นหลิว')
    expect(grown('ENFJ').leafShape).toBe('maple')
    expect(grown('INTP').leafShape).toBe('fan')
    expect(grown('ENTJ').leafShape).toBe('oak')
    expect(grown('ISFJ').fruits.length).toBeGreaterThan(0) // แอปเปิล
    expect(grown('ESFP').fruits.length).toBeGreaterThan(0) // ส้ม
    expect(grown('ESFJ').flowers.every((f) => f.kind === 'magnolia')).toBe(true)
    expect(grown('ISFP').bark).toBe('birch')
    expect(grown('ISTP').bark).toBe('bamboo')
    expect(grown('ESTP').bark).toBe('palm')
    // ไทร: รากอากาศลงถึงพื้น / หลิว: เส้นกิ่งห้อยลงต่ำกว่าพุ่ม
    expect(grown('ENTP').branches.some((b) => b.end[1] === 0 && b.depth === 3)).toBe(true)
    const willow = grown('INFP')
    expect(willow.leaves.some((l) => l.position[1] < willow.crown.cy - willow.crown.ry)).toBe(true)
    // สน: ไซเปรสสูงเรียว / สปรูซเป็นกรวยกว้างกว่า
    const cypress = grown('INTJ'), spruce = grown('ISTJ')
    expect(cypress.crown.ry / cypress.crown.rx).toBeGreaterThan(spruce.crown.ry / spruce.crown.rx)
  })

  it('grows special forms with the level too (palm / bamboo / spruce)', () => {
    for (const mbtiType of ['ESTP', 'ISTP', 'ISTJ'] as const) {
      const young = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 5 })
      const grown = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 130 })
      expect(grown.growth).toBeGreaterThan(young.growth)
      expect(grown.leaves.length).toBeGreaterThan(young.leaves.length)
      expect(grown.branches.length).toBeGreaterThanOrEqual(young.branches.length)
    }
  })
})
