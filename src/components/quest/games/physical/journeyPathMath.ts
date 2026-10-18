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
    - หาค่าพิกัดง่ายๆ: เปิดเควสแล้วเติม ?editPath ท้าย URL → แตะบนแผนที่จะขึ้นพิกัด x,y ของจุดที่แตะ
  ค่าตั้งต้นลากตามถนนในภาพแต่ละใบด้วยตา (ประมาณ) — ปรับให้ตรงถนนจริงได้เลย
\*============================================================================*/

export interface MapPathPoints {
  start: { x: number; y: number }
  points: { x: number; y: number }[]
  end: { x: number; y: number }
}

export const MAP_PATH_POINTS: Record<string, MapPathPoints> = {
  // ── แผนที่ 1 · map-01.jpg · ถ้ำคริสตัลสีรุ้ง — ซุ้มหินซ้ายล่าง → ประตูเหล็กขวาบน ──
  'crystal-cave-rainbow': {
    start: { x: 6, y: 95 },
    points: [
      { x: 22, y: 85 }, // 1 ลอดซุ้มหินซ้ายล่าง
      { x: 45, y: 84 }, // 2
      { x: 68, y: 86 }, // 3
      { x: 82, y: 81 }, // 4 สะพานไม้ล่าง
      { x: 91, y: 72 }, // 5
      { x: 82, y: 61 }, // 6
      { x: 64, y: 63 }, // 7 สะพานกลาง
      { x: 45, y: 70 }, // 8
      { x: 22, y: 69 }, // 9
      { x: 12, y: 55 }, // 10
      { x: 22, y: 41 }, // 11
      { x: 42, y: 42 }, // 12
      { x: 58, y: 46 }, // 13 สะพานบน
      { x: 63, y: 37 }, // 14
      { x: 50, y: 27 }, // 15
      { x: 47, y: 17 }, // 16
      { x: 65, y: 21 }, // 17
    ],
    end: { x: 86, y: 20 },
  },

  // ── แผนที่ 2 · map-02.jpg · สวนดอกไม้ — ประตูเหล็กขวาล่าง → ซุ้มดอกไม้ซ้ายบน ──
  'flower-garden': {
    start: { x: 90, y: 95 },
    points: [
      { x: 78, y: 85 }, // 1 ประตูเหล็ก
      { x: 62, y: 79 }, // 2
      { x: 44, y: 76 }, // 3
      { x: 33, y: 68 }, // 4
      { x: 38, y: 60 }, // 5
      { x: 60, y: 62 }, // 6 ใต้น้ำพุ
      { x: 70, y: 52 }, // 7
      { x: 72, y: 40 }, // 8
      { x: 62, y: 32 }, // 9
      { x: 45, y: 35 }, // 10
      { x: 30, y: 30 }, // 11
      { x: 20, y: 22 }, // 12
    ],
    end: { x: 13, y: 14 },
  },

  // ── แผนที่ 3 · map-03.jpg · ป่าไผ่ — โทริอิซ้ายล่าง → โทริอิขวาบน ──
  'bamboo-forest': {
    start: { x: 6, y: 95 },
    points: [
      { x: 20, y: 88 }, // 1 โทริอิซ้ายล่าง
      { x: 40, y: 86 }, // 2
      { x: 56, y: 87 }, // 3
      { x: 75, y: 88 }, // 4
      { x: 90, y: 84 }, // 5
      { x: 90, y: 74 }, // 6
      { x: 80, y: 67 }, // 7
      { x: 88, y: 57 }, // 8
      { x: 92, y: 47 }, // 9
      { x: 85, y: 40 }, // 10
      { x: 70, y: 37 }, // 11
      { x: 59, y: 31 }, // 12
      { x: 55, y: 21 }, // 13
      { x: 60, y: 12 }, // 14
      { x: 76, y: 10 }, // 15
    ],
    end: { x: 92, y: 7 },
  },

  // ── แผนที่ 4 · map-04.jpg · บึงบัว — ประตูซ้ายล่าง → ซุ้มหินขวาบน ──
  'lotus-pond': {
    start: { x: 3, y: 90 },
    points: [
      { x: 18, y: 84 }, // 1 ประตูซ้ายล่าง
      { x: 35, y: 82 }, // 2
      { x: 52, y: 79 }, // 3
      { x: 68, y: 73 }, // 4 สะพานโค้งล่าง
      { x: 83, y: 64 }, // 5
      { x: 88, y: 51 }, // 6
      { x: 82, y: 38 }, // 7
      { x: 78, y: 28 }, // 8
    ],
    end: { x: 88, y: 18 },
  },

  // ── แผนที่ 5 · map-05.jpg · ทุ่งหินตั้ง — ซุ้มหินขวาล่าง → ประตูไม้ซ้ายบน ──
  'stone-field': {
    start: { x: 96, y: 95 },
    points: [
      { x: 90, y: 88 }, // 1 ซุ้มหินขวาล่าง
      { x: 76, y: 85 }, // 2
      { x: 55, y: 85 }, // 3
      { x: 35, y: 80 }, // 4
      { x: 28, y: 70 }, // 5
      { x: 42, y: 65 }, // 6
      { x: 62, y: 60 }, // 7 สะพานไม้
      { x: 74, y: 54 }, // 8
      { x: 81, y: 44 }, // 9
      { x: 85, y: 31 }, // 10
      { x: 75, y: 22 }, // 11
      { x: 60, y: 22 }, // 12
      { x: 45, y: 25 }, // 13
      { x: 30, y: 30 }, // 14
    ],
    end: { x: 13, y: 24 },
  },

  // ── แผนที่ 6 · map-06.jpg · เทือกเขา — ซุ้มหินซ้ายล่าง → ซุ้มหินขวาบน ──
  'mountain-range': {
    start: { x: 3, y: 93 },
    points: [
      { x: 16, y: 88 }, // 1 ซุ้มหินซ้ายล่าง
      { x: 35, y: 82 }, // 2
      { x: 55, y: 85 }, // 3
      { x: 70, y: 84 }, // 4
      { x: 72, y: 72 }, // 5
      { x: 66, y: 61 }, // 6 สะพานไม้
      { x: 48, y: 63 }, // 7
      { x: 28, y: 65 }, // 8
      { x: 16, y: 55 }, // 9
      { x: 22, y: 40 }, // 10
      { x: 36, y: 35 }, // 11
      { x: 50, y: 40 }, // 12
      { x: 63, y: 46 }, // 13
      { x: 79, y: 47 }, // 14 ใกล้มังกรหิน
      { x: 86, y: 38 }, // 15
      { x: 79, y: 27 }, // 16
    ],
    end: { x: 89, y: 17 },
  },

  // ── แผนที่ 7 · map-07.jpg · หุบเขาน้ำตก — ซุ้มดอกไม้กลางล่าง → ประตูขวาบน ──
  'waterfall-valley': {
    start: { x: 50, y: 97 },
    points: [
      { x: 50, y: 86 }, // 1 ซุ้มดอกไม้
      { x: 34, y: 82 }, // 2
      { x: 17, y: 74 }, // 3
      { x: 12, y: 64 }, // 4
      { x: 20, y: 57 }, // 5
      { x: 33, y: 54 }, // 6 หัวสะพานเชือก
      { x: 50, y: 47 }, // 7 กลางสะพานเชือก
      { x: 68, y: 39 }, // 8
      { x: 78, y: 33 }, // 9
      { x: 82, y: 23 }, // 10
    ],
    end: { x: 86, y: 13 },
  },

  // ── แผนที่ 8 · map-08.jpg · ถ้ำคริสตัล — ประตูไม้กลางล่าง → ประตูไม้ขวาบน ──
  'crystal-cave': {
    start: { x: 52, y: 92 },
    points: [
      { x: 50, y: 82 }, // 1
      { x: 44, y: 72 }, // 2
      { x: 40, y: 60 }, // 3
      { x: 34, y: 50 }, // 4
      { x: 27, y: 42 }, // 5
      { x: 35, y: 34 }, // 6
      { x: 45, y: 25 }, // 7
      { x: 56, y: 20 }, // 8
      { x: 70, y: 18 }, // 9
      { x: 80, y: 15 }, // 10
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

/** % ตามความยาวเส้นทาง (0-100) ของจุดระหว่างทางแต่ละจุด — ใช้บอกว่านกฮูกผ่านจุดไหนแล้ว */
export function waypointPathPcts(mapDef: Pick<MapDef, 'entryPct' | 'waypoints' | 'exitPct'>): number[] {
  return mapDef.waypoints.map((wp) => nearestPathPct(mapDef, wp))
}
