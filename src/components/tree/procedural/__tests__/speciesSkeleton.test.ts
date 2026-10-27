import { describe, expect, it } from 'vitest'
import { buildTreeModel } from '../buildTreeModel'
import { BAMBOO_SKELETON, buildSkeleton, CHERRY_SKELETON, growthOf, HEART_SKELETON, SKELETON_FULL_HEIGHT } from '../speciesSkeleton'

const SEEDS = ['a', 'b', 'c', 'zz9', 'sample-1']

describe('speciesSkeleton', () => {
  it('seed เดิมได้โครงเดิม · seed ต่างได้โครงต่าง', () => {
    expect(buildSkeleton(CHERRY_SKELETON, 'a', 100)).toEqual(buildSkeleton(CHERRY_SKELETON, 'a', 100))
    expect(buildSkeleton(CHERRY_SKELETON, 'a', 100).branches).not.toEqual(buildSkeleton(CHERRY_SKELETON, 'b', 100).branches)
  })

  it('การเติบโตอิ่มตัว: เลเวลสูงมากไม่โตเกินต้นโตเต็มที่', () => {
    expect(growthOf(1, 24)).toBe(0)
    expect(growthOf(100, 24)).toBeGreaterThan(0.97)
    expect(growthOf(100000, 24)).toBe(1)
    const big = buildSkeleton(CHERRY_SKELETON, 'a', 100000)
    expect(big.height).toBeLessThanOrEqual(SKELETON_FULL_HEIGHT + 1e-9)
  })

  for (const seed of SEEDS) {
    it(`ซากุระ (${seed}): แตกง่ามต่ำ 0.15–0.22 H · กิ่งหลัก 3–5 · กาง 30–60° · พุ่มกว้าง 1.15–1.25 H`, () => {
      const s = buildSkeleton(CHERRY_SKELETON, seed, 100)
      const H = s.height
      const trunk = s.branches[0]
      expect(trunk.end[1] / H).toBeGreaterThanOrEqual(0.15 * 0.85 - 1e-9)
      expect(trunk.end[1] / H).toBeLessThanOrEqual(0.22 + 1e-9)
      const limbs = s.branches.filter((b) => b.depth === 1)
      expect(limbs.length).toBeGreaterThanOrEqual(3)
      expect(limbs.length).toBeLessThanOrEqual(5)
      expect(s.crown.rx * 2 / H).toBeGreaterThanOrEqual(1.15 - 1e-9)
      expect(s.crown.rx * 2 / H).toBeLessThanOrEqual(1.25 + 1e-9)
      expect(s.maxDepth).toBe(1 + CHERRY_SKELETON.limbs.levels)
      expect(s.crown.cy - s.crown.ry).toBeCloseTo(0.24 * H, 6)
    })

    it(`ต้นใบหัวใจ (${seed}): แตกง่าม 0.45–0.5 H · กิ่ง 3–4 · รากค้ำ 6 ราก · พุ่ม 0.95–1.05 H · มีเนินดิน`, () => {
      const s = buildSkeleton(HEART_SKELETON, seed, 100)
      const H = s.height
      const trunk = s.branches[0]
      expect(trunk.end[1] / H).toBeGreaterThanOrEqual(0.45 - 1e-9)
      expect(trunk.end[1] / H).toBeLessThanOrEqual(0.5 + 1e-9)
      const limbs = s.branches.filter((b) => b.depth === 1)
      expect(limbs.length).toBeGreaterThanOrEqual(3)
      expect(limbs.length).toBeLessThanOrEqual(4)
      const roots = s.branches.filter((b) => b.depth === 0 && b.end[1] === 0)
      expect(roots).toHaveLength(6)
      const flare = Math.max(...roots.map((r) => r.end[0])) - Math.min(...roots.map((r) => r.end[0]))
      expect(flare / H).toBeGreaterThan(0.2)
      expect(flare / H).toBeLessThanOrEqual(0.32 + 1e-9)
      expect(s.crown.rx * 2 / H).toBeGreaterThanOrEqual(0.95 - 1e-9)
      expect(s.crown.rx * 2 / H).toBeLessThanOrEqual(1.05 + 1e-9)
      expect(s.mound).toBeDefined()
    })
  }

  it('ต้นกล้ามีกิ่งหลักไม่เกิน 2 และยังไม่แตกกิ่งต่อ', () => {
    for (const seed of SEEDS) {
      const s = buildSkeleton(CHERRY_SKELETON, seed, 4)
      expect(s.branches.filter((b) => b.depth === 1).length).toBeLessThanOrEqual(2)
      expect(s.maxDepth).toBeLessThanOrEqual(2)
    }
  })

  it('ไผ่: ต้นกล้า 2 ลำ · โตเต็มที่ 6–8 ลำ · ข้อปล้องทุก 0.10–0.14 H', () => {
    for (const seed of SEEDS) {
      const culmCount = (level: number) => {
        const m = buildTreeModel({ mbtiType: 'ISTP', trunkBranchLevel: level, leafFlowerLevel: 60, userSeed: seed, skeleton: BAMBOO_SKELETON })
        return new Set(m.branches.filter((b) => b.depth === 0 && b.start[1] === 0).map((b) => b.start[0])).size
      }
      expect(culmCount(4)).toBe(2)
      const full = culmCount(100)
      expect(full).toBeGreaterThanOrEqual(6)
      expect(full).toBeLessThanOrEqual(8)
    }
  })

  it('ใบเป็นของ MBTI เดิม · ไม่ใส่ skeleton = ต้นเดิมเป๊ะ', () => {
    const plain = buildTreeModel({ mbtiType: 'INFJ', trunkBranchLevel: 60, leafFlowerLevel: 50 })
    const withSkel = buildTreeModel({ mbtiType: 'INFJ', trunkBranchLevel: 60, leafFlowerLevel: 50, skeleton: CHERRY_SKELETON })
    expect(withSkel.leafShape).toBe(plain.leafShape)
    expect(withSkel.speciesName).toBe(plain.speciesName)
    expect(withSkel.bark).toBe('lenticel')
    expect(plain.bark).toBe('plain')
    expect(buildTreeModel({ mbtiType: 'INFJ', trunkBranchLevel: 60, leafFlowerLevel: 50 })).toEqual(plain)
  })
})
