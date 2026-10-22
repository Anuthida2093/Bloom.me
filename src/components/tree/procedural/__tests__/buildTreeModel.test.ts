import { describe, expect, it } from 'vitest'
import { buildTreeModel } from '../buildTreeModel'

const base = { mbtiType: 'INFJ' as const, leafFlowerLevel: 50 }

describe('buildTreeModel', () => {
  it('is deterministic for the same progress', () => {
    expect(buildTreeModel({ ...base, trunkBranchLevel: 60 })).toEqual(buildTreeModel({ ...base, trunkBranchLevel: 60 }))
  })

  it('gives seedlings (trunk level 1-5) a few young leaves, growing with the level, and no flowers', () => {
    const lv1 = buildTreeModel({ ...base, trunkBranchLevel: 1, leafFlowerLevel: 100 })
    const lv5 = buildTreeModel({ ...base, trunkBranchLevel: 5, leafFlowerLevel: 100 })
    const lv6 = buildTreeModel({ ...base, trunkBranchLevel: 6, leafFlowerLevel: 100 })
    expect(lv1.leaves.length).toBeGreaterThan(0)
    expect(lv1.leaves.length).toBeLessThan(lv5.leaves.length)
    expect(lv5.leaves.length).toBeLessThan(lv6.leaves.length) // เลเวล 6 = ต้นไม้ (มีพุ่ม)
    expect(lv1.flowers).toHaveLength(0)
    expect(lv5.flowers).toHaveLength(0)
  })

  it('keeps growing at every trunk level up to 100 and stops there', () => {
    let prev = buildTreeModel({ ...base, trunkBranchLevel: 1 })
    for (let lv = 2; lv <= 100; lv++) {
      const m = buildTreeModel({ ...base, trunkBranchLevel: lv })
      const grew = m.growth > prev.growth || m.branches[0].radiusStart > prev.branches[0].radiusStart
      expect(grew).toBe(true)
      prev = m
    }
    expect(buildTreeModel({ ...base, trunkBranchLevel: 100 })).toEqual(buildTreeModel({ ...base, trunkBranchLevel: 150 }))
  })

  it('ties leaves to the mental level 1-100 only (same trunk, denser crown)', () => {
    const counts = [1, 25, 50, 75, 100].map((leafFlowerLevel) => buildTreeModel({ ...base, trunkBranchLevel: 60, leafFlowerLevel }).leaves.length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1])
    const a = buildTreeModel({ ...base, trunkBranchLevel: 60, leafFlowerLevel: 1 })
    const b = buildTreeModel({ ...base, trunkBranchLevel: 60, leafFlowerLevel: 100 })
    expect(a.branches).toEqual(b.branches)
  })

  it('grows the same tree as the level rises (young tree = inner branches of the grown tree, thinner)', () => {
    const young = buildTreeModel({ ...base, trunkBranchLevel: 12 })
    const grown = buildTreeModel({ ...base, trunkBranchLevel: 100 })
    expect(young.growth).toBeLessThan(grown.growth)
    expect(young.branches.length).toBeLessThan(grown.branches.length)
    const key = (b: { start: number[]; end: number[] }) => `${b.start.join()}|${b.end.join()}`
    const grownKeys = new Set(grown.branches.map(key))
    for (const b of young.branches) expect(grownKeys.has(key(b))).toBe(true)
    expect(young.branches[0].radiusStart).toBeLessThan(grown.branches[0].radiusStart)
  })

  it('makes every visual stage visibly different: taller, thicker trunk, more branches/leaves', () => {
    const stages = [1, 3, 6, 11, 21, 36, 56, 81].map((lv) => buildTreeModel({ ...base, trunkBranchLevel: lv }))
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
      const m = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 100 })
      return `${m.branches.length}:${m.bounds.maxX.toFixed(2)}:${m.bounds.maxY.toFixed(2)}:${m.leafShape}`
    })
    expect(new Set(signatures).size).toBe(16)
  })

  it('lets only some leaves flutter (seedling: all, grown tree: outer front leaves only)', () => {
    const seedling = buildTreeModel({ ...base, trunkBranchLevel: 3 })
    const grown = buildTreeModel({ ...base, trunkBranchLevel: 100 })
    expect(seedling.flutterable).toHaveLength(seedling.leaves.length)
    expect(grown.flutterable.length).toBeGreaterThan(0)
    expect(grown.flutterable.length).toBeLessThan(grown.leaves.length)
  })

  it('shows more flowers for a higher mental-health level, none at level 0', () => {
    const none = buildTreeModel({ ...base, trunkBranchLevel: 100, leafFlowerLevel: 0 })
    const many = buildTreeModel({ ...base, trunkBranchLevel: 100, leafFlowerLevel: 100 })
    expect(none.flowers).toHaveLength(0)
    expect(many.flowers.length).toBeGreaterThan(0)
  })

  it('uses fewer leaves in compact (small-screen) mode', () => {
    const full = buildTreeModel({ ...base, trunkBranchLevel: 100 })
    const compact = buildTreeModel({ ...base, trunkBranchLevel: 100, compact: true })
    expect(compact.leaves.length).toBeLessThan(full.leaves.length)
    expect(compact.leaves.length).toBeLessThanOrEqual(3500 + 400)
  })

  it('gives different MBTI groups different silhouettes', () => {
    const nt = buildTreeModel({ ...base, mbtiType: 'INTJ', trunkBranchLevel: 100 })
    const sp = buildTreeModel({ ...base, mbtiType: 'ESTP', trunkBranchLevel: 100 })
    const width = (m: typeof nt) => m.bounds.maxX - m.bounds.minX
    expect(width(nt) / nt.bounds.maxY).not.toBeCloseTo(width(sp) / sp.bounds.maxY, 1)
  })

  it('keeps every leaf inside the crown ellipse for round-crowned broadleaf species', () => {
    for (const mbtiType of ['ESFJ', 'ISFJ', 'ENTJ', 'ESFP'] as const) { // ซากุระ (INFJ) ตั้งใจให้กลุ่มดอกฟูเลยขอบนิดๆ
      const m = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 100 })
      for (const l of m.leaves) {
        const e = ((l.position[0] - m.crown.cx) / m.crown.rx) ** 2 + ((l.position[1] - m.crown.cy) / m.crown.ry) ** 2
        expect(e).toBeLessThanOrEqual(1)
      }
    }
  })

  it('gives each MBTI its signature tree species and features', () => {
    const grown = (mbtiType: Parameters<typeof buildTreeModel>[0]['mbtiType']) =>
      buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 100, leafFlowerLevel: 100 })
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
      const grown = buildTreeModel({ ...base, mbtiType, trunkBranchLevel: 100 })
      expect(grown.growth).toBeGreaterThan(young.growth)
      expect(grown.leaves.length).toBeGreaterThan(young.leaves.length)
      expect(grown.branches.length).toBeGreaterThanOrEqual(young.branches.length)
    }
  })
})

describe('buildTreeModel ต้นเฉพาะของผู้ใช้ (userSeed)', () => {
  const grown = { ...base, trunkBranchLevel: 60 }

  it('ผู้ใช้ต่างกัน สายพันธุ์เดียวกัน → โครงกิ่งไม่ซ้ำกัน แต่คนเดิมได้ต้นเดิมทุกครั้ง', () => {
    const a = buildTreeModel({ ...grown, userSeed: 'user-a' })
    const b = buildTreeModel({ ...grown, userSeed: 'user-b' })
    expect(a.branches).not.toEqual(b.branches)
    expect(buildTreeModel({ ...grown, userSeed: 'user-a' })).toEqual(a)
  })

  it('ไม่เปลี่ยนสีเปลือก/ชื่อสายพันธุ์/รูปใบ (สุ่มแค่ทรงกิ่ง พุ่ม ดอก และหน้าตา)', () => {
    const plain = buildTreeModel(grown)
    const mine = buildTreeModel({ ...grown, userSeed: 'user-a' })
    expect(mine.trunkColor).toBe(plain.trunkColor)
    expect(mine.speciesName).toBe(plain.speciesName)
    expect(mine.leafShape).toBe(plain.leafShape)
  })

  it('ใบผูกกับเลเวลจิตใจ: เลเวลจิตใจสูงพุ่มแน่นกว่า', () => {
    const low = buildTreeModel({ ...grown, leafFlowerLevel: 1 })
    const high = buildTreeModel({ ...grown, leafFlowerLevel: 40 })
    expect(high.leaves.length).toBeGreaterThan(low.leaves.length)
  })
})

describe('buildTreeModel หน้าตาต้นสน/ไผ่', () => {
  it('สน (ISTJ กรวย / INTJ ไซเปรส): หน้าอยู่กลางพุ่มเข็มด้านหน้า วาดทับใบ', () => {
    for (const mbtiType of ['ISTJ', 'INTJ'] as const) {
      const m = buildTreeModel({ mbtiType, trunkBranchLevel: 60, leafFlowerLevel: 20, userSeed: 'u1' })
      expect(m.face.anchor?.overFoliage).toBe(true)
      expect(m.face.anchor?.radius).toBeGreaterThan(0.15)
      expect(m.face.anchor?.position[1]).toBeGreaterThan(0)
    }
  })

  it('ไผ่ (ISTP): หน้าอยู่บนลำกลาง ใต้ใบ (ชั้นกิ่ง)', () => {
    const m = buildTreeModel({ mbtiType: 'ISTP', trunkBranchLevel: 60, leafFlowerLevel: 20, userSeed: 'u1' })
    expect(m.face.anchor?.overFoliage).toBe(false)
    expect(m.face.anchor?.radius).toBeGreaterThan(0.1)
  })
})
