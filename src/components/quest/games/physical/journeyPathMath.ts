import type { MapDef } from '../../../../types.journey'

/*============================================================================*\
  journeyPathMath.ts — เรขาคณิตเส้นทางของแผนที่ Step Journey — แยกออกมาจาก
  MapPathRenderer.tsx เพราะไฟล์ component ต้อง export เฉพาะ component เท่านั้น (Fast Refresh —
  react-refresh/only-export-components) ใช้ร่วมกันทั้งจาก MapPathRenderer.tsx (วาดเส้น) และ
  CatCompanion.tsx (คำนวณตำแหน่งตัวละคร)
\*============================================================================*/

const SVG_NS = 'http://www.w3.org/2000/svg'

/*============================================================================*\
  MAP_PATH_POINTS — จุดเส้นทางของแผนที่ทั้ง 8 ใบ (แก้ได้ทีละจุดตรงนี้ที่เดียว)
  ────────────────────────────────────────────────────────────────────────────
  วิธีแก้:
    - x = ซ้าย→ขวา 0-100 (% ของความกว้างภาพ) · y = บน→ล่าง 0-100 (% ของความสูงภาพ)
    - start = จุด Start (เขียว) · points[0], points[1], ... = จุดหมายเลข 1, 2, ... (ส้ม) ตามที่เห็น
      บนแผนที่ · end = จุด End (แดง) — แมวเดินจาก start ผ่านทุกจุดตามลำดับไป end
    - เพิ่ม/ลบจุดได้อิสระ แต่ละแผนที่มีจำนวนจุดไม่เท่ากันได้ เส้นโค้งผ่านทุกจุดพอดี
    - [แก้ตามที่ระบุ — เส้นทางต้องโค้งตรงกับถนนในภาพ] จุดที่มี via: true = จุดดัดความโค้งเท่านั้น
      (เส้นผ่านจุดนี้ แต่ไม่แสดงเป็นจุดหมายเลขบนแผนที่ และไม่นับเป็นจุดที่นกฮูก "ไปถึง") — ได้จากการ
      หาเส้นกึ่งกลางถนนจากสีถนนในภาพจริง (สีทราย) แล้ววางจุดตามแนวนั้น จุดหมายเลขเดิมย้ายมาอยู่กลางถนนด้วย
    - หาค่าพิกัดง่ายๆ: เปิดเควสแล้วเติม ?editPath ท้าย URL → แตะบนแผนที่จะขึ้นพิกัด x,y ของจุดที่แตะ
  ค่าตั้งต้นลากตามถนนในภาพแต่ละใบด้วยตา (ประมาณ) — ปรับให้ตรงถนนจริงได้เลย
\*============================================================================*/

export interface MapPathPoints {
  start: { x: number; y: number }
  points: { x: number; y: number; via?: boolean }[]
  end: { x: number; y: number }
}

export const MAP_PATH_POINTS: Record<string, MapPathPoints> = {
  // ── แผนที่ 1 · map-01.jpg · ถ้ำคริสตัลสีรุ้ง — ซุ้มหินซ้ายล่าง → ประตูเหล็กขวาบน ──
  'crystal-cave-rainbow': {
    start: { x: 6, y: 95 },
    // [แก้ตามที่ระบุ] จุดเส้นทางปรับให้วิ่งตามแนวกลางถนนสีน้ำตาลในภาพ (คำนวณจากสีถนนของภาพนี้)
    points: [
      { x: 9.6, y: 95.3, via: true },
      { x: 14.3, y: 93.2, via: true },
      { x: 16, y: 93.2, via: true },
      { x: 17.4, y: 91.8, via: true },
      { x: 17.6, y: 90.4, via: true },
      { x: 19.8, y: 87.1, via: true },
      { x: 25, y: 87.1, via: true },
      { x: 26.8, y: 85.7, via: true },
      { x: 26.8, y: 83.8 }, // 1
      { x: 36.8, y: 83.4, via: true },
      { x: 39.3, y: 85.9, via: true },
      { x: 42.3, y: 85.9, via: true },
      { x: 43.6, y: 86.7 }, // 2
      { x: 45.8, y: 88.5, via: true },
      { x: 50.7, y: 90.8, via: true },
      { x: 59.9, y: 91.2, via: true },
      { x: 67.9, y: 86.1 }, // 3
      { x: 72.2, y: 84.5, via: true },
      { x: 75.5, y: 81.2, via: true },
      { x: 81.8, y: 80.9 }, // 4
      { x: 84.5, y: 80, via: true },
      { x: 87.7, y: 77.3, via: true },
      { x: 90.4, y: 73.6, via: true },
      { x: 90.4, y: 72.2 }, // 5
      { x: 82.4, y: 64, via: true },
      { x: 81.8, y: 62.6 }, // 6
      { x: 78.3, y: 59.3, via: true },
      { x: 75, y: 59.3, via: true },
      { x: 70.5, y: 59.7, via: true },
      { x: 68.3, y: 61.8, via: true },
      { x: 65, y: 61.8, via: true },
      { x: 63.8, y: 63.1 }, // 7
      { x: 56.9, y: 69.7, via: true },
      { x: 54.8, y: 69.7, via: true },
      { x: 53.8, y: 70.6, via: true },
      { x: 45.8, y: 73 }, // 8
      { x: 41.5, y: 74.4, via: true },
      { x: 31.5, y: 74.4, via: true },
      { x: 22.3, y: 73, via: true },
      { x: 20.9, y: 71.6 }, // 9
      { x: 18.4, y: 70.8, via: true },
      { x: 14.1, y: 66.5, via: true },
      { x: 14.1, y: 58.3, via: true },
      { x: 13.1, y: 54.8 }, // 10
      { x: 13.1, y: 50.3, via: true },
      { x: 15.3, y: 46.4, via: true },
      { x: 19.2, y: 42.5, via: true },
      { x: 22.1, y: 41.5 }, // 11
      { x: 23.7, y: 40.9, via: true },
      { x: 28.8, y: 40.9, via: true },
      { x: 34.4, y: 44.2, via: true },
      { x: 37, y: 46.8, via: true },
      { x: 38.7, y: 46.8 }, // 12
      { x: 42.9, y: 50.9, via: true },
      { x: 44.8, y: 51.9, via: true },
      { x: 52.3, y: 52.1, via: true },
      { x: 53.6, y: 51.3, via: true },
      { x: 55.8, y: 51.3, via: true },
      { x: 63.4, y: 44 }, // 13
      { x: 63.6, y: 40.7, via: true },
      { x: 61.8, y: 38.9 }, // 14
      { x: 53.2, y: 35.8, via: true },
      { x: 49.9, y: 32.5, via: true },
      { x: 47.7, y: 29.2 }, // 15
      { x: 42.9, y: 24.5, via: true },
      { x: 42.9, y: 19.6, via: true },
      { x: 46.8, y: 15.9 }, // 16
      { x: 49.9, y: 14.7, via: true },
      { x: 55.6, y: 14.7, via: true },
      { x: 60.1, y: 16.4, via: true },
      { x: 65.2, y: 20.5 }, // 17
      { x: 67.1, y: 22.5, via: true },
      { x: 70.5, y: 24.1, via: true },
      { x: 78.9, y: 24.7, via: true },
      { x: 82.8, y: 23.1, via: true },
    ],
    end: { x: 86, y: 20 },
  },

  // ── แผนที่ 2 · map-02.jpg · สวนดอกไม้ — ประตูเหล็กขวาล่าง → ซุ้มดอกไม้ซ้ายบน ──
  'flower-garden': {
    start: { x: 90, y: 95 },
    // [แก้ตามที่ระบุ] จุดเส้นทางปรับให้วิ่งตามแนวกลางถนนสีน้ำตาลในภาพ (คำนวณจากสีถนนของภาพนี้)
    points: [
      { x: 84.7, y: 89.6, via: true },
      { x: 80, y: 87.9, via: true },
      { x: 77.7, y: 85.1 }, // 1
      { x: 76.5, y: 81.8, via: true },
      { x: 72, y: 77.3, via: true },
      { x: 67.9, y: 76.9, via: true },
      { x: 65.8, y: 75.3, via: true },
      { x: 62.8, y: 75.3 }, // 2
      { x: 58.1, y: 75.5, via: true },
      { x: 55.2, y: 77.3, via: true },
      { x: 43.6, y: 76.7 }, // 3
      { x: 41.9, y: 76.7, via: true },
      { x: 38.2, y: 74.6, via: true },
      { x: 33.3, y: 69.7, via: true },
      { x: 33.3, y: 67.9 }, // 4
      { x: 38.4, y: 62.8 }, // 5
      { x: 41.1, y: 62.4, via: true },
      { x: 42.3, y: 63.6, via: true },
      { x: 54.4, y: 63.6, via: true },
      { x: 59.7, y: 61.3 }, // 6
      { x: 62.2, y: 60.1, via: true },
      { x: 67.9, y: 54.4, via: true },
      { x: 69.3, y: 51.7 }, // 7
      { x: 67.7, y: 48.7, via: true },
      { x: 67.7, y: 44, via: true },
      { x: 71.6, y: 40.1, via: true },
      { x: 73, y: 40.1 }, // 8
      { x: 71.8, y: 38.9, via: true },
      { x: 71.2, y: 36.6, via: true },
      { x: 66.3, y: 31.5, via: true },
      { x: 62.8, y: 31.5, via: true },
      { x: 61.8, y: 30.7 }, // 9
      { x: 60.7, y: 29.5, via: true },
      { x: 55.8, y: 29.5, via: true },
      { x: 46.8, y: 34.1, via: true },
      { x: 44.8, y: 34.2 }, // 10
      { x: 44, y: 35, via: true },
      { x: 37, y: 35, via: true },
      { x: 32.5, y: 33.3, via: true },
      { x: 29.5, y: 31.3 }, // 11
      { x: 28.6, y: 31.3, via: true },
      { x: 24.5, y: 27.8, via: true },
      { x: 20, y: 26.6, via: true },
      { x: 16.8, y: 26.6, via: true },
      { x: 16.4, y: 24.5, via: true },
      { x: 18.6, y: 22.3 }, // 12
      { x: 18.4, y: 20.4, via: true },
      { x: 16, y: 18.4, via: true },
      { x: 15.9, y: 17, via: true },
    ],
    end: { x: 13, y: 14 },
  },

  // ── แผนที่ 3 · map-03.jpg · ป่าไผ่ — โทริอิซ้ายล่าง → โทริอิขวาบน ──
  'bamboo-forest': {
    start: { x: 6, y: 95 },
    // [แก้ตามที่ระบุ] จุดเส้นทางปรับให้วิ่งตามแนวกลางถนนสีน้ำตาลในภาพ (คำนวณจากสีถนนของภาพนี้)
    points: [
      { x: 7, y: 94.9, via: true },
      { x: 10.6, y: 91.4, via: true },
      { x: 14.1, y: 91.4, via: true },
      { x: 18.6, y: 87.3 }, // 1
      { x: 20, y: 85.9, via: true },
      { x: 21.9, y: 85.3, via: true },
      { x: 29.5, y: 85.1, via: true },
      { x: 30.3, y: 85.9, via: true },
      { x: 33.1, y: 85.9, via: true },
      { x: 34.8, y: 87.5, via: true },
      { x: 37.4, y: 87.9, via: true },
      { x: 40.5, y: 90 }, // 2
      { x: 43.2, y: 90.8, via: true },
      { x: 47.4, y: 90.8, via: true },
      { x: 50.3, y: 89.6, via: true },
      { x: 54.8, y: 85.1, via: true },
      { x: 56.4, y: 85.1 }, // 3
      { x: 62.4, y: 85.1, via: true },
      { x: 66.5, y: 87.1, via: true },
      { x: 67.9, y: 87.1, via: true },
      { x: 71.8, y: 90, via: true },
      { x: 74.6, y: 91 }, // 4
      { x: 83.4, y: 91, via: true },
      { x: 86.3, y: 89.6, via: true },
      { x: 89.4, y: 86.5, via: true },
      { x: 90.4, y: 84.3 }, // 5
      { x: 90.2, y: 81.8, via: true },
      { x: 87.1, y: 78.5 }, // 6
      { x: 82.4, y: 76.1, via: true },
      { x: 79.5, y: 73.2, via: true },
      { x: 79.5, y: 69.9, via: true },
      { x: 81.2, y: 68.1 }, // 7
      { x: 86.9, y: 65.4, via: true },
      { x: 90.8, y: 61.4, via: true },
      { x: 91.4, y: 60.7, via: true },
      { x: 91, y: 56.4 }, // 8
      { x: 88.6, y: 53.8, via: true },
      { x: 84.7, y: 51.9, via: true },
      { x: 81.4, y: 48.9, via: true },
      { x: 81.4, y: 46.8, via: true },
      { x: 83.4, y: 44.8, via: true },
      { x: 88.6, y: 42.9 }, // 9
      { x: 85.9, y: 44 }, // 10
      { x: 81.4, y: 45.8, via: true },
      { x: 76.7, y: 45.8, via: true },
      { x: 72, y: 44.8, via: true },
      { x: 68.5, y: 42.7 }, // 11
      { x: 66.5, y: 42.7, via: true },
      { x: 62, y: 38.2, via: true },
      { x: 59.9, y: 38.2, via: true },
      { x: 57.5, y: 36 }, // 12
      { x: 55.4, y: 36, via: true },
      { x: 51.1, y: 33.7, via: true },
      { x: 47, y: 33.9, via: true },
      { x: 43.1, y: 32.9, via: true },
      { x: 39.9, y: 29.9, via: true },
      { x: 39.9, y: 26.8, via: true },
      { x: 44.8, y: 21.3, via: true },
      { x: 49.7, y: 20.7, via: true },
      { x: 50.7, y: 19.8, via: true },
      { x: 52.8, y: 19.6, via: true },
      { x: 54.2, y: 19.6, via: true },
      { x: 55.4, y: 20.7 }, // 13
      { x: 55.4, y: 16.6, via: true },
      { x: 60.3, y: 12.7 }, // 14
      { x: 62.8, y: 11.2, via: true },
      { x: 68.3, y: 10.2, via: true },
      { x: 72.2, y: 11.2, via: true },
      { x: 75.5, y: 13.3 }, // 15
      { x: 80.6, y: 14.5, via: true },
      { x: 86.3, y: 13.9, via: true },
      { x: 92, y: 9.2, via: true },
    ],
    end: { x: 92, y: 7 },
  },

  // ── แผนที่ 4 · map-04.jpg · บึงบัว — ประตูซ้ายล่าง → ซุ้มหินขวาบน ──
  'lotus-pond': {
    start: { x: 3, y: 90 },
    points: [
      { x: 7.1, y: 92.2, via: true },
      { x: 9.8, y: 91.7, via: true },
      { x: 18.3, y: 84.7 }, // 1
      { x: 28.3, y: 80.1, via: true },
      { x: 35.5, y: 79.6 }, // 2
      { x: 45.9, y: 83.3, via: true },
      { x: 53.1, y: 83.1 }, // 3
      { x: 61.7, y: 79.5, via: true },
      { x: 68.2, y: 73.3 }, // 4
      { x: 71.2, y: 70.3, via: true },
      { x: 81.5, y: 67.5, via: true },
      { x: 84.6, y: 65.4 }, // 5
      { x: 86.6, y: 61.5, via: true },
      { x: 85.8, y: 57, via: true },
      { x: 86, y: 51.1 }, // 6
      { x: 84.8, y: 45.6, via: true },
      { x: 86, y: 41.2, via: true },
      { x: 84.7, y: 36.7 }, // 7
      { x: 78.2, y: 27.9 }, // 8
    ],
    end: { x: 88, y: 18 },
  },

  // ── แผนที่ 5 · map-05.jpg · ทุ่งหินตั้ง — ซุ้มหินขวาล่าง → ประตูไม้ซ้ายบน ──
  'stone-field': {
    start: { x: 96, y: 95 },
    points: [
      { x: 88.6, y: 90.4 }, // 1
      { x: 85.6, y: 88.7, via: true },
      { x: 80.7, y: 87.5, via: true },
      { x: 76, y: 84.9 }, // 2
      { x: 70.8, y: 83.3, via: true },
      { x: 66, y: 82.9, via: true },
      { x: 55.3, y: 86 }, // 3
      { x: 50.4, y: 87.3, via: true },
      { x: 43.6, y: 87, via: true },
      { x: 37.1, y: 85.3, via: true },
      { x: 32.7, y: 83 }, // 4
      { x: 29.6, y: 79.7, via: true },
      { x: 28.2, y: 76.6, via: true },
      { x: 28.2, y: 74, via: true },
      { x: 29.8, y: 71.7 }, // 5
      { x: 34.9, y: 68.7, via: true },
      { x: 42.2, y: 67.6 }, // 6
      { x: 53.3, y: 65.4, via: true },
      { x: 57.9, y: 63.3, via: true },
      { x: 62.1, y: 60.2 }, // 7
      { x: 73.1, y: 53.2 }, // 8
      { x: 77.7, y: 47.5, via: true },
      { x: 81.2, y: 44.2 }, // 9
      { x: 84.5, y: 41, via: true },
      { x: 86, y: 37.8, via: true },
      { x: 85.9, y: 34.8, via: true },
      { x: 84.2, y: 32 }, // 10
      { x: 73.7, y: 23.8 }, // 11
      { x: 71.2, y: 22.9, via: true },
      { x: 66.2, y: 24, via: true },
      { x: 59.7, y: 23.9 }, // 12
      { x: 52.8, y: 23.2, via: true },
      { x: 45.3, y: 25.4 }, // 13
      { x: 35.6, y: 31.5, via: true },
      { x: 30.1, y: 32.7 }, // 14
      { x: 23.5, y: 32.4, via: true },
      { x: 16.8, y: 30.2, via: true },
      { x: 13.8, y: 27.9, via: true },
    ],
    end: { x: 13, y: 24 },
  },

  // ── แผนที่ 6 · map-06.jpg · เทือกเขา — ซุ้มหินซ้ายล่าง → ซุ้มหินขวาบน ──
  'mountain-range': {
    start: { x: 3, y: 93 },
    points: [
      { x: 7.5, y: 93, via: true },
      { x: 16, y: 88.1 }, // 1
      { x: 30, y: 81.4, via: true },
      { x: 35.1, y: 80.1 }, // 2
      { x: 42.2, y: 81.1, via: true },
      { x: 53.9, y: 87.2 }, // 3
      { x: 60, y: 89.3, via: true },
      { x: 65.1, y: 89.2, via: true },
      { x: 70.8, y: 86.5, via: true },
      { x: 71.8, y: 85.1, via: true },
      { x: 71.7, y: 83.6 }, // 4
      { x: 70.5, y: 72.2 }, // 5
      { x: 69.7, y: 68.7, via: true },
      { x: 70.2, y: 64.3, via: true },
      { x: 69, y: 62.7, via: true },
      { x: 66, y: 61 }, // 6
      { x: 58.6, y: 59.1, via: true },
      { x: 47.5, y: 61.9 }, // 7
      { x: 35.6, y: 66.9, via: true },
      { x: 27.5, y: 67.7 }, // 8
      { x: 24.5, y: 66.5, via: true },
      { x: 17.3, y: 59.8, via: true },
      { x: 16.4, y: 57.9, via: true },
      { x: 16.6, y: 55.1 }, // 9
      { x: 17.5, y: 48.1, via: true },
      { x: 21.8, y: 40.1 }, // 10
      { x: 24.2, y: 36.8, via: true },
      { x: 26.8, y: 35.4, via: true },
      { x: 30.7, y: 35.1, via: true },
      { x: 35.9, y: 36 }, // 11
      { x: 45.4, y: 36.7, via: true },
      { x: 50.7, y: 39 }, // 12
      { x: 58, y: 45.5, via: true },
      { x: 62.2, y: 47.9 }, // 13
      { x: 69.8, y: 49.7, via: true },
      { x: 79.6, y: 48.5 }, // 14
      { x: 83.4, y: 46.8, via: true },
      { x: 86.1, y: 44.1, via: true },
      { x: 87, y: 41, via: true },
      { x: 85.8, y: 38.3 }, // 15
      { x: 79.2, y: 32, via: true },
      { x: 78.4, y: 29.7, via: true },
      { x: 78.7, y: 27.1 }, // 16
      { x: 80.9, y: 23.9, via: true },
      { x: 87.1, y: 20, via: true },
    ],
    end: { x: 89, y: 17 },
  },

  // ── แผนที่ 7 · map-07.jpg · หุบเขาน้ำตก — ซุ้มดอกไม้กลางล่าง → ประตูขวาบน ──
  'waterfall-valley': {
    start: { x: 50, y: 97 },
    points: [
      { x: 50.5, y: 88.3, via: true },
      { x: 49.9, y: 86.3 }, // 1
      { x: 48.1, y: 85, via: true },
      { x: 44.4, y: 84.1, via: true },
      { x: 33.5, y: 84.4 }, // 2
      { x: 24.1, y: 81.2, via: true },
      { x: 17.7, y: 73.2 }, // 3
      { x: 13.2, y: 64.7 }, // 4
      { x: 16.9, y: 60.2, via: true },
      { x: 20.2, y: 57.8 }, // 5
      { x: 33, y: 53.6 }, // 6
      { x: 40.2, y: 52.2, via: true },
      { x: 50.2, y: 47.3 }, // 7
      { x: 60.7, y: 41.5, via: true },
      { x: 68, y: 38.8 }, // 8
      { x: 78, y: 32.7 }, // 9
      { x: 79.9, y: 30, via: true },
      { x: 79.3, y: 24.1, via: true },
      { x: 81, y: 22 }, // 10
    ],
    end: { x: 86, y: 13 },
  },

  // ── แผนที่ 8 · map-08.jpg · ถ้ำคริสตัล — ประตูไม้กลางล่าง → ประตูไม้ขวาบน ──
  'crystal-cave': {
    start: { x: 51, y: 92 },
    points: [
      { x: 49.5, y: 84.3, via: true },
      { x: 47.7, y: 80.1 }, // 1
      { x: 43.4, y: 74.4, via: true },
      { x: 39.7, y: 72.3, via: true },
      { x: 39, y: 70.8 }, // 2
      { x: 38.1, y: 64 }, // 3
      { x: 38.9, y: 62.3, via: true },
      { x: 46.6, y: 58 }, // 4
      { x: 50.1, y: 53.8, via: true },
      { x: 56.8, y: 51.3 }, // 5
      { x: 63.7, y: 48, via: true },
      { x: 66.2, y: 48.1 }, // 6
      { x: 74.9, y: 51.1, via: true },
      { x: 78.9, y: 50.2 }, // 7
      { x: 84.5, y: 45.1, via: true },
      { x: 85.5, y: 43, via: true },
      { x: 85.3, y: 41 }, // 8
      { x: 84.6, y: 38.2, via: true },
      { x: 84.5, y: 29.9 }, // 9
      { x: 81.6, y: 22.8, via: true },
      { x: 82.2, y: 20.4 }, // 10
      { x: 84, y: 18.2, via: true },
    ],
    end: { x: 86, y: 10 },
  },
}

/** [เพิ่มรอบนี้ — ปรับ layout เต็มจอ] ขนาดจริงของไฟล์ภาพแผนที่ทุกใบ (เช็คจริงจาก JPEG header
 *  ของทั้ง 8 ไฟล์ใน public/assets/images/mini-game/vitality-steps/ แล้ว — ทุกใบเป็นจัตุรัส
 *  1024x1024px เป๊ะ) ใช้เป็น "ขนาดโลก" คงที่ให้ useMapPanZoom.ts คำนวณ cover-zoom และให้
 *  MapPathRenderer.tsx ตั้งขนาดกล่องของตัวเองตรงกันเสมอ (ไม่ใช้ width:100%/aspect-ratio แบบเดิม
 *  อีกต่อไป เพราะ viewport ตอนนี้เต็มพื้นที่ที่เหลือทั้งหมด ไม่ใช่จัตุรัสคงที่แล้ว) */
export const MAP_NATIVE_SIZE = { width: 1024, height: 1024 }

/** [แก้รอบนี้ — feedback รอบ 2: เส้นทางต้องโค้งตามภาพจริง ไม่ใช่เส้นตรง] แปลงจุด waypoints
 *  (entryPct → waypoints → exitPct) เป็นเส้นโค้ง Catmull-Rom แปลงเป็น cubic Bezier (τ=1/6 —
 *  สูตรมาตรฐาน "uniform Catmull-Rom to Bezier") แทนการลาก L เส้นตรงต่อกันแบบเดิม — เส้นโค้งจะ
 *  ผ่าน "ทุกจุด" ที่ปักไว้พอดี (ต่างจาก bezier ทั่วไปที่จุดกลางเป็นแค่ control point ไม่ใช่จุดที่
 *  เส้นจริงผ่าน) เหมาะกับงานนี้เพราะแต่ละจุดคือตำแหน่งจริงบนเส้นทางที่ปักด้วยมือต่อภาพ (ดู
 *  journeyMaps.ts) จุดต้น/ปลายที่ไม่มีเพื่อนบ้านครบ 4 จุด (ต้องการ P(i-1)..P(i+2) ต่อช่วง) ใช้จุด
 *  ปลายซ้ำแทน (P(-1)=P(0), P(n+1)=P(n)) ตามมาตรฐานการทำ open Catmull-Rom spline */
function catmullRomToBezierPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

/** คืน mapDef ที่ใช้จุดเส้นทาง "ล่าสุด" จาก MAP_PATH_POINTS เสมอ — ผู้วาด (MapPathRenderer/
 *  CatCompanion) เรียกทุกครั้งที่ render จึงเห็นตัวเลขที่แก้ทันที ไม่ติดค่าเก่าที่ถูกสร้างค้างไว้
 *  ใน JOURNEY_MAPS/props ตอนโหลดหน้า (แก้ไฟล์นี้ระหว่าง npm run dev → จุดย้ายตามโดยไม่ต้องรีเฟรช) */
export function withLivePath<T extends Pick<MapDef, 'id' | 'entryPct' | 'waypoints' | 'exitPct'>>(mapDef: T): T {
  const live = MAP_PATH_POINTS[mapDef.id]
  return live ? { ...mapDef, entryPct: live.start, waypoints: live.points, exitPct: live.end } : mapDef
}

export function buildJourneyPathD(mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>): string {
  const points = [mapDef.entryPct, ...mapDef.waypoints, mapDef.exitPct]
  return catmullRomToBezierPath(points)
}

/** คำนวณตำแหน่ง {x,y}% บนเส้นทาง ณ progressPct (0-100) ด้วย SVG DOM API จริง
 *  (path.getPointAtLength()) — สร้าง <path> แบบลอย ไม่ต้อง mount เข้า DOM จริงก็คำนวณเรขาคณิตได้
 *  (getTotalLength/getPointAtLength ไม่ต้องพึ่ง layout/viewport) */
export function getPointAtProgress(
  mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>,
  progressPct: number,
): { x: number; y: number } {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', buildJourneyPathD(mapDef))
  const totalLength = path.getTotalLength()
  const clampedPct = Math.min(100, Math.max(0, progressPct))
  const point = path.getPointAtLength((clampedPct / 100) * totalLength)
  return { x: point.x, y: point.y }
}

/*  ── เรขาคณิตแบบคณิตศาสตร์ล้วน (ไม่ใช้ DOM) ── ใช้หาจุดบนเส้นทาง
    ต้องได้ผลเดียวกับเส้นที่ MapPathRenderer วาด (Catmull-Rom → Bezier
    สูตรเดียวกับ catmullRomToBezierPath ด้านบน) และใช้ได้ในเทสต์/สคริปต์ที่ไม่มี SVG DOM */

type Pt = { x: number; y: number }

function bezierSegments(points: Pt[]): [Pt, Pt, Pt, Pt][] {
  const segs: [Pt, Pt, Pt, Pt][] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    segs.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2,
    ])
  }
  return segs
}

/** จุดตัวอย่างตามเส้นทาง + ความยาวสะสม (หน่วย % ของภาพ เหมือน viewBox 0-100) */
export function samplePath(mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>, perSegment = 64): { pt: Pt; len: number }[] {
  const out: { pt: Pt; len: number }[] = []
  let len = 0
  let prev: Pt | null = null
  for (const [a, b, c, d] of bezierSegments([mapDef.entryPct, ...mapDef.waypoints, mapDef.exitPct])) {
    // ช่วงถัดไปเริ่มที่จุดปลายของช่วงก่อน — ข้ามจุดแรกกันจุดซ้ำ
    const first: number = prev ? 1 : 0
    for (let k = first; k <= perSegment; k++) {
      const t: number = k / perSegment
      const u: number = 1 - t
      const pt: Pt = {
        x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
        y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
      }
      if (prev) len += Math.hypot(pt.x - prev.x, pt.y - prev.y)
      out.push({ pt, len })
      prev = pt
    }
  }
  return out
}

/** % ของความยาวเส้นทาง (0-100) ณ จุดบนเส้นที่ใกล้ `point` ที่สุด */
export function nearestPathPct(mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>, point: Pt): number {
  const samples = samplePath(mapDef)
  const total = samples[samples.length - 1]?.len ?? 0
  if (total <= 0) return 0
  let best = samples[0]
  let bestD = Infinity
  for (const s of samples) {
    const d = (s.pt.x - point.x) ** 2 + (s.pt.y - point.y) ** 2
    if (d < bestD) { bestD = d; best = s }
  }
  return (best.len / total) * 100
}

/** จุด {x,y}% ที่ระยะ pathPct (0-100) ของความยาวเส้นทาง — คณิตศาสตร์ล้วน (ไม่ใช้ DOM) ใช้วาง
 *  สิ่งของให้อยู่บนเส้นทางพอดี */
export function pointAtPathPct(mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>, pathPct: number): Pt {
  const samples = samplePath(mapDef)
  const total = samples[samples.length - 1]?.len ?? 0
  const target = (Math.min(100, Math.max(0, pathPct)) / 100) * total
  const hit = samples.find((s) => s.len >= target) ?? samples[samples.length - 1]
  return { x: Math.round(hit.pt.x * 10) / 10, y: Math.round(hit.pt.y * 10) / 10 }
}

/** [แก้ตามที่ระบุ — นกฮูกเลี้ยวตามเส้นทาง] ตำแหน่ง + ทิศทาง (เวกเตอร์สัมผัสเส้น) ณ pathPct บนเส้นโค้ง
 *  ใช้ samples ที่คำนวณไว้แล้ว (samplePath) — เรียกได้ทุกเฟรมของแอนิเมชันโดยไม่ต้องสร้าง SVG ใหม่ */
export function poseAtPathPct(samples: { pt: Pt; len: number }[], pathPct: number): { x: number; y: number; dx: number; dy: number } {
  const total = samples[samples.length - 1]?.len ?? 0
  if (samples.length === 0) return { x: 0, y: 0, dx: 1, dy: 0 }
  const target = (Math.min(100, Math.max(0, pathPct)) / 100) * total
  let i = samples.findIndex((s) => s.len >= target)
  if (i <= 0) i = 1
  if (i === -1 || i >= samples.length) i = samples.length - 1
  const a = samples[i - 1], b = samples[i]
  const t = b.len > a.len ? (target - a.len) / (b.len - a.len) : 0
  return {
    x: a.pt.x + (b.pt.x - a.pt.x) * t,
    y: a.pt.y + (b.pt.y - a.pt.y) * t,
    dx: b.pt.x - a.pt.x,
    dy: b.pt.y - a.pt.y,
  }
}

/** จุดหมายเลขที่แสดงบนแผนที่ (ไม่รวมจุดดัดความโค้ง via) */
export function markerWaypoints(mapDef: Pick<MapDef, 'waypoints'>): { x: number; y: number }[] {
  return mapDef.waypoints.filter((wp) => !wp.via)
}

/** % ตามความยาวเส้นทาง (0-100) ของจุดหมายเลขแต่ละจุด — ใช้บอกว่านกฮูกผ่านจุดไหนแล้ว */
export function waypointPathPcts(mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>): number[] {
  return markerWaypoints(mapDef).map((wp) => nearestPathPct(mapDef, wp))
}
