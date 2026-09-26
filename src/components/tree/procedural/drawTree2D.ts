import type { BranchSegment, Vec3 } from './generateTree'
import { shade, type TreeModel } from './buildTreeModel'

/*============================================================================*\
  drawTree2D — วาด TreeModel ลง canvas 2D (มุมมองด้านหน้า: x → ขวา, y → ขึ้น, z = ความลึก)
  ────────────────────────────────────────────────────────────────────────────
  แยก 2 ฟังก์ชัน (กิ่ง / ใบ+ดอก) เพราะ TreeOfLife วาดลง 2 canvas — filter "ใบเหี่ยว" ใส่ได้เฉพาะ
  canvas ใบ และใบไหวตามลมได้โดยลำต้นไม่ส่ายตาม
\*============================================================================*/

export interface TreeFit {
  /** พิกเซลต่อ 1 หน่วยต้นไม้ */
  scale: number
  /** ตำแหน่งโคนต้นบน canvas (px, CSS pixel) */
  baseX: number
  baseY: number
}

/** จัดต้นให้พอดีกล่อง: โคนต้นอยู่ที่ baseYRatio ของความสูง, ความสูงต้น = maxHeightRatio × growth */
export function fitTree(model: TreeModel, width: number, height: number, baseYRatio = 0.88, maxHeightRatio = 0.72): TreeFit {
  const baseY = height * baseYRatio
  const targetH = height * maxHeightRatio * model.growth
  const halfW = Math.max(-model.bounds.minX, model.bounds.maxX, 0.5)
  const scale = Math.min(targetH / Math.max(model.bounds.maxY, 0.5), (width * 0.47) / halfW)
  return { scale, baseX: width / 2, baseY }
}

const toScreen = (p: Vec3, f: TreeFit): [number, number] => [f.baseX + p[0] * f.scale, f.baseY - p[1] * f.scale]

/** จุดบนเส้นโค้งกำลังสองที่ผ่าน start → mid → end (control point คำนวณให้เส้นผ่าน mid พอดี) */
function curvePoint(b: BranchSegment, t: number): Vec3 {
  const c: Vec3 = [2 * b.mid[0] - (b.start[0] + b.end[0]) / 2, 2 * b.mid[1] - (b.start[1] + b.end[1]) / 2, 2 * b.mid[2] - (b.start[2] + b.end[2]) / 2]
  const u = 1 - t
  return [
    u * u * b.start[0] + 2 * u * t * c[0] + t * t * b.end[0],
    u * u * b.start[1] + 2 * u * t * c[1] + t * t * b.end[1],
    u * u * b.start[2] + 2 * u * t * c[2] + t * t * b.end[2],
  ]
}

export function drawBranches(ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit) {
  const dark = shade(model.trunkColor, -0.1)
  const light = shade(model.trunkColor, 0.14)
  // กิ่งหลังก่อน (z น้อย) → กิ่งหน้าทีหลัง, ชั้นใหญ่ก่อนชั้นเล็กในระนาบเดียวกัน
  const ordered = [...model.branches].sort((a, b) => (a.mid[2] - b.mid[2]) || (a.depth - b.depth))
  for (const b of ordered) {
    const steps = b.depth < 2 ? 10 : b.depth < 4 ? 6 : 3
    const left: [number, number][] = []
    const right: [number, number][] = []
    const highlight: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const p = toScreen(curvePoint(b, t), fit)
      const q = toScreen(curvePoint(b, Math.min(1, t + 0.01)), fit)
      const pPrev = toScreen(curvePoint(b, Math.max(0, t - 0.01)), fit)
      let dx = q[0] - pPrev[0], dy = q[1] - pPrev[1]
      const len = Math.hypot(dx, dy) || 1
      dx /= len; dy /= len
      let r = (b.radiusStart + (b.radiusEnd - b.radiusStart) * t) * fit.scale
      if (b.depth === 0) r *= 1 + 0.7 * Math.pow(1 - t, 4) // โคนต้นบานออก
      r = Math.max(r, 0.6)
      // ตั้งฉากกับทิศกิ่ง: (-dy, dx)
      left.push([p[0] - dy * r, p[1] + dx * r])
      right.push([p[0] + dy * r, p[1] - dx * r])
      highlight.push([p[0] - dy * r * 0.45, p[1] + dx * r * 0.45])
    }
    const darkSide = b.mid[2] < 0 ? shade(model.trunkColor, -0.14) : dark
    ctx.beginPath()
    ctx.moveTo(left[0][0], left[0][1])
    for (const pt of left) ctx.lineTo(pt[0], pt[1])
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
    ctx.closePath()
    ctx.fillStyle = darkSide
    ctx.fill()
    // แถบสว่างด้านซ้าย (แสงมาจากซ้ายบน) — ให้กิ่งดูกลมมีมิติ
    if (b.depth < 5) {
      ctx.beginPath()
      ctx.moveTo(highlight[0][0], highlight[0][1])
      for (const pt of highlight) ctx.lineTo(pt[0], pt[1])
      ctx.strokeStyle = light
      ctx.globalAlpha = 0.55
      ctx.lineWidth = Math.max(0.8, (b.radiusStart * fit.scale) * 0.5)
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
}

/** รูปทรงใบ 1 หน่วย: โคนที่ (0,0) ปลายชี้ขึ้นที่ (0,-1) กว้างสุด ~0.34 — สร้างครั้งแรกที่วาด
 *  (ไม่สร้างตอน import เพราะบางสภาพแวดล้อม เช่น jsdom ในเทสต์ ไม่มี Path2D) */
let leafPath: Path2D | null = null
function getLeafPath(): Path2D {
  if (!leafPath) {
    leafPath = new Path2D()
    leafPath.moveTo(0, 0)
    leafPath.bezierCurveTo(0.3, -0.18, 0.3, -0.62, 0, -1)
    leafPath.bezierCurveTo(-0.3, -0.62, -0.3, -0.18, 0, 0)
    leafPath.closePath()
  }
  return leafPath
}

export function drawFoliage(ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit, dpr: number) {
  const LEAF_PATH = getLeafPath()
  for (const leaf of model.leaves) {
    const [x, y] = toScreen(leaf.position, fit)
    const L = Math.max(4, leaf.length * fit.scale)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.translate(x, y)
    ctx.rotate(leaf.angle)
    ctx.scale(L * leaf.widthScale, L)
    ctx.fillStyle = leaf.color
    ctx.fill(LEAF_PATH)
    // เส้นกลางใบ (เห็นได้เฉพาะใบที่ใหญ่พอบนจอ)
    if (L >= 9) {
      ctx.beginPath()
      ctx.moveTo(0, -0.05)
      ctx.lineTo(0, -0.85)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.strokeStyle = 'rgba(255, 255, 235, 0.28)'
      ctx.lineWidth = 0.7
      ctx.stroke()
    }
  }

  for (const f of model.flowers) {
    const [x, y] = toScreen(f.position, fit)
    const R = Math.max(3, f.radius * fit.scale)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.translate(x, y)
    ctx.rotate(f.rotation)
    ctx.fillStyle = f.color
    for (let i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5)
      ctx.beginPath()
      ctx.ellipse(0, -R * 0.55, R * 0.42, R * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#FFE08A'
    ctx.fill()
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
