/*============================================================================*\
  generatedMapArt — สี/ค่าศิลป์ทั้งหมดของแผนที่ที่วาดด้วยโค้ด (แผนที่ 9 · ป่าเห็ดมหัศจรรย์)
  ────────────────────────────────────────────────────────────────────────────
  รวมไว้ที่เดียว — โค้ดสร้างฉาก (mapgen/) และตัววาด (scenery/sceneryPrimitives.ts) ไม่มีเลขสีกระจาย
  สี rgba ที่ต้องปรับความทึบตอนวาด เก็บเป็น [r, g, b] แล้วให้ตัววาดใส่ alpha เอง
\*============================================================================*/

import type { TreeSpecies } from '../components/scenery/sceneryShapes'

export type Rgb = readonly [number, number, number]

export interface CanopyTones { shadow: string; mid: string; light: string; highlight: string }
export interface SpeciesTones { canopy: CanopyTones; trunk: readonly [dark: string, mid: string, light: string]; petals?: readonly string[] }

/** สไตล์ต้นไม้/พุ่มฉากประกอบ (scenery/storybookTrees.ts) */
export interface TreeStyle {
  id: 'A' | 'B'
  label: string
  /** เส้นขอบรอบทรง (ไม่มี = สไตล์สีน้ำ) */
  outline: { color: string; width: number } | null
  /** สีซึมรอบทรงแบบสีน้ำ (ความทึบ 0 = ไม่มี) */
  bleed: number
  /** สีเข้มขังที่ขอบนอกแบบสีน้ำ (ความทึบ) */
  pool: number
  fillAlpha: number
  daubAlpha: number
  rim: { color: string; alpha: number }
  /** จำนวนแต้มใบต่อพื้นที่พุ่ม (คูณ) */
  daubDensity: number
  tones: Record<TreeSpecies, SpeciesTones> & { blossomAlt: SpeciesTones }
  /** พุ่มไม้เตี้ย — สุ่มชุดสีต่อพุ่ม */
  bushes: readonly CanopyTones[]
  bark: { lenticel: string; hollow: string; windowFrame: string }
  ground: { shadow: Rgb; shadowAlpha: number; grass: string; flowers: readonly string[]; leaf: string }
  magic: {
    glow: Rgb; lantern: string; lanternFrame: string; lanternString: string; window: string
    mushroom: string; mushroomStem: string; mushroomGlow: Rgb; vine: string; vineLeaf: string; firefly: Rgb
  }
  /** ชั้นเก็บงานทั้งฉาก: เกรนกระดาษ + ขอบมืด */
  finish: { grainAlpha: number; vignette: Rgb; vignetteAlpha: number }
}

const SHARED_BARK = { lenticel: 'rgba(60,55,50,.55)', hollow: 'rgba(45,28,20,.85)', windowFrame: 'rgba(90,55,30,.7)' }
const SHARED_MAGIC = { lanternFrame: 'rgba(70,50,35,.8)', lanternString: 'rgba(60,45,35,.75)', mushroomStem: '#f4ecdc', firefly: [255, 246, 190] as Rgb }

/** A: นุ่ม โทนสีน้ำ — ไม่มีเส้นขอบ สีซึม/สีขังขอบ ซีดหวาน [เลือกใช้กับแผนที่ 9] */
export const TREE_STYLE_A: TreeStyle = {
  id: 'A',
  label: 'A · สีน้ำนุ่ม',
  outline: null,
  bleed: 0.28,
  pool: 0.42,
  fillAlpha: 0.94,
  daubAlpha: 0.5,
  rim: { color: '#fff1c4', alpha: 0.5 },
  daubDensity: 1,
  tones: {
    oak: { canopy: { shadow: '#456f63', mid: '#6d9a63', light: '#9fc27a', highlight: '#d3e6a4' }, trunk: ['#6e5442', '#94735a', '#b89878'] },
    fir: { canopy: { shadow: '#3c6467', mid: '#5b8670', light: '#86ad86', highlight: '#bcd7a8' }, trunk: ['#66503f', '#8a6c55', '#ab8d72'] },
    blossom: { canopy: { shadow: '#b77d9c', mid: '#e3a6bf', light: '#f5c9d6', highlight: '#fde8ee' }, trunk: ['#6e5442', '#94735a', '#b89878'], petals: ['#ffffff', '#fbd3df', '#f2a9c2'] },
    blossomAlt: { canopy: { shadow: '#8c7fb3', mid: '#b2a4dc', light: '#d3c8ee', highlight: '#eee8fb' }, trunk: ['#6e5442', '#94735a', '#b89878'], petals: ['#ffffff', '#e4dcfa', '#c4b4ec'] },
    weeping: { canopy: { shadow: '#4f7563', mid: '#7aa46a', light: '#a9ca82', highlight: '#d8eaae' }, trunk: ['#6e5442', '#94735a', '#b89878'] },
    birch: { canopy: { shadow: '#6f8f5c', mid: '#9dbd6c', light: '#c6db8c', highlight: '#e8f0b8' }, trunk: ['#a9a296', '#d8d2c4', '#f4f0e6'] },
  },
  bushes: [
    { shadow: '#40695a', mid: '#638f5b', light: '#93b872', highlight: '#c8de9c' },
    { shadow: '#3f6a63', mid: '#5f8d6b', light: '#8fb889', highlight: '#c3dcb0' },
    { shadow: '#56734f', mid: '#7f9f5c', light: '#abc77a', highlight: '#d9e8a6' },
  ],
  bark: SHARED_BARK,
  ground: { shadow: [40, 70, 80], shadowAlpha: 0.26, grass: 'rgba(120,170,95,.75)', flowers: ['#fff4d6', '#f7c6d6', '#d9ccf5'], leaf: '#b9a35f' },
  magic: { ...SHARED_MAGIC, glow: [255, 220, 150], lantern: '#ffe8a8', window: '#ffd98a', mushroom: '#9fd8f0', mushroomGlow: [150, 215, 255], vine: '#5f8f58', vineLeaf: '#8fbf72' },
  finish: { grainAlpha: 0.22, vignette: [25, 40, 30], vignetteAlpha: 0.32 },
}

/** B: ชัด แนวนิทานภาพ — เส้นขอบบางสีเขียวเข้มโปร่ง แสงเงาคม สีสดกว่า (ตัวเลือกที่ไม่ได้ใช้ เก็บไว้เทียบใน /dev/tree-sheet) */
export const TREE_STYLE_B: TreeStyle = {
  id: 'B',
  label: 'B · นิทานภาพ',
  outline: { color: 'rgba(28,62,40,.62)', width: 1.8 },
  bleed: 0,
  pool: 0,
  fillAlpha: 1,
  daubAlpha: 0.85,
  rim: { color: '#ffe39a', alpha: 0.75 },
  daubDensity: 0.8,
  tones: {
    oak: { canopy: { shadow: '#2f5e52', mid: '#4f9150', light: '#86c25e', highlight: '#c6e985' }, trunk: ['#5a3c28', '#87603f', '#b08860'] },
    fir: { canopy: { shadow: '#24525a', mid: '#3d7a62', light: '#66a678', highlight: '#a6d39a' }, trunk: ['#553a28', '#7f5a3c', '#a47e5a'] },
    blossom: { canopy: { shadow: '#b0577f', mid: '#ec8fb3', light: '#f9bdd0', highlight: '#ffe4ec' }, trunk: ['#5a3c28', '#87603f', '#b08860'], petals: ['#ffffff', '#ffd0df', '#f07ea7'] },
    blossomAlt: { canopy: { shadow: '#6c5aa8', mid: '#9e86e0', light: '#c8b8f4', highlight: '#ece4ff' }, trunk: ['#5a3c28', '#87603f', '#b08860'], petals: ['#ffffff', '#e2d6ff', '#a98ae6'] },
    weeping: { canopy: { shadow: '#38634f', mid: '#5f9b57', light: '#94c86a', highlight: '#cdec96' }, trunk: ['#5a3c28', '#87603f', '#b08860'] },
    birch: { canopy: { shadow: '#5a8442', mid: '#8bbd4e', light: '#b8dc6c', highlight: '#e2f3a0' }, trunk: ['#8f877a', '#d6cfbf', '#fbf7ee'] },
  },
  bushes: [
    { shadow: '#2b5a48', mid: '#468a4a', light: '#7dbb58', highlight: '#bfe480' },
    { shadow: '#275552', mid: '#3f835f', light: '#70b47a', highlight: '#b0dca0' },
    { shadow: '#43663a', mid: '#689648', light: '#9cc660', highlight: '#d2ec90' },
  ],
  bark: SHARED_BARK,
  ground: { shadow: [25, 55, 60], shadowAlpha: 0.3, grass: 'rgba(80,150,70,.9)', flowers: ['#fff6c8', '#ffb7cf', '#c9b6ff'], leaf: '#c9a14a' },
  magic: { ...SHARED_MAGIC, glow: [255, 214, 120], lantern: '#ffe08a', window: '#ffcf6a', mushroom: '#7fd0ff', mushroomGlow: [120, 205, 255], vine: '#3f7f45', vineLeaf: '#7cc062' },
  finish: { grainAlpha: 0.13, vignette: [25, 40, 30], vignetteAlpha: 0.2 },
}

export const TREE_STYLES = { A: TREE_STYLE_A, B: TREE_STYLE_B } as const

export interface ScenePalette {
  ground: string
  groundBlots: readonly [string, string]
  meadowBands: readonly [string, string]
  /** วงลานโล่งรอบจุดเด่น (กลางสว่าง → ขอบจาง) */
  clearing: Rgb
  tuft: string
  path: { edge: string; body: string; centre: string; speckDark: string; speckLight: string }
  flowers: readonly string[]
  firefly: { glow: Rgb; core: string }
  /** เส้นขอบเห็ด/ประตู (เขียวเข้มโปร่ง ไม่ใช่ดำ) */
  outline: string
  shadow: Rgb
  /** ต้นไม้/พุ่มทั้งป่า */
  treeStyle: TreeStyle
  mushroom: {
    stem: string
    stemShade: string
    /** ก้านทรงกระบอก: สว่างซ้าย → เงาขวา */
    stemTones: readonly [light: string, mid: string, dark: string]
    caps: Record<'red' | 'orange' | 'pink' | 'purple' | 'blue', readonly [string, string]>
    rainbow: readonly string[]
    glow: { blue: Rgb; purple: Rgb; rainbow: Rgb }
    spots: string
    shine: string
    gill: string
  }
  crystal: { dark: string; mid: string; light: string; glow: Rgb; edge: string; facetLight: string; facetDark: string; sparkle: string }
  /** [ใหม่] ปราสาทหิน */
  castle: {
    stone: readonly [light: string, mid: string, dark: string]
    mortar: string
    roof: readonly [light: string, dark: string]
    roofLine: string
    window: string
    windowGlow: Rgb
    door: string
    doorDark: string
    banner: string
    bannerTrim: string
    flags: readonly [string, string]
    moss: readonly [string, string]
    torchGlow: Rgb
  }
  /** [ใหม่] ถ้ำคริสตัล (เนินหิน) */
  cave: { rock: readonly [light: string, mid: string, dark: string]; crack: string; moss: readonly [string, string]; mouthDark: string; mouthLight: Rgb }
  /** [ใหม่] ป่าพิศวง — พื้นมืดลง + หมอกม่วง */
  mystic: { shade: Rgb; mist: Rgb; wisp: Rgb }
  gate: {
    stone: readonly [string, string, string]
    wood: readonly [string, string, string]
    gem: { stone: string; wood: string; glowStone: Rgb; glowWood: Rgb }
    door: string
    doorLine: string
    hinge: string
    lantern: { glow: Rgb; light: string; chain: string }
    vine: string
    leaves: readonly [string, string]
    flowerStone: string
    flowerWood: string
  }
}

export const MUSHROOM_FOREST_PALETTE: ScenePalette = {
  ground: '#2f6a3a',
  groundBlots: ['rgba(95,150,70,.10)', 'rgba(10,60,35,.14)'],
  meadowBands: ['rgba(135,196,95,.30)', 'rgba(150,210,105,.30)'],
  clearing: [150, 208, 105],
  tuft: 'rgba(130,200,100,.4)',
  path: { edge: '#7b5a3a', body: '#d2ae7a', centre: 'rgba(240,214,170,.55)', speckDark: 'rgba(120,88,55,.45)', speckLight: 'rgba(255,240,210,.55)' },
  flowers: ['#f6b6d2', '#fff2a8', '#ffffff', '#c9b6ff', '#ffb27a'],
  firefly: { glow: [255, 245, 170], core: '#fffbe0' },
  outline: 'rgba(22,52,32,.92)',
  shadow: [10, 30, 15],
  treeStyle: TREE_STYLE_A,
  mushroom: {
    stem: '#f6ead2',
    stemShade: 'rgba(150,110,70,.25)',
    stemTones: ['#fffaf0', '#f3e3c6', '#c9ae86'],
    caps: {
      red: ['#e8574f', '#b83a3a'],
      orange: ['#f5a04a', '#c9772c'],
      pink: ['#f49ac1', '#c8668f'],
      purple: ['#a06fe0', '#6f46b3'],
      blue: ['#6fc9ff', '#3a8fcc'],
    },
    rainbow: ['#ff7a8a', '#ffb066', '#ffe27a', '#8fe08a', '#74d4ff', '#b58cff'],
    glow: { blue: [120, 210, 255], purple: [190, 140, 255], rainbow: [255, 200, 255] },
    spots: 'rgba(255,255,255,.92)',
    shine: 'rgba(255,255,255,.55)',
    gill: 'rgba(60,30,40,.3)',
  },
  crystal: {
    dark: '#a35ae0', mid: '#c98bf5', light: '#ecd0ff', glow: [200, 130, 255],
    edge: 'rgba(75,30,115,.85)', facetLight: 'rgba(255,255,255,.28)', facetDark: 'rgba(70,25,120,.22)', sparkle: '#ffffff',
  },
  castle: {
    stone: ['#d3cec4', '#aaa49a', '#7c776f'],
    mortar: 'rgba(55,50,45,.32)',
    roof: ['#8d7ad6', '#4b3c8c'],
    roofLine: 'rgba(30,20,70,.35)',
    window: '#ffdf94',
    windowGlow: [255, 205, 120],
    door: '#7a4b28',
    doorDark: '#2a1a12',
    banner: '#6f46b3',
    bannerTrim: '#f5c84a',
    flags: ['#e8574f', '#f5c84a'],
    moss: ['#4f8a4a', '#7bb862'],
    torchGlow: [255, 190, 90],
  },
  cave: {
    rock: ['#a9a3b4', '#7d768c', '#4f4960'],
    crack: 'rgba(35,25,50,.45)',
    moss: ['#4f8a4a', '#86c06a'],
    mouthDark: '#1f1430',
    mouthLight: [215, 160, 255],
  },
  mystic: { shade: [20, 12, 55], mist: [140, 110, 230], wisp: [225, 215, 255] },
  gate: {
    stone: ['#b2b7bc', '#8f959b', '#6b7178'],
    wood: ['#a97444', '#85572f', '#5f3d22'],
    gem: { stone: '#d9a8ff', wood: '#ffd98a', glowStone: [200, 130, 255], glowWood: [255, 210, 120] },
    door: '#8a5a30',
    doorLine: 'rgba(40,25,10,.55)',
    hinge: 'rgba(60,60,70,.9)',
    lantern: { glow: [255, 220, 130], light: '#ffe9a6', chain: 'rgba(30,30,30,.8)' },
    vine: '#2f7a3d',
    leaves: ['#4fa24d', '#7bc462'],
    flowerStone: '#f6b6d2',
    flowerWood: '#fff2a8',
  },
}
