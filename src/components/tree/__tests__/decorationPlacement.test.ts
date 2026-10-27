import { describe, expect, it } from 'vitest'
import { buildTreeModel } from '../procedural/buildTreeModel'
import { buildPlacementGeometry, constrainPlacement, groundTopAt, placementRuleOf } from '../decorationPlacement'
import type { MbtiType } from '../../../types'

const geoFor = (mbtiType: MbtiType, w = 390, h = 844) =>
  buildPlacementGeometry(buildTreeModel({ mbtiType, trunkBranchLevel: 60, leafFlowerLevel: 60 }), w, w * 1.6, h)!

describe('placementRuleOf', () => {
  it('maps shop categories to placement rules', () => {
    expect(placementRuleOf('frog-guard')).toBe('ground') // รูปปั้นกระถาง
    expect(placementRuleOf('gold-star')).toBe('tree') // ของแขวนกิ่งไม้
    expect(placementRuleOf('calm-butterfly')).toBe('not-ground') // ลายโพสอิทสะสม
    expect(placementRuleOf('stone-dragon-guardian')).toBe('not-ground') // ของพิเศษ
  })
})

describe('constrainPlacement', () => {
  const geo = geoFor('INFJ')

  it('puts statues on the ground wherever they are dropped', () => {
    const p = constrainPlacement('ground', { xPct: 30, yPct: 20 }, geo)
    expect(p.xPct).toBe(30)
    expect(p.yPct).toBeGreaterThan(groundTopAt(geo, 30))
  })

  it('keeps statues already on the ground where they are', () => {
    const y = groundTopAt(geo, 60) + 5
    expect(constrainPlacement('ground', { xPct: 60, yPct: y }, geo)).toEqual({ xPct: 60, yPct: y })
  })

  it('pulls hangers dropped off the tree back onto the crown', () => {
    const p = constrainPlacement('tree', { xPct: 2, yPct: 5 }, geo)
    const { cx, cy, rx, ry } = geo.crown
    expect(((p.xPct - cx) / rx) ** 2 + ((p.yPct - cy) / ry) ** 2).toBeLessThanOrEqual(1)
  })

  it('leaves hangers inside the crown untouched', () => {
    const inside = { xPct: geo.crown.cx, yPct: geo.crown.cy }
    expect(constrainPlacement('tree', inside, geo)).toEqual(inside)
  })

  it('lets post-its sit on the background but never on the ground', () => {
    expect(constrainPlacement('not-ground', { xPct: 10, yPct: 10 }, geo)).toEqual({ xPct: 10, yPct: 10 })
    const dropped = constrainPlacement('not-ground', { xPct: 50, yPct: 95 }, geo)
    expect(dropped.yPct).toBeLessThan(groundTopAt(geo, 50))
  })

  it('works for special forms (palm, bamboo, cypress)', () => {
    for (const mbti of ['ESTP', 'ISTP', 'INTJ'] as const) {
      const g = geoFor(mbti)
      const p = constrainPlacement('tree', { xPct: 95, yPct: 50 }, g)
      expect(((p.xPct - g.crown.cx) / g.crown.rx) ** 2 + ((p.yPct - g.crown.cy) / g.crown.ry) ** 2).toBeLessThanOrEqual(1)
    }
  })

  it('does nothing before the tree is measured', () => {
    expect(constrainPlacement('ground', { xPct: 10, yPct: 10 }, null)).toEqual({ xPct: 10, yPct: 10 })
  })
})
