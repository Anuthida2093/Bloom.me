/*============================================================================*\
  geometry — เรขาคณิตเส้นทางของแผนที่ที่สร้างด้วยโค้ด (ตรรกะล้วน)
  ────────────────────────────────────────────────────────────────────────────
  เส้นโค้ง Catmull-Rom ผ่านจุดควบคุม → polyline · ความยาวสะสม · จุดที่ระยะ s · ระยะห่างจากทาง
  PathField = ตารางระยะห่างจากขอบทางที่คำนวณครั้งเดียว ให้วางของนับหมื่นครั้งได้เร็ว
\*============================================================================*/

export type Vec2 = [number, number]

/** Catmull-Rom แบบ uniform ผ่านทุกจุด — steps = จำนวนจุดย่อยต่อช่วง */
export function catmullRom(points: Vec2[], steps = 14): Vec2[] {
  const P = [points[0], ...points, points[points.length - 1]]
  const out: Vec2[] = []
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]]
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t
      const f = (j: 0 | 1) =>
        0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)
      out.push([f(0), f(1)])
    }
  }
  out.push(points[points.length - 1])
  return out
}

export function cumulativeLengths(poly: Vec2[]): number[] {
  const c = [0]
  for (let i = 1; i < poly.length; i++) c.push(c[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]))
  return c
}

/** จุดบน polyline ที่ระยะ s ตามเส้น */
export function pointAtLength(poly: Vec2[], cum: number[], s: number): Vec2 {
  const L = cum[cum.length - 1]
  const d = Math.max(0, Math.min(L, s))
  let i = 1
  while (i < cum.length - 1 && cum[i] < d) i++
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
  return [poly[i - 1][0] + (poly[i][0] - poly[i - 1][0]) * t, poly[i - 1][1] + (poly[i][1] - poly[i - 1][1]) * t]
}

export function nearestIndex(poly: Vec2[], x: number, y: number): number {
  let best = 0, bestD = Infinity
  for (let i = 0; i < poly.length; i++) {
    const d = (poly[i][0] - x) ** 2 + (poly[i][1] - y) ** 2
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

export function distToSegment(px: number, py: number, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l)) : 0
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy))
}

export function distToPolyline(px: number, py: number, poly: Vec2[]): number {
  let m = Infinity
  for (let i = 1; i < poly.length; i++) m = Math.min(m, distToSegment(px, py, poly[i - 1], poly[i]))
  return m
}

export interface PathStroke { points: Vec2[]; halfWidth: number }

/** ระยะจากจุดถึงขอบทางที่ใกล้ที่สุด (ติดลบ = อยู่บนทาง) — แบบแม่นยำ ใช้ในเทสต์ */
export function exactPathClearance(x: number, y: number, strokes: PathStroke[]): number {
  let m = Infinity
  for (const s of strokes) m = Math.min(m, distToPolyline(x, y, s.points) - s.halfWidth)
  return m
}

/**
 * ตารางระยะห่างจากขอบทาง (ความละเอียด cell หน่วย) — คำนวณเฉพาะช่องในระยะ maxRange ของทาง
 * ค่าที่คืนหักครึ่งเส้นทแยงช่องออกแล้ว จึงไม่เคยมากกว่าระยะจริง (ปลอดภัยเสมอ ไม่ทำให้ของล้ำทาง)
 */
export class PathField {
  private readonly n: number
  private readonly data: Float32Array
  private readonly slack: number

  constructor(strokes: PathStroke[], private readonly world: number, private readonly maxRange = 260, private readonly cell = 8) {
    this.n = Math.ceil(world / cell) + 1
    this.data = new Float32Array(this.n * this.n).fill(maxRange)
    this.slack = cell * Math.SQRT1_2
    for (const s of strokes) {
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1], b = s.points[i]
        const reach = maxRange + s.halfWidth
        const gx0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - reach) / cell))
        const gx1 = Math.min(this.n - 1, Math.ceil((Math.max(a[0], b[0]) + reach) / cell))
        const gy0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - reach) / cell))
        const gy1 = Math.min(this.n - 1, Math.ceil((Math.max(a[1], b[1]) + reach) / cell))
        for (let gy = gy0; gy <= gy1; gy++) {
          for (let gx = gx0; gx <= gx1; gx++) {
            const d = distToSegment(gx * cell, gy * cell, a, b) - s.halfWidth
            const k = gy * this.n + gx
            if (d < this.data[k]) this.data[k] = d
          }
        }
      }
    }
  }

  /** ระยะถึงขอบทาง (ประมาณแบบไม่เกินจริง) — นอกโลกใช้ช่องขอบที่ใกล้สุด แล้วหักระยะที่ล้นออกไป
   *  (ทางหลักยื่นพ้นขอบโลกได้ จุดนอกโลกจึงอาจใกล้ทางกว่าช่องขอบ) */
  clearance(x: number, y: number): number {
    const gx = Math.max(0, Math.min(this.n - 1, Math.round(x / this.cell)))
    const gy = Math.max(0, Math.min(this.n - 1, Math.round(y / this.cell)))
    const outside = Math.hypot(Math.max(0, -x, x - this.world), Math.max(0, -y, y - this.world))
    const v = this.data[gy * this.n + gx]
    return Math.min(v, this.maxRange) - this.slack - outside
  }
}
