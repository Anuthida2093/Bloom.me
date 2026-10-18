import type { MapDef } from '../types.journey'
import { MAP_PATH_POINTS } from '../components/quest/games/physical/journeyPathMath'

const ASSET_DIR = '/assets/images/mini-game/vitality-steps'

// จุดเส้นทาง (Start / จุด 1, 2, ... / End) ของแต่ละแผนที่ย้ายไปอยู่ที่ MAP_PATH_POINTS ใน
// components/quest/games/physical/journeyPathMath.ts — แก้ทีละจุดที่นั่น ไฟล์นี้แค่ผูกชื่อ/ภาพ
function defineMap(order: number, id: string, name: string): MapDef {
  const path = MAP_PATH_POINTS[id]
  return {
    id, order, name,
    artAsset: `${ASSET_DIR}/map-0${order}.webp`,
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
]
