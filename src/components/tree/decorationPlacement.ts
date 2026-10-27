import { DECORATION_ITEM_META } from '../../config/decorationItems'
import { fitTree, healthPlot } from './procedural/drawTree2D'
import type { TreeModel } from './procedural/buildTreeModel'

/*============================================================================*\
  decorationPlacement.ts — [แก้ตามที่ระบุ — 2.4] กฎการวางไอเทมตกแต่งบนหน้า Home
  ────────────────────────────────────────────────────────────────────────────
    รูปปั้นกระถาง (statues)            → บนพื้นดินเท่านั้น (ตรงไหนของพื้นก็ได้)
    ของแขวนกิ่งไม้ (hangings)          → บนต้นไม้เท่านั้น (ทรงพุ่ม + ลำต้น)
    ลายโพสอิทสะสม (postits) / ของพิเศษ → บนต้นไม้หรือพื้นหลังได้ แต่ห้ามลงพื้นดิน (กันพื้นรก)
  พื้นดิน/ต้นไม้คำนวณจากเรขาคณิตชุดเดียวกับที่ ProceduralTreeCanvas วาดจริง (fitTree + healthPlot)
  จึงตรงกับภาพบนจอทุกสายพันธุ์/ทุกขนาดจอ — พิกัดทั้งหมดเป็น % ของแถบต้นไม้ (.tree-of-life__band)
  ใช้ตอนลาก (ไอเทมเลื่อนออกนอกโซนไม่ได้) และตอนแสดงตำแหน่งที่เคยเซฟไว้ (ตำแหน่งเก่าที่ผิดกฎถูกดึงกลับ)
  ตำแหน่งเก็บในเครื่องเท่านั้น (UIContext → localStorage) — ไม่มีเซิร์ฟเวอร์ให้ตรวจซ้ำ
\*============================================================================*/

export type PlacementRule = 'ground' | 'tree' | 'not-ground'

export function placementRuleOf(itemId: string): PlacementRule {
  const category = DECORATION_ITEM_META[itemId]?.category
  if (category === 'statues') return 'ground'
  if (category === 'hangings') return 'tree'
  return 'not-ground'
}

export interface PlacementGeometry {
  /** วงรีแปลงหญ้า (% ของแถบ) — ขอบบนของวงรีคือเส้นพื้นดิน */
  plot: { cx: number; cy: number; rx: number; ry: number }
  /** วงรีทรงพุ่ม (% ของแถบ) */
  crown: { cx: number; cy: number; rx: number; ry: number }
  /** กรอบลำต้นจากใต้พุ่มลงถึงโคน (% ของแถบ) */
  trunk: { x0: number; x1: number; y0: number; y1: number }
}

/** viewW = ความกว้างแถบ (= จอ), worldW = ความกว้างฉากที่เลื่อนได้ (แปลงหญ้ากว้างตามฉาก), h = ความสูงแถบ */
export function buildPlacementGeometry(model: TreeModel, viewW: number, worldW: number, h: number): PlacementGeometry | null {
  if (viewW < 2 || h < 2) return null
  const fit = fitTree(model, viewW, h)
  const plot = healthPlot({ ...fit, baseX: worldW / 2 }, worldW, h)
  const toX = (px: number) => (px / viewW) * 100
  const toY = (px: number) => (px / h) * 100
  const cxPx = viewW / 2 + model.crown.cx * fit.scale
  const cyPx = fit.baseY - model.crown.cy * fit.scale
  const rxPx = model.crown.rx * fit.scale
  const ryPx = model.crown.ry * fit.scale
  const trunkHalf = Math.max(12, rxPx * 0.08)
  return {
    // แปลงหญ้าในพิกัดแถบ: จุดกลางตรงกลางแถบเสมอ (ฉากกว้างกว่าแถบเท่ากันทั้งสองข้าง)
    plot: { cx: 50, cy: toY(plot.cy), rx: toX(plot.rx), ry: toY(plot.ry) },
    crown: { cx: toX(cxPx), cy: toY(cyPx), rx: toX(rxPx), ry: toY(ryPx) },
    trunk: { x0: toX(viewW / 2 - trunkHalf), x1: toX(viewW / 2 + trunkHalf), y0: toY(cyPx), y1: toY(fit.baseY) },
  }
}

/** ระยะเผื่อจากเส้นพื้นดิน (% ความสูงแถบ) — กันไอเทมคร่อมเส้นพอดี */
const GROUND_MARGIN = 1.5

/** y ของเส้นพื้นดิน (ขอบบนวงรีแปลงหญ้า) ที่ตำแหน่ง x — นอกวงรีถือว่าพื้นอยู่ที่ระดับจุดกลางวงรี */
export function groundTopAt(geo: PlacementGeometry, xPct: number): number {
  const { cx, cy, rx, ry } = geo.plot
  const t = Math.min(1, Math.abs(xPct - cx) / rx)
  return cy - ry * Math.sqrt(1 - t * t)
}

function inCrown(geo: PlacementGeometry, x: number, y: number): boolean {
  const { cx, cy, rx, ry } = geo.crown
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
}

function inTrunk(geo: PlacementGeometry, x: number, y: number): boolean {
  const t = geo.trunk
  return x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1
}

/** จุดที่ใกล้ที่สุดบนต้นไม้: ดึงเข้าวงรีพุ่ม (ทิศเดิมจากจุดกลาง) หรือหนีบเข้ากรอบลำต้น เลือกที่ใกล้กว่า */
function nearestOnTree(geo: PlacementGeometry, x: number, y: number): { xPct: number; yPct: number } {
  const { cx, cy, rx, ry } = geo.crown
  const dx = x - cx, dy = y - cy
  const e = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2) || 1
  const k = 0.95 / e
  const crownPt = { xPct: cx + dx * k, yPct: cy + dy * k }
  const t = geo.trunk
  const trunkPt = { xPct: Math.min(t.x1, Math.max(t.x0, x)), yPct: Math.min(t.y1, Math.max(t.y0, y)) }
  const d = (p: { xPct: number; yPct: number }) => (p.xPct - x) ** 2 + (p.yPct - y) ** 2
  return d(trunkPt) < d(crownPt) ? trunkPt : crownPt
}

/** ปรับตำแหน่งให้อยู่ในโซนที่อนุญาตของไอเทมนั้น — maxYPct = ขอบล่างสุดที่ไม่โดนแถบเมนูบัง */
export function constrainPlacement(
  rule: PlacementRule,
  pos: { xPct: number; yPct: number },
  geo: PlacementGeometry | null,
  maxYPct = 96,
): { xPct: number; yPct: number } {
  if (!geo) return pos
  const { xPct: x, yPct: y } = pos
  if (rule === 'tree') {
    return inCrown(geo, x, y) || inTrunk(geo, x, y) ? pos : nearestOnTree(geo, x, y)
  }
  const ground = groundTopAt(geo, x)
  if (rule === 'ground') {
    const minY = ground + GROUND_MARGIN
    // จอเตี้ยมาก: พื้นอาจต่ำกว่าเส้นแถบเมนู — ยึด "อยู่บนพื้น" ไว้ก่อน
    return { xPct: x, yPct: Math.min(Math.max(y, minY), Math.max(minY, maxYPct)) }
  }
  return { xPct: x, yPct: Math.min(y, ground - GROUND_MARGIN) }
}
