import type { MapDef } from '../../../../types.journey'
import { generateMapRoute, type FeatureKind } from './mapgen/generateMapScene'

/*============================================================================*\
  mapPlaces — [ใหม่ตามที่ระบุ] ชื่อสถานที่ของแต่ละแผนที่ (ปราสาทหิน ป่าพิศวง ...) ที่เดียว
  ────────────────────────────────────────────────────────────────────────────
  ใช้ทั้งแผนที่ย่อมุมซ้ายบน (MiniMap) และป้ายบนแผนที่ใหญ่ของแผนที่โค้ด (MapLandmarks)
  - แผนที่วาดด้วยโค้ด (9): ชื่อ/ตำแหน่งมาจากจุดเด่นที่ตัวสร้างฉากวางจริง (generateMapRoute)
  - แผนที่ภาพวาด 1-8: ตำแหน่งอ่านจากภาพแต่ละใบ (% ของภาพ — กลางสิ่งนั้น) แก้ชื่อ/ตำแหน่งได้ที่ตารางนี้
\*============================================================================*/

export interface MapPlace { id: string; text: string; icon: string; x: number; y: number }

export const FEATURE_ICON: Partial<Record<FeatureKind, string>> = {
  castle: '🏰', mystic: '🌲', 'crystal-nook': '💎', grove: '🍄', island: '🌈',
}

const p = (id: string, text: string, icon: string, x: number, y: number): MapPlace => ({ id, text, icon, x, y })

/** แผนที่ภาพวาด 1-8 — x, y = % ของภาพ (กลางสิ่งนั้น) */
const PAINTED_PLACES: Record<string, MapPlace[]> = {
  'crystal-cave-rainbow': [
    p('waterfall', 'น้ำตกเรืองแสง', '💧', 27, 22),
    p('rainbow-island', 'เกาะเห็ดสีรุ้ง', '🍄', 31, 60),
    p('hollow-oak', 'ต้นโอ๊กบ้านโพรง', '🌳', 88, 48),
    p('crystal-field', 'ลานคริสตัล', '💎', 60, 26),
  ],
  'flower-garden': [
    p('rose-arch', 'ซุ้มกุหลาบ', '🌹', 20, 18),
    p('gazebo', 'ศาลาในสวน', '🏡', 15, 43),
    p('fountain', 'น้ำพุ', '⛲', 50, 52),
    p('bee-garden', 'สวนผึ้ง', '🐝', 88, 62),
  ],
  'bamboo-forest': [
    p('pagoda', 'เจดีย์ 7 ชั้น', '🛕', 51, 45),
    p('koi-pond', 'สระปลาคาร์ป', '🐟', 80, 60),
    p('bridges', 'ลำธารสะพานไม้', '🌉', 58, 62),
    p('gazebo', 'ศาลาป่าไผ่', '🎋', 29, 36),
  ],
  'lotus-pond': [
    p('lotus-lake', 'บึงบัว', '🪷', 30, 55),
    p('spring-cave', 'ถ้ำต้นน้ำ', '⛰️', 63, 10),
    p('shrine', 'ศาลหิน', '⛩️', 38, 15),
    p('waterfall-cave', 'น้ำตกในถ้ำ', '💧', 93, 77),
  ],
  'stone-field': [
    p('stone-circle', 'วงหินตั้ง', '🗿', 60, 16),
    p('pond', 'บ่อน้ำใส', '💧', 65, 48),
    p('flower-island', 'เกาะดอกไม้', '🌸', 55, 73),
  ],
  'mountain-range': [
    p('peaks', 'ยอดเขาหิมะ', '🏔️', 50, 8),
    p('dragon', 'มังกรหินหลับ', '🐉', 72, 40),
    p('waterfall', 'น้ำตกบ่อใส', '💧', 44, 50),
    p('old-pines', 'ป่าสนเก่า', '🌲', 85, 72),
  ],
  'waterfall-valley': [
    p('waterfall', 'น้ำตกหน้าผา', '💧', 37, 32),
    p('rope-bridge', 'สะพานแขวน', '🌉', 50, 46),
    p('rock-house', 'บ้านในโขดหิน', '🪨', 8, 50),
    p('pool', 'แอ่งน้ำวน', '🌊', 45, 72),
  ],
  'crystal-cave': [
    p('lily-pond', 'บ่อบัว', '🪷', 70, 15),
    p('green-crystals', 'คริสตัลเขียว', '💎', 67, 30),
    p('moss-stone', 'หินตะไคร่ใหญ่', '🪨', 53, 38),
    p('pink-mushrooms', 'เห็ดชมพู', '🍄', 73, 45),
    p('vine-arch', 'ซุ้มเถาวัลย์', '🌿', 15, 70),
  ],
}

/** ชื่อสถานที่ของแผนที่ใบนี้ (x, y = % ของแผนที่ ที่กลางสิ่งนั้น) · labelY = จุดวางป้ายเหนือสิ่งนั้นบนแผนที่ใหญ่ */
export function placesOf(mapDef: Pick<MapDef, 'id' | 'generated'>): (MapPlace & { labelY: number })[] {
  if (mapDef.generated) {
    const layout = generateMapRoute(mapDef.generated.seed)
    const pct = (v: number) => (v / layout.world) * 100
    return layout.features.flatMap((f) => (f.label
      ? [{ id: f.id, text: f.label, icon: FEATURE_ICON[f.kind] ?? '📍', x: pct(f.x), y: pct(f.y), labelY: pct(f.y - f.r * 1.1) }]
      : []))
  }
  return (PAINTED_PLACES[mapDef.id] ?? []).map((q) => ({ ...q, labelY: q.y }))
}
