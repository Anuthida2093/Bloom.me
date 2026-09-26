import { describe, expect, it } from 'vitest'
import { DEFAULT_TREE_PARAMS, generateTree } from '../generateTree'

describe('generateTree', () => {
  it('is deterministic for the same seed', () => {
    expect(generateTree({ seed: 42 })).toEqual(generateTree({ seed: 42 }))
  })

  it('produces a different tree for a different seed', () => {
    const a = generateTree({ seed: 1 })
    const b = generateTree({ seed: 2 })
    expect(a.branches[a.branches.length - 1].end).not.toEqual(b.branches[b.branches.length - 1].end)
  })

  it('starts with a vertical trunk at the origin and never exceeds maxDepth', () => {
    const { branches } = generateTree()
    expect(branches[0].depth).toBe(0)
    expect(branches[0].start).toEqual([0, 0, 0])
    expect(branches[0].end[1]).toBeCloseTo(DEFAULT_TREE_PARAMS.trunkHeight)
    expect(Math.max(...branches.map((b) => b.depth))).toBe(DEFAULT_TREE_PARAMS.maxDepth)
  })

  it('tapers every branch and keeps children no thicker than the trunk', () => {
    const { branches } = generateTree()
    for (const b of branches) {
      expect(b.radiusEnd).toBeLessThan(b.radiusStart)
      expect(b.radiusStart).toBeLessThanOrEqual(DEFAULT_TREE_PARAMS.trunkRadius)
    }
  })

  it('places leaf anchors only from leafFromDepth upward, above the ground', () => {
    const { leafAnchors } = generateTree()
    expect(leafAnchors.length).toBeGreaterThan(50)
    for (const a of leafAnchors) {
      expect(a.depth).toBeGreaterThanOrEqual(DEFAULT_TREE_PARAMS.leafFromDepth)
      expect(a.position[1]).toBeGreaterThan(0)
    }
  })
})
