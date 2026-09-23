import type { MapDef } from '../../../../types.journey'

/*============================================================================*\
  journeyPathMath.ts — เรขาคณิตเส้นทางของแผนที่ Step Journey — แยกออกมาจาก
  MapPathRenderer.tsx เพราะไฟล์ component ต้อง export เฉพาะ component เท่านั้น (Fast Refresh —
  react-refresh/only-export-components) ใช้ร่วมกันทั้งจาก MapPathRenderer.tsx (วาดเส้น) และ
  CatCompanion.tsx (คำนวณตำแหน่งตัวละคร)
\*============================================================================*/

const SVG_NS = 'http://www.w3.org/2000/svg'

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
