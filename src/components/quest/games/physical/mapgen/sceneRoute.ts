import type { MapPathPoints } from '../journeyPathMath'
import { pointAtLength } from './geometry'
import type { MapRouteLayout } from './generateMapScene'

/*============================================================================*\
  sceneRoute — แปลงเส้นทางของแผนที่ที่สร้างด้วยโค้ด เป็นรูปแบบจุดเส้นทางเดียวกับแผนที่ภาพวาด
  ────────────────────────────────────────────────────────────────────────────
  start / points / end เป็น % ของแผนที่ (0-100) เหมือน MAP_PATH_POINTS ทุกใบ
  - จุดหมายเลข 1-7 = milestones ของฉาก (ระยะทาง i/8) · end = หีบที่เส้นชัย (จุดที่ 8)
  - แทรกจุดดัดความโค้ง (via) ถี่ๆ ตามทางที่วาดจริง → เส้นโค้งที่ journeyPathMath คำนวณใหม่ทับทาง
    ที่วาดพอดี นกฮูก/จุด/หีบจึงใช้ข้อมูลเส้นทางชุดเดียวกับภาพ ไม่มีพิกัดที่ปักด้วยมือ
\*============================================================================*/

/** ระยะห่างของจุด via (หน่วยฉาก) — ยิ่งถี่ เส้นโค้งที่คำนวณใหม่ยิ่งตรงทางที่วาด */
const VIA_SPACING = 24

const pct = (v: number, world: number) => Math.round((v / world) * 10000) / 100

export function sceneToPathPoints(layout: MapRouteLayout): MapPathPoints {
  const { route, world } = layout
  const n = route.milestones.length + 1
  const points: MapPathPoints['points'] = []
  for (let k = 1; k < n; k++) {
    const from = (route.length * (k - 1)) / n, to = (route.length * k) / n
    const steps = Math.max(1, Math.round((to - from) / VIA_SPACING))
    for (let j = 1; j < steps; j++) {
      const [x, y] = pointAtLength(route.points, route.cum, from + ((to - from) * j) / steps)
      points.push({ x: pct(x, world), y: pct(y, world), via: true })
    }
    const [mx, my] = route.milestones[k - 1]
    points.push({ x: pct(mx, world), y: pct(my, world) })
  }
  // ช่วงสุดท้าย: จุดหมายเลข 7 → หีบ
  const from = (route.length * (n - 1)) / n
  const steps = Math.max(1, Math.round((route.length - from) / VIA_SPACING))
  for (let j = 1; j < steps; j++) {
    const [x, y] = pointAtLength(route.points, route.cum, from + ((route.length - from) * j) / steps)
    points.push({ x: pct(x, world), y: pct(y, world), via: true })
  }
  return {
    start: { x: pct(route.start[0], world), y: pct(route.start[1], world) },
    points,
    end: { x: pct(route.goal[0], world), y: pct(route.goal[1], world) },
  }
}
