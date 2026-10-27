/*============================================================================*\
  homeScenes — ฉากพื้นหลังหน้า Home ที่วาดด้วยโค้ด (ฉาก 3-5) · สีทั้งหมดอยู่ไฟล์นี้ที่เดียว
  ────────────────────────────────────────────────────────────────────────────
  ฉาก 1-2 = วิดีโอ (config/homeBackgrounds.ts) · ฉาก 3-5 วาดด้วยโค้ด ปลดล็อกที่ Lv.10 / 20 / 30
  - 6 ทุ่งหญ้าน้ำตก (Scene 2 ตาม brief): ไม่มีแม่น้ำ · น้ำตกฝั่งขวา · หญ้าไหวตามลม
  - 7 ป่าแสงลอด · 8 สวนดอกไม้
  แสงมาจากซ้ายบนทุกฉาก · ภาษาภาพ storybook-vector เดียวกัน · เกรนกระดาษบางๆ ทับทั้งฉาก
  [แก้ตามที่ระบุ 2026-10-27] สีสดขึ้นระดับวิดีโอฉาก 1 (ฟ้าใส หญ้าเขียวสด เขาชัด) แต่ยังอ่อนกว่าต้นไม้
  ลดหมอก/ไอฟ้า/ขอบมืดที่ทำให้ฉากซีดเทา (atmosphere) · ตอนฝนยังมืดกว่าแดด (mistRain + rainGrade)
  ยังไม่เปิดให้เลือกในแอปจนกว่าผู้ใช้จะอนุมัติหน้า preview (/dev/home-scenes) — HOME_SCENES_SELECTABLE
\*============================================================================*/

export type HomeSceneKind = 'meadow-falls' | 'forest-glade' | 'flower-garden'
export type SceneWeather = 'clear' | 'rain'

/** ความแรงลมพื้นฐานตามสภาพอากาศ (ต่อเข้ากับข้อมูลอากาศจริงได้ภายหลังผ่าน windStrength) */
export const WIND_PRESETS: Record<SceneWeather, { strength: number; gustSpeed: number }> = {
  clear: { strength: 0.35, gustSpeed: 0.22 },
  rain: { strength: 0.8, gustSpeed: 0.42 },
}

export interface ScenePalette {
  sky: readonly [top: string, mid: string, horizon: string]
  sunGlow: readonly [number, number, number]
  /** ภูเขาไกล → ใกล้ (ไม่มีเส้นขอบ คอนทราสต์ต่ำ) */
  ridges: readonly string[]
  hills: readonly string[]
  farTrees: readonly string[]
  farTreeAccent: string
  ground: readonly [far: string, near: string]
  /** หญ้า: ไกล → ใกล้ */
  grass: readonly [far: string, mid: string, near: string]
  grassTip: string
  flowers: readonly string[]
  mist: readonly [number, number, number]
  haze: readonly [number, number, number]
  /** แสงอุ่น / เกรดสีตอนฝนตก */
  light: readonly [number, number, number]
  rainGrade: readonly [number, number, number]
  rainStreak: string
  mote: readonly [number, number, number]
  petal: readonly string[]
  vignette: readonly [number, number, number]
  grainAlpha: number
  /** ความแรงของชั้นไอฟ้า/หมอก/ขอบมืดที่ทับฉาก (0-1) — ค่ามาก = ซีดลง */
  atmosphere: { ridgeHaze: number; propHaze: number; farHaze: number; mist: number; mistRain: number; vignette: number }
  rock?: readonly [light: string, mid: string, dark: string]
  moss?: readonly [string, string]
  bush?: readonly [string, string]
  /** น้ำตก — ทุกสีต้องมืดกว่าดอกที่สว่างที่สุดของต้นไม้ (เทสต์ตรวจ) */
  water?: { edge: string; body: string; highlight: string; foam: string; pool: string }
  trunks?: readonly [far: string, mid: string, near: string]
  canopy?: readonly [string, string]
  /** เรือนยอดหลายชั้น: เงาลึก → กลาง → สว่าง → ไฮไลต์ (ฉาก 7) */
  canopyTones?: readonly [deep: string, mid: string, light: string, highlight: string]
  hedge?: readonly [string, string]
  arch?: readonly [light: string, shade: string]
  rose?: readonly [string, string]
  mushroom?: string
}

export interface HomeSceneSpec {
  /** เลขฉากในหน้าเลือกพื้นหลัง (ต่อจากวิดีโอ 1-5) */
  id: number
  kind: HomeSceneKind
  name: string
  seed: number
  /** ปลดล็อกเมื่อต้นไม้ถึงเลเวลนี้ */
  unlockLevel: number
  palette: ScenePalette
}

const SHARED = {
  rainGrade: [70, 90, 115] as const,
  rainStreak: 'rgba(210, 225, 240, 0.45)',
  vignette: [30, 40, 35] as const,
  grainAlpha: 0.045,
  // เดิม ridgeHaze .55 · propHaze .5 · farHaze .35 · mist .32 · mistRain .5 · vignette .32 (ฉากซีดเทา)
  atmosphere: { ridgeHaze: 0.24, propHaze: 0.2, farHaze: 0.14, mist: 0.16, mistRain: 0.38, vignette: 0.16 },
}

export const MEADOW_FALLS_PALETTE: ScenePalette = {
  ...SHARED,
  sky: ['#5fa8e8', '#a9d3f5', '#f4e6c8'],
  sunGlow: [255, 236, 200],
  ridges: ['#94b5d8', '#7fa7c8', '#71a2ad'],
  hills: ['#8cc46a', '#74b357'],
  farTrees: ['#4f9a6e', '#43895f', '#5aa676'],
  farTreeAccent: '#f0a9c2',
  ground: ['#b8de86', '#5fae45'],
  grass: ['#a6d877', '#7cc254', '#4f9a38'],
  grassTip: '#d8f2a2',
  flowers: ['#ffffff', '#ffb3cb', '#c9b2ff', '#ffd84d'],
  mist: [236, 246, 250],
  haze: [205, 226, 240],
  light: [255, 238, 200],
  mote: [255, 246, 205],
  petal: ['#ffbcd2', '#ffa6c2', '#ffe0ea'],
  rock: ['#c9a47e', '#a8835f', '#7d6146'],
  moss: ['#6fb24c', '#4f9438'],
  bush: ['#5aa64a', '#43893a'],
  water: { edge: '#4a9cc9', body: '#7bbfe0', highlight: '#a2d4ec', foam: '#b6dced', pool: '#5fb0d8' },
}

export const FOREST_GLADE_PALETTE: ScenePalette = {
  ...SHARED,
  sky: ['#8fcbea', '#d4efd6', '#fbecc0'],
  sunGlow: [255, 238, 180],
  ridges: ['#80b09c', '#6a9e88'],
  hills: ['#6fae5a', '#5c9e4c'],
  farTrees: ['#3f8058', '#357049', '#4c8f63'],
  farTreeAccent: '#f0c060',
  ground: ['#9fd06e', '#4f9a3c'],
  grass: ['#94cc66', '#6bb246', '#46902f'],
  grassTip: '#cdea92',
  flowers: ['#fff4c9', '#ffd24a', '#ff9fb8'],
  mist: [232, 244, 226],
  haze: [200, 226, 205],
  light: [255, 236, 180],
  mote: [255, 240, 170],
  petal: ['#f0a845', '#e0803a', '#f6c45a'],
  trunks: ['#9c8a70', '#7a5f44', '#563f2b'],
  canopy: ['#2f7a4a', '#3f9358'],
  canopyTones: ['#1f5a35', '#2f7f45', '#58a64e', '#9fd46e'],
  moss: ['#79b84f', '#5e9e3d'],
  bush: ['#4f9c43', '#3c8636'],
  mushroom: '#ef6f55',
}

export const FLOWER_GARDEN_PALETTE: ScenePalette = {
  ...SHARED,
  sky: ['#6fb4ee', '#b6dcf7', '#fde3d2'],
  sunGlow: [255, 240, 205],
  ridges: ['#9ab8d8', '#86a9c9'],
  hills: ['#94cc70', '#7dbd5d'],
  farTrees: ['#5aa274', '#4d9467', '#6ab384'],
  farTreeAccent: '#ffa8c4',
  ground: ['#bfe28e', '#62b348'],
  grass: ['#acd97c', '#82c35a', '#56a03d'],
  grassTip: '#dcf3a8',
  flowers: ['#ff6f91', '#ffcf3d', '#ff92b8', '#b58cff', '#ffffff', '#ff8a5c'],
  mist: [242, 246, 250],
  haze: [210, 228, 242],
  light: [255, 240, 205],
  mote: [255, 246, 215],
  petal: ['#ffb0c8', '#ffd6e2', '#ffc98a'],
  hedge: ['#4f9a45', '#3e863a'],
  bush: ['#5ba84d', '#47913f'],
  arch: ['#fbf6ee', '#e2d6c4'],
  rose: ['#f0607f', '#ff9fb6'],
}

export const HOME_SCENES: HomeSceneSpec[] = [
  // [แก้ตามที่ระบุ 2026-10-27] เลขฉากใหม่ 3-5 (เดิม 6-8) · ล็อกตามเลเวล 10 / 20 / 30
  { id: 3, kind: 'meadow-falls', name: 'ทุ่งหญ้าน้ำตก', seed: 606, unlockLevel: 10, palette: MEADOW_FALLS_PALETTE },
  { id: 4, kind: 'forest-glade', name: 'ป่าแสงลอด', seed: 707, unlockLevel: 20, palette: FOREST_GLADE_PALETTE },
  { id: 5, kind: 'flower-garden', name: 'สวนดอกไม้', seed: 808, unlockLevel: 30, palette: FLOWER_GARDEN_PALETTE },
]

/** [Approval gate] ผู้ใช้อนุมัติหน้า preview แล้ว (2026-10-26) → เลือกได้ในตั้งค่า */
export const HOME_SCENES_SELECTABLE = true

export function homeSceneById(id: number | null | undefined): HomeSceneSpec | null {
  if (!HOME_SCENES_SELECTABLE) return null
  return HOME_SCENES.find((s) => s.id === id) ?? null
}

/** [แก้ตามที่ระบุ 2026-10-27] เปิดระบบล็อกตามเลเวลแล้ว */
export const HOME_SCENE_LOCKS_ENABLED = true

export function isHomeSceneUnlocked(spec: HomeSceneSpec, treeLevel: number): boolean {
  return !HOME_SCENE_LOCKS_ENABLED || treeLevel >= spec.unlockLevel
}

/** ฉากที่ใช้จริง: ฉากที่เลือกไว้แต่ยังล็อกอยู่ (เลเวลไม่ถึง) → ใช้ฉาก 1 จนกว่าจะปลดล็อก */
export function effectiveHomeBackground(id: number | null | undefined, treeLevel: number): number {
  const scene = homeSceneById(id)
  if (scene && !isHomeSceneUnlocked(scene, treeLevel)) return 1
  return id ?? 1
}
