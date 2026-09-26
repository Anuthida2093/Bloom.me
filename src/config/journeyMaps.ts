import type { MapDef } from '../types.journey'

const ASSET_DIR = '/assets/images/mini-game/vitality-steps'

function defineMap(
  order: number, 
  id: string, 
  name: string, 
  entryPct: { x: number; y: number }, 
  exitPct: { x: number; y: number },
  waypoints: { x: number; y: number }[]
): MapDef {
  return { id, order, name, artAsset: `${ASSET_DIR}/map-0${order}.jpg`, waypoints, entryPct, exitPct }
}

// -------------------------------------------------------------
// [จุดเริ่มต้นอยู่ล่าง (Start) และวิ่งขึ้นบน (End)]
// คุณสามารถเปลี่ยนตัวเลข x, y ให้ตรงกับถนนในรูปได้อิสระครับ
// -------------------------------------------------------------

export const JOURNEY_MAPS: MapDef[] = [
  defineMap(1, 'crystal-cave-rainbow', 'ถ้ำคริสตัลสีรุ้ง', { x: 20, y: 85 }, { x: 80, y: 15 }, [
    { x: 25, y: 75 }, { x: 30, y: 65 }, { x: 40, y: 60 }, { x: 50, y: 55 }, { x: 55, y: 45 },
    { x: 65, y: 40 }, { x: 70, y: 30 }, { x: 75, y: 25 }, { x: 78, y: 20 }, { x: 79, y: 18 }
  ]),
  defineMap(2, 'flower-garden', 'สวนดอกไม้', { x: 78, y: 90 }, { x: 20, y: 10 }, [
    { x: 75, y: 80 }, { x: 70, y: 70 }, { x: 65, y: 60 }, { x: 55, y: 55 }, { x: 50, y: 45 },
    { x: 40, y: 35 }, { x: 35, y: 25 }, { x: 30, y: 20 }, { x: 25, y: 15 }, { x: 22, y: 12 }
  ]),
  defineMap(3, 'bamboo-forest', 'ป่าไผ่', { x: 10, y: 90 }, { x: 88, y: 10 }, [
    { x: 15, y: 80 }, { x: 20, y: 70 }, { x: 30, y: 60 }, { x: 40, y: 55 }, { x: 50, y: 45 },
    { x: 60, y: 40 }, { x: 70, y: 30 }, { x: 80, y: 20 }, { x: 85, y: 15 }, { x: 86, y: 12 }
  ]),
  defineMap(4, 'lotus-pond', 'บึงบัว', { x: 12, y: 88 }, { x: 85, y: 15 }, [
    { x: 15, y: 80 }, { x: 20, y: 70 }, { x: 30, y: 65 }, { x: 40, y: 60 }, { x: 50, y: 50 },
    { x: 60, y: 40 }, { x: 70, y: 30 }, { x: 75, y: 25 }, { x: 80, y: 20 }, { x: 82, y: 18 }
  ]),
  defineMap(5, 'stone-field', 'ทุ่งหินตั้ง', { x: 85, y: 90 }, { x: 15, y: 15 }, [
    { x: 80, y: 80 }, { x: 75, y: 70 }, { x: 65, y: 60 }, { x: 55, y: 50 }, { x: 45, y: 40 },
    { x: 35, y: 30 }, { x: 25, y: 25 }, { x: 20, y: 20 }, { x: 18, y: 18 }, { x: 16, y: 16 }
  ]),
  defineMap(6, 'mountain-range', 'เทือกเขา', { x: 12, y: 85 }, { x: 85, y: 15 }, [
    { x: 15, y: 75 }, { x: 20, y: 70 }, { x: 30, y: 60 }, { x: 40, y: 55 }, { x: 50, y: 45 },
    { x: 60, y: 40 }, { x: 70, y: 30 }, { x: 75, y: 25 }, { x: 80, y: 20 }, { x: 82, y: 18 }
  ]),
  defineMap(7, 'waterfall-valley', 'หุบเขาน้ำตก', { x: 45, y: 92 }, { x: 85, y: 15 }, [
    { x: 48, y: 85 }, { x: 50, y: 75 }, { x: 55, y: 65 }, { x: 60, y: 55 }, { x: 65, y: 45 },
    { x: 70, y: 35 }, { x: 75, y: 30 }, { x: 80, y: 25 }, { x: 82, y: 20 }, { x: 84, y: 18 }
  ]),
  defineMap(8, 'crystal-cave', 'ถ้ำคริสตัล', { x: 42, y: 90 }, { x: 85, y: 10 }, [
    { x: 45, y: 80 }, { x: 48, y: 70 }, { x: 50, y: 60 }, { x: 55, y: 50 }, { x: 60, y: 40 },
    { x: 65, y: 30 }, { x: 70, y: 25 }, { x: 75, y: 20 }, { x: 80, y: 15 }, { x: 82, y: 12 }
  ]),
