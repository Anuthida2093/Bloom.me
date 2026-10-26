import { describe, expect, it } from 'vitest'
import { HOME_SCENES, HOME_SCENES_SELECTABLE, MEADOW_FALLS_PALETTE, WIND_PRESETS, effectiveHomeBackground } from '../../../../config/homeScenes'
import { HOME_BACKGROUNDS, LEGACY_BACKGROUND_IDS } from '../../../../config/homeBackgrounds'
import { SPECIES } from '../../../tree/procedural/species'
import { generateHomeScene, TREE_COLUMN } from '../generateHomeScene'
import { grassLean, MAX_WIND, wind } from '../wind'

const VIEWPORTS = [[390, 844], [1024, 768], [1440, 900]] as const

/** ความสว่างสัมพัทธ์ (WCAG) ของสี #rrggbb */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

describe('ฉากพื้นหลังหน้า Home (3-5 วาดด้วยโค้ด)', () => {
  it('seed + ขนาดจอเดิม = ผังเดิมเป๊ะ · ฉากต่างกันได้ผังต่างกัน', () => {
    for (const s of HOME_SCENES) expect(generateHomeScene(s, 390, 844)).toEqual(generateHomeScene(s, 390, 844))
    expect(generateHomeScene(HOME_SCENES[0], 390, 844).rows).not.toEqual(generateHomeScene(HOME_SCENES[1], 390, 844).rows)
  })

  it('ลำดับใหม่: ฉาก 3-5 ปลดล็อกที่ Lv.10 / 20 / 30 · ล็อกอยู่ = ใช้ฉาก 1 · ค่าเดิมแปลงเป็นเลขใหม่', () => {
    expect(HOME_SCENES.map((s) => s.id)).toEqual([3, 4, 5])
    expect(HOME_SCENES.map((s) => s.unlockLevel)).toEqual([10, 20, 30])
    expect(HOME_SCENES_SELECTABLE).toBe(true)
    expect(HOME_BACKGROUNDS.map((b) => b.id)).toEqual([1, 2])
    expect(HOME_BACKGROUNDS[1].src).toBe('/assets/videos/intro/hero-waterfall2.mp4')
    expect(effectiveHomeBackground(3, 9)).toBe(1)
    expect(effectiveHomeBackground(3, 10)).toBe(3)
    expect(effectiveHomeBackground(5, 29)).toBe(1)
    expect(effectiveHomeBackground(2, 1)).toBe(2)
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((id) => LEGACY_BACKGROUND_IDS[id])).toEqual([1, 1, 2, 1, 1, 3, 4, 5])
  })

  for (const spec of HOME_SCENES) {
    for (const [w, h] of VIEWPORTS) {
      it(`ฉาก ${spec.id} ${w}×${h}: คอลัมน์กลางของต้นไม้ไม่มีของคอนทราสต์สูง`, () => {
        const L = generateHomeScene(spec, w, h)
        const c0 = L.over + w * TREE_COLUMN.from, c1 = L.over + w * TREE_COLUMN.to
        for (const b of L.boxes.filter((x) => x.contrast === 'high')) {
          expect(b.x1 <= c0 || b.x0 >= c1, `${b.id} [${b.x0.toFixed(0)}, ${b.x1.toFixed(0)}] ทับคอลัมน์กลาง [${c0.toFixed(0)}, ${c1.toFixed(0)}]`).toBe(true)
        }
      })
    }
  }

  it('ฉาก 3 ทุ่งหญ้าน้ำตก: ไม่มีแม่น้ำข้ามทุ่ง · น้ำตกอยู่ฝั่งขวา (เศษสี่ส่วนขวา)', () => {
    for (const [w, h] of VIEWPORTS) {
      const L = generateHomeScene(HOME_SCENES[0], w, h)
      expect(L.falls).not.toBeNull()
      for (const r of L.falls!.ribbons) expect((r.x - L.over) / w).toBeGreaterThan(0.75)
      // แอ่งน้ำเล็ก อยู่ฝั่งขวา ไม่ยื่นเข้าทุ่งกลาง
      expect((L.falls!.pool.x - L.falls!.pool.rx - L.over) / w).toBeGreaterThan(0.7)
    }
  })

  it('น้ำตกทุกสีมืดกว่าสีดอกที่สว่างที่สุดของต้นไม้ทุกสายพันธุ์ (ไม่แย่งความเด่นต้นไม้)', () => {
    const lightestBlossoms = Object.values(SPECIES).flatMap((s) => (s.flowers ? [Math.max(...s.flowers.colors.map(luminance))] : []))
    const limit = Math.min(...lightestBlossoms)
    const W = MEADOW_FALLS_PALETTE.water!
    for (const col of [W.edge, W.body, W.highlight, W.foam, W.pool]) expect(luminance(col)).toBeLessThan(limit)
  })

  it('สนามลมต่อเนื่องและมีขอบเขต', () => {
    for (const p of [{ ...WIND_PRESETS.clear, direction: 1 as const }, { ...WIND_PRESETS.rain, direction: -1 as const }, { strength: 1.5, gustSpeed: 0.6, direction: 1 as const }]) {
      for (let t = 0; t < 60; t += 0.37) {
        for (let x = 0; x <= 1; x += 0.05) {
          const a = wind(t, x, p), b = wind(t + 0.001, x + 0.001, p)
          expect(a.strength).toBeGreaterThanOrEqual(0)
          expect(a.strength).toBeLessThanOrEqual(MAX_WIND)
          expect(Math.abs(a.strength - b.strength)).toBeLessThan(0.02)
        }
      }
    }
  })

  it('ฝนลมแรงกว่าแดด (ค่าเฉลี่ย) · ระลอกลมเคลื่อนที่ตามทิศ', () => {
    const avg = (p: typeof WIND_PRESETS.clear) => {
      let s = 0, n = 0
      for (let t = 0; t < 30; t += 0.5) for (let x = 0; x <= 1; x += 0.1) { s += wind(t, x, { ...p, direction: 1 }).strength; n++ }
      return s / n
    }
    expect(avg(WIND_PRESETS.rain)).toBeGreaterThan(avg(WIND_PRESETS.clear) * 1.8)
  })

  it('ลดการเคลื่อนไหว: หญ้าไม่แกว่ง (เอนนิ่งนิดเดียวเท่ากันทุกเวลา)', () => {
    const p = { ...WIND_PRESETS.rain, direction: 1 as const }
    const leans = [0, 1.3, 7.9, 42].map((t) => grassLean(t, 0.4, p, 0.4, true))
    expect(new Set(leans).size).toBe(1)
    expect(Math.abs(leans[0])).toBeLessThan(0.02)
    expect(Math.abs(grassLean(3, 0.4, p, 0.4, false))).toBeGreaterThan(0.05)
  })
})
