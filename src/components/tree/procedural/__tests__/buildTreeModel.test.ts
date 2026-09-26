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

  it('grows the same tree as the level rises (young tree = inner branches of the grown tree)', () => {
    const young = buildTreeModel({ ...base, trunkBranchLevel: 25 })
    const grown = buildTreeModel({ ...base, trunkBranchLevel: 130 })
    expect(young.growth).toBeLessThan(grown.growth)
    expect(young.branches.length).toBeLessThan(grown.branches.length)
    for (const b of young.branches) expect(grown.branches).toContainEqual(b)
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

  it('keeps every leaf inside the crown ellipse (round/oval canopy)', () => {
    for (const mbtiType of ['INTJ', 'INFJ', 'ISFJ', 'ESTP'] as const) {
      const m = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 130 })
      for (const l of m.leaves) {
        const e = ((l.position[0] - m.crown.cx) / m.crown.rx) ** 2 + ((l.position[1] - m.crown.cy) / m.crown.ry) ** 2
        expect(e).toBeLessThanOrEqual(1)
      }
    }
  })
})
