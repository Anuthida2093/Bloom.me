import type { MapDef } from '../types.journey'
import { MAP_PATH_POINTS } from '../components/quest/games/physical/journeyPathMath'
import { MUSHROOM_FOREST_SEED } from '../components/quest/games/physical/mapgen/generateMapScene'

const ASSET_DIR = '/assets/images/mini-game/vitality-steps'

// จุดเส้นทาง (Start / จุด 1, 2, ... / End) ของแต่ละแผนที่ย้ายไปอยู่ที่ MAP_PATH_POINTS ใน
// components/quest/games/physical/journeyPathMath.ts — แก้ทีละจุดที่นั่น ไฟล์นี้แค่ผูกชื่อ/ภาพ
function defineMap(order: number, id: string, name: string, generated?: MapDef['generated'], unlockLevel?: number): MapDef {
  const path = MAP_PATH_POINTS[id]
  return {
    id, order, name,
    ...(unlockLevel ? { unlockLevel } : {}),
    // แผนที่วาดด้วยโค้ดไม่มีไฟล์ภาพ — MapArtImage วาดจาก seed แทน
    artAsset: generated ? '' : `${ASSET_DIR}/map-0${order}.webp`,
    ...(generated ? { generated } : {}),
    entryPct: path.start,
    waypoints: path.points,
    exitPct: path.end,
  }
}

export const JOURNEY_MAPS: MapDef[] = [
  defineMap(1, 'crystal-cave-rainbow', 'ถ้ำคริสตัลสีรุ้ง'),
  defineMap(2, 'flower-garden', 'สวนดอกไม้'),
  defineMap(3, 'bamboo-forest', 'ป่าไผ่'),
  defineMap(4, 'lotus-pond', 'บึงบัว'),
  defineMap(5, 'stone-field', 'ทุ่งหินตั้ง'),
  defineMap(6, 'mountain-range', 'เทือกเขา'),
  defineMap(7, 'waterfall-valley', 'หุบเขาน้ำตก'),
  defineMap(8, 'crystal-cave', 'ถ้ำคริสตัล'),
  // แผนที่ 9 วาดด้วยโค้ดทั้งใบ (ทาง ทางแยก เห็ด ประตู ป่า) — ดู components/quest/games/physical/mapgen/
  // [แก้ตามที่ระบุ 2026-10-27] ล็อกจนผู้เล่นถึง Lv.50 (มีผลทันที รวมทริปที่ค้างอยู่)
  defineMap(9, 'mushroom-forest', 'ป่าเห็ดมหัศจรรย์', { seed: MUSHROOM_FOREST_SEED }, 50),
]

/** แผนที่ใบนี้เลือกได้ที่เลเวลนี้หรือยัง */
export function isMapUnlocked(map: Pick<MapDef, 'unlockLevel'>, level: number): boolean {
  return level >= (map.unlockLevel ?? 0)
}

