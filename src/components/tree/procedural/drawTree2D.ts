import { toGroundVariant } from '../../../config/treeAssets'
import { seededRandom } from '../../../utils/seededRandom'
import { shade, type LeafShape, type TreeModel } from './buildTreeModel'
import { pointOnBranch, type Vec3 } from './generateTree'

/*============================================================================*\
  drawTree2D — วาด TreeModel ลง canvas 2D (มุมมองด้านหน้า: x → ขวา, y → ขึ้น, z = ความลึก) แยก 3 ชั้น
  ────────────────────────────────────────────────────────────────────────────
  drawGround  : แปลงสุขภาพ (เนินหญ้าวงรี + ชั้นดินขอบหน้า แยกชัดจากทุ่งในวิดีโอ) + หย่อมดิน/รอยแตก
                สีตามความแห้งของดิน (config/groundFertility.ts) เขียวสด → เหลือง → น้ำตาล → ดินร้าง
  buildMeadow + drawMeadow : ใบหญ้า/ดอกเดซี่ที่ไหวตามลม (วาดซ้ำทุกเฟรม แยกชั้นหลัง/หน้าลำต้น)
  drawBranches: ลำต้น/กิ่งโค้งเรียวจาก generateTree (กิ่งปลายสุดเรียวแหลม)
  drawFoliage : ใบวาดทีละใบ (หันออกนอกพุ่ม+หาแสง) + ดอก
  แยกชั้นเพื่อให้ TreeOfLife ใส่ filter ต่างกันได้ (ใบเหี่ยว = ชั้นใบเท่านั้น)
\*============================================================================*/

export interface TreeFit {
  /** พิกเซลต่อ 1 หน่วยต้นไม้ */
  scale: number
  /** ตำแหน่งโคนต้นบนพื้นหญ้า (CSS px) */
  baseX: number
  baseY: number
}

/** โคนต้นอยู่ช่วงล่างของกล่อง (ต้นยืนกลางทุ่ง) — ต้องตรงกับ transform-origin ใน TreeOfLife.css */
export const TREE_BASE_Y_RATIO = 0.84

/** จัดต้นให้พอดีกล่อง: โคนต้นที่ baseYRatio ของความสูง, ความสูงต้น = maxHeightRatio × growth */
export function fitTree(model: TreeModel, width: number, height: number, baseYRatio = TREE_BASE_Y_RATIO, maxHeightRatio = 0.76): TreeFit {
  const baseY = height * baseYRatio
  const targetH = height * maxHeightRatio * model.growth
  const halfW = Math.max(-model.bounds.minX, model.bounds.maxX, 0.5)
  const scale = Math.min(targetH / Math.max(model.bounds.maxY, 0.5), (width * 0.49) / halfW)
  return { scale, baseX: width / 2, baseY }
}

const toScreen = (p: Vec3, f: TreeFit): [number, number] => [f.baseX + p[0] * f.scale, f.baseY - p[1] * f.scale]

/* ── สีพื้นตามความแห้ง (0 สด → 1 ดินร้าง) ไล่ต่อเนื่องระหว่างจุดสี
   จุด "สด" เก็บสีจากทุ่งหญ้าในวิดีโอพื้นหลัง hero-waterfall.mp4 (เขียวอมเหลืองแดดอุ่น ไกลสว่าง ใกล้เข้ม)
   ต้นไม้/ทุ่งจึงกลืนกับฉากหลัง ── */
export interface GroundPalette { top: string; bottom: string; blade: string; bladeDark: string }
const DRYNESS_STOPS: { at: number; p: GroundPalette }[] = [
  { at: 0, p: { top: '#9aa65c', bottom: '#4a613c', blade: '#9db454', bladeDark: '#3f5c32' } }, // เขียวสด (สีจากวิดีโอ)
  { at: 0.4, p: { top: '#bcb865', bottom: '#77763a', blade: '#c2bb5c', bladeDark: '#7a7433' } }, // เหี่ยวเหลือง
  { at: 0.75, p: { top: '#bf985c', bottom: '#7a5731', blade: '#b88c4e', bladeDark: '#6f4d27' } }, // แห้งน้ำตาล
  { at: 1, p: { top: '#b08a60', bottom: '#664832', blade: '#9c7650', bladeDark: '#5e4129' } }, // ดินร้าง
]

/** '#rrggbb' หรือ 'rgb(r, g, b)' → [r, g, b] */
function toRgb(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [r, g, b] = color.match(/\d+/g)!.map(Number)
  return [r, g, b]
}

function mixColor(a: string, b: string, t: number): string {
  const ca = toRgb(a), cb = toRgb(b)
  const ch = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * t)
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`
}

/** สีพื้นหญ้าตามความแห้งของดิน — ใช้ร่วมกับฉาก 3D ในหน้าทดลอง */
export function groundPalette(dryness: number): GroundPalette {
  const d = Math.max(0, Math.min(1, dryness))
  let i = 0
  while (i < DRYNESS_STOPS.length - 2 && d > DRYNESS_STOPS[i + 1].at) i++
  const a = DRYNESS_STOPS[i], b = DRYNESS_STOPS[i + 1]
  const t = (d - a.at) / (b.at - a.at)
  const keys = Object.keys(a.p) as (keyof GroundPalette)[]
  return Object.fromEntries(keys.map((k) => [k, mixColor(a.p[k], b.p[k], t)])) as unknown as GroundPalette
}

/** แปลงสุขภาพใต้ต้นไม้: เนินหญ้าโค้ง (วงรีมุมมองเฉียงที่กว้างเลยขอบจอทั้งซ้าย-ขวา) ขอบหน้าเห็นชั้นดินหนา
 *  — แยกชัดจากทุ่งหญ้าในวิดีโอพื้นหลัง ให้รู้ว่า "พื้นที่ตรงนี้" คือของเควสสุขภาพ */
export interface HealthPlot { cx: number; cy: number; rx: number; ry: number; lip: number }

export function healthPlot(fit: TreeFit, width: number, height: number): HealthPlot {
  // กว้างเลยขอบฉาก → เห็นเป็นเนินยาวจากซ้ายสุดถึงขวาสุด ขอบเนินโค้งลงที่ปลายฉากทั้งสองข้าง
  const rx = width * 0.6
  const ry = Math.min(rx * 0.2, height * 0.09)
  const lip = Math.min(height * 0.075, ry * 1.1)
  // โคนต้นอยู่เยื้องหลังจุดกลางแปลงนิดหน่อย — หญ้าด้านหน้าต้นมีที่ให้ขึ้นบังโคนต้น
  return { cx: fit.baseX, cy: fit.baseY + ry * 0.15, rx, ry, lip }
}

/** จุดสุ่มบนผิวแปลงเฉพาะช่วงที่อยู่ในจอ → [x, y, depth 0 = หลังสุด … 1 = หน้าสุด] */
function visiblePlotPoint(p: HealthPlot, width: number, rand: () => number): [number, number, number] {
  for (;;) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand())
    const x = p.cx + Math.cos(a) * r * p.rx
    if (x < -8 || x > width + 8) continue
    const y = p.cy + Math.sin(a) * r * p.ry
    return [x, y, (y - (p.cy - p.ry)) / (2 * p.ry)]
  }
}

/** ขอบแปลง ณ มุม a (0 = ขวา, π/2 = หน้าสุด) */
const plotEdge = (p: HealthPlot, a: number): [number, number] => [p.cx + Math.cos(a) * p.rx, p.cy + Math.sin(a) * p.ry]

function plotPath(ctx: CanvasRenderingContext2D, p: HealthPlot) {
  ctx.beginPath()
  ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2)
}

/**
 * ชั้นพื้น (วาดครั้งเดียว ไม่ขยับ): ชั้นดินใต้เนินจนเลยขอบล่างจอ (ดิน/กรวด/ริ้วดิน) →
 * ผิวหญ้าบนแปลง (สีตามความแห้งของดิน) → หย่อมดิน/รอยแตกเมื่อดินแห้ง → เงาใต้ต้น
 * ใบหญ้า/ดอกไม้ที่ไหวตามลมอยู่ใน drawMeadow
 */
export function drawGround(ctx: CanvasRenderingContext2D, fit: TreeFit, width: number, height: number, dryness: number) {
  const dry = Math.max(0, Math.min(1, dryness))
  const pal = groundPalette(dry)
  const p = healthPlot(fit, width, height)
  const rand = seededRandom(`plot-${Math.round(width)}-${Math.round(height)}`)

  // ── 2) ชั้นดินใต้เนิน: จากขอบหน้าของเนินลงไปจนเลยขอบล่างของจอ (เต็มความกว้าง) ──
  const N = 64
  const frontY = (x: number) => {
    const t = (x - p.cx) / p.rx
    return p.cy + p.ry * Math.sqrt(Math.max(0, 1 - t * t))
  }
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const [x, y] = plotEdge(p, (i / N) * Math.PI)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineTo(p.cx - p.rx, height + 10)
  ctx.lineTo(p.cx + p.rx, height + 10)
  ctx.closePath()
  const soil = ctx.createLinearGradient(0, p.cy, 0, height)
  soil.addColorStop(0, shade('#7a5230', dry * 0.06))
  soil.addColorStop(1, shade('#43301c', dry * 0.04))
  ctx.fillStyle = soil
  ctx.fill()
  ctx.save()
  ctx.clip()
  // ชั้นดินเป็นริ้วตามแนวโค้งของเนิน + กรวดเล็ก
  ctx.strokeStyle = 'rgba(255, 225, 180, 0.12)'
  ctx.lineWidth = 1.2
  for (let k = 1; k <= 4; k++) {
    ctx.beginPath()
    for (let x = -8; x <= width + 8; x += 8) {
      const top = frontY(x)
      const yy = top + (height - top) * (k / 5) + Math.sin(x * 0.05 + k) * 1.5
      if (x === -8) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  for (let i = 0; i < Math.round(width / 5); i++) {
    const x = rand() * width
    const top = frontY(x)
    if (top >= height) continue
    const yy = top + 4 + rand() * (height - top)
    const r = 1.2 + rand() * Math.max(1.5, (height - top) * 0.05)
    ctx.fillStyle = `hsl(30, 8%, ${34 + rand() * 24}%)`
    ctx.beginPath()
    ctx.ellipse(x, yy, r, r * 0.7, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // ── 3) ผิวหญ้าบนแปลง: หลัง (ไกล) สว่างกว่า หน้าเข้มกว่า + ขอบหลังรับแดดเป็นเส้นสว่าง ──
  plotPath(ctx, p)
  const top = ctx.createLinearGradient(0, p.cy - p.ry, 0, p.cy + p.ry)
  top.addColorStop(0, pal.top)
  top.addColorStop(1, pal.bottom)
  ctx.fillStyle = top
  ctx.fill()
  ctx.save()
  plotPath(ctx, p)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255, 244, 200, 0.35)'
  ctx.lineWidth = Math.max(2, p.ry * 0.12)
  ctx.beginPath()
  ctx.ellipse(p.cx, p.cy + p.ry * 0.05, p.rx * 0.98, p.ry * 0.98, 0, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()

  // สุ่มจุดในแปลง
  const inPlot = (): [number, number, number] => visiblePlotPoint(p, width, rand)

  // ── 4) หย่อมดินโผล่ — เริ่มเมื่อหญ้าเหลืองจัดแล้ว ──
  const patches = Math.round((Math.max(0, dry - 0.3) / 0.7) * 22)
  for (let i = 0; i < patches; i++) {
    const [x, y, depth] = inPlot()
    const rx = p.rx * (0.05 + rand() * 0.12) * (0.6 + depth * 0.6), ry = rx * (p.ry / p.rx) * 1.4
    ctx.fillStyle = shade('#8a6440', (rand() - 0.5) * 0.08)
    ctx.globalAlpha = 0.4 + dry * 0.5
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, (rand() - 0.5) * 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // ── 5) ดินร้างเต็มที่: รอยแตกระแหง ──
  if (dry > 0.8) {
    ctx.strokeStyle = shade('#5a3d24', -0.05)
    ctx.lineCap = 'round'
    ctx.globalAlpha = ((dry - 0.8) / 0.2) * 0.75
    for (let i = 0; i < 22; i++) {
      const start = inPlot()
      const depth = start[2]
      let [x, y] = start
      ctx.lineWidth = 0.6 + depth * 1.4
      ctx.beginPath()
      ctx.moveTo(x, y)
      const segs = 3 + Math.floor(rand() * 4)
      for (let k = 0; k < segs; k++) {
        x += (rand() - 0.5) * p.rx * 0.08
        y += (rand() - 0.5) * p.ry * 0.12
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // ── 6) เงานุ่มใต้ต้น (แดดจากซ้ายบนเหมือนในวิดีโอ → เงาเอียงไปทางขวาเล็กน้อย) ──
  const sr = Math.min(p.rx, width * 0.44) * 0.4 // ขนาดเงาอิงความกว้างจอ ไม่ใช่ความกว้างเนิน
  const sx = fit.baseX + sr * 0.12
  const shadow = ctx.createRadialGradient(sx, fit.baseY, 0, sx, fit.baseY, sr)
  shadow.addColorStop(0, 'rgba(28, 40, 18, 0.34)')
  shadow.addColorStop(1, 'rgba(28, 40, 18, 0)')
  ctx.fillStyle = shadow
  ctx.translate(sx, fit.baseY)
  ctx.scale(1, p.ry / p.rx)
  ctx.translate(-sx, -fit.baseY)
  ctx.fillRect(sx - sr * 1.1, fit.baseY - sr * 1.1, sr * 2.2, sr * 2.2)
  ctx.restore()
}

/* ── ใบหญ้า/ดอกไม้ที่ไหวตามลม ── */
interface MeadowBlade { x: number; y: number; h: number; w: number; lean: number; color: string; alpha: number; phase: number; stiff: number }
interface MeadowFlower { x: number; y: number; r: number; petal: string; phase: number; stem: number }
export interface Meadow {
  /** อยู่หลังลำต้น (ไกลกว่าโคนต้น) */
  back: { blades: MeadowBlade[]; flowers: MeadowFlower[] }
  /** อยู่หน้าลำต้น (ใกล้กล้องกว่าโคนต้น) — ทับโคนต้นเหมือนต้นขึ้นอยู่กลางหญ้า */
  front: { blades: MeadowBlade[]; flowers: MeadowFlower[] }
}

/** ดอกเดซี่ขาวเกสรเหลืองเหมือนในวิดีโอ + ดอกส้มประปราย */
const DAISY_PETALS = ['#fbf8ee', '#fbf8ee', '#fbf8ee', '#fff4d6', '#f2a25a']
/** จำนวนใบหญ้าบนแปลงสูงสุด — วาดใหม่ทุกเฟรม จำกัดไว้ไม่ให้หนักเครื่อง */
const MAX_PLOT_BLADES = 3600

/**
 * สร้างข้อมูลใบหญ้า/ดอกไม้บนแปลงสุขภาพ (ครั้งเดียวต่อขนาดจอ/เลเวล) — วาดซ้ำทุกเฟรมด้วย drawMeadow
 * หญ้าหนาแน่นทั้งแปลง + หญ้าขอบแปลงยื่นคลุมชั้นดินด้านหน้า + กอหญ้ารอบโคนต้น
 * - grassSoilLevel: ความหนาแน่นหญ้า + จำนวนดอกเดซี่
 * - dryness: หญ้าบาง เตี้ย เอนล้ม สีเหลือง→น้ำตาล ดอกหาย
 */
export function buildMeadow(
  fit: TreeFit, width: number, height: number, grassSoilLevel: number, dryness: number, viewWidth = width,
): Meadow {
  const step = toGroundVariant(grassSoilLevel)
  const level = Math.max(0, Math.min(100, grassSoilLevel))
  const dry = Math.max(0, Math.min(1, dryness))
  const pal = groundPalette(dry)
  const p = healthPlot(fit, width, height)
  const rand = seededRandom(`meadow-${Math.round(width)}-${Math.round(height)}`)
  const meadow: Meadow = { back: { blades: [], flowers: [] }, front: { blades: [], flowers: [] } }
  const layerOf = (y: number) => (y > fit.baseY + 2 ? meadow.front : meadow.back)
  const color = () => (rand() < 0.45 ? pal.blade : pal.bladeDark)

  const inPlot = (): [number, number, number] => visiblePlotPoint(p, width, rand)

  const lush = 0.6 + (level / 100) * 0.4
  const bladeBase = Math.max(height * 0.022, p.ry * 0.55) * (0.85 + step * 0.08) * (1 - dry * 0.45)
  // พื้นที่แปลงที่เห็นในจอ ≈ ความกว้างจอ × ความสูงเฉลี่ยของแปลง
  const visibleArea = width * p.ry * 1.7
  // เพดานต่อ "หนึ่งจอ" — ฉากกว้างกว่าจอกี่เท่าก็ได้หญ้าเพิ่มตามนั้น (วาดทีละเฟรมเฉพาะส่วนที่อยู่ในจอ)
  const maxBlades = MAX_PLOT_BLADES * (width / Math.max(1, viewWidth))
  const count = Math.min(maxBlades, Math.round((visibleArea / 9) * lush * (1 - dry * 0.8)))
  for (let i = 0; i < count; i++) {
    const [x, y, depth] = inPlot()
    const scale = 0.4 + depth * 0.85
    layerOf(y).blades.push({
      x, y: y + 1,
      h: bladeBase * scale * (0.5 + rand() * 0.8),
      w: 1 + depth * 1.4,
      lean: (rand() - 0.5 + dry * 0.4) * bladeBase * scale * 0.7, // หญ้าแห้งเอนล้มไปทางเดียวมากกว่า
      color: color(),
      alpha: 0.75 + depth * 0.25,
      phase: rand() * Math.PI * 2,
      stiff: 0.7 + rand() * 0.6 + dry * 0.8, // หญ้าแห้งแข็ง ไหวน้อยกว่า
    })
  }

  // หญ้าขอบแปลงด้านหน้า: ขึ้นตามแนวขอบ ยื่นคลุมชั้นดิน — ขอบแปลงจึงดูเป็นกอหญ้า ไม่ใช่เส้นตัดเรียบ
  const fringe = Math.round((width / 3.2) * (1 - dry * 0.7))
  for (let i = 0; i < fringe; i++) {
    const a = 0.05 + rand() * (Math.PI - 0.1)
    const [x, y] = plotEdge(p, a)
    if (x < -8 || x > width + 8) { i--; continue }
    const h = bladeBase * (0.9 + rand() * 0.8)
    meadow.front.blades.push({
      x, y: y + 2 + rand() * p.lip * 0.15, h, w: 1.6,
      lean: (Math.cos(a) * 0.6 + (rand() - 0.5) + dry * 0.4) * h * 0.5,
      color: color(), alpha: 1, phase: rand() * Math.PI * 2, stiff: 0.8 + rand() * 0.5 + dry * 0.8,
    })
  }

  // กอหญ้ารอบโคนต้น (หน้าลำต้น) — ต้นดูงอกขึ้นมาจากแปลงจริง ไม่ใช่วางทับบนภาพ
  const clump = Math.round(30 * (1 - dry * 0.7))
  for (let i = 0; i < clump; i++) {
    const h = bladeBase * (0.8 + rand() * 0.6)
    meadow.front.blades.push({
      x: fit.baseX + (rand() - 0.5) * Math.min(p.rx, viewWidth * 0.44) * 0.22, y: fit.baseY + 3 + rand() * p.ry * 0.15,
      h, w: 1.6, lean: (rand() - 0.5 + dry * 0.4) * h * 0.6,
      color: color(), alpha: 1, phase: rand() * Math.PI * 2, stiff: 0.8 + rand() * 0.5 + dry * 0.8,
    })
  }
  for (const layer of [meadow.back, meadow.front]) layer.blades.sort((a, b) => a.y - b.y)

  // ดอกเดซี่บนแปลง: 0-45 ดอกตามเลเวล หายไปเมื่อดินเริ่มแห้ง
  const flowers = Math.round((level / 100) * 45 * Math.max(0, 1 - dry * 2.5))
  for (let i = 0; i < flowers; i++) {
    const [x, y, depth] = inPlot()
    layerOf(y).flowers.push({
      x, y,
      r: Math.max(1.8, bladeBase * 0.24 * (0.6 + depth * 0.6)),
      petal: DAISY_PETALS[Math.floor(rand() * DAISY_PETALS.length)],
      phase: rand() * Math.PI * 2,
      stem: bladeBase * (0.6 + depth * 0.6) * (0.8 + rand() * 0.4),
    })
  }
  return meadow
}

/**
 * ลม ณ ตำแหน่ง x เวลา t (วินาที): ไหวเบาๆ ตลอด + ลมระลอกใหญ่พัดจากซ้ายไปขวาเป็นช่วงๆ
 * (หญ้าในวิดีโอพื้นหลังไหวเป็นระลอกช้าๆ แบบนี้) คืนค่าประมาณ -0.4..1.3
 */
function windAt(x: number, t: number, phase: number): number {
  const breeze = Math.sin(t * 1.6 + phase + x * 0.01) * 0.35
  const wave = Math.sin(t * 0.55 - x * 0.0045)
  const gust = Math.max(0, wave) ** 3 * 1.1
  return breeze + gust + 0.1
}

/** วาดใบหญ้า/ดอกไม้หนึ่งชั้นที่เวลา t (วินาที) — t คงที่ = ภาพนิ่ง (prefers-reduced-motion)
 *  visible = ช่วง x ของฉากที่อยู่ในจอ — ข้ามใบหญ้านอกช่วงนี้ (ฉากกว้างกว่าจอ) */
export function drawMeadow(ctx: CanvasRenderingContext2D, layer: Meadow['back'], t: number, visible?: [number, number]) {
  const x0 = visible ? visible[0] - 30 : -Infinity, x1 = visible ? visible[1] + 30 : Infinity
  for (const b of layer.blades) {
    if (b.x < x0 || b.x > x1) continue
    const sway = (windAt(b.x, t, b.phase) / b.stiff) * b.h * 0.32
    const tipX = b.x + b.lean + sway
    const tipY = b.y - b.h + Math.abs(sway) * 0.25 // ใบโน้มลงเล็กน้อยตอนโดนลมแรง
    ctx.globalAlpha = b.alpha
    ctx.fillStyle = b.color
    ctx.beginPath()
    ctx.moveTo(b.x - b.w, b.y)
    ctx.quadraticCurveTo(b.x + (b.lean + sway) * 0.2, b.y - b.h * 0.6, tipX, tipY)
    ctx.quadraticCurveTo(b.x + (b.lean + sway) * 0.2 + b.w * 0.6, b.y - b.h * 0.5, b.x + b.w, b.y)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const f of layer.flowers) {
    if (f.x < x0 || f.x > x1) continue
    const sway = windAt(f.x, t, f.phase) * f.stem * 0.3
    const hx = f.x + sway, hy = f.y - f.stem + Math.abs(sway) * 0.2
    ctx.strokeStyle = '#5d7a3a'
    ctx.lineWidth = Math.max(0.8, f.r * 0.25)
    ctx.beginPath()
    ctx.moveTo(f.x, f.y)
    ctx.quadraticCurveTo(f.x + sway * 0.2, f.y - f.stem * 0.5, hx, hy)
    ctx.stroke()
    ctx.fillStyle = f.petal
    for (let p = 0; p < 7; p++) {
      const a = (p / 7) * Math.PI * 2 + f.phase
      ctx.beginPath()
      ctx.ellipse(hx + Math.cos(a) * f.r * 0.62, hy + Math.sin(a) * f.r * 0.42, f.r * 0.42, f.r * 0.2, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#f2c230'
    ctx.beginPath()
    ctx.arc(hx, hy, f.r * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** รัศมีกิ่งขั้นต่ำบนจอ (px) — ปลายกิ่งเล็กสุดยังมนเห็นชัด ไม่เป็นเส้นเข็ม */
const MIN_BRANCH_RADIUS_PX = 1.4

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
      const p = toScreen(pointOnBranch(b, t), fit)
      const q = toScreen(pointOnBranch(b, Math.min(1, t + 0.01)), fit)
      const pPrev = toScreen(pointOnBranch(b, Math.max(0, t - 0.01)), fit)
      let dx = q[0] - pPrev[0], dy = q[1] - pPrev[1]
      const len = Math.hypot(dx, dy) || 1
      dx /= len; dy /= len
      // เรียวถึงรัศมีปลายปกติ (กิ่งปลายสุดก็ไม่เรียวจนแหลม) + ขั้นต่ำบนจอ → ปลายกิ่งมน ปิดด้วยวงกลมด้านล่าง
      let r = (b.radiusStart + (b.radiusEnd - b.radiusStart) * t) * fit.scale
      // โคนต้นบานออก (เฉพาะท่อนที่เริ่มจากพื้น — ลำต้นหลายท่อนอย่างปาล์ม/ไผ่ไม่บานทุกข้อ, ไผ่ไม่บานเลย)
      if (b.depth === 0 && b.start[1] < 0.01 && model.bark !== 'bamboo') r *= 1 + 0.7 * Math.pow(1 - t, 4)
      r = Math.max(r, MIN_BRANCH_RADIUS_PX)
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
    // หัวมนที่ปลายกิ่ง (ครึ่งวงกลมรัศมีเท่าปลายกิ่ง) — ปลายกิ่งจึงโค้งมน ไม่ตัดตรง/ไม่แหลม
    const [ex, ey] = toScreen(b.end, fit)
    const er = Math.hypot(left[steps][0] - right[steps][0], left[steps][1] - right[steps][1]) / 2
    ctx.beginPath()
    ctx.arc(ex, ey, er, 0, Math.PI * 2)
    ctx.fill()
    if (model.bark !== 'plain' && b.depth <= (model.bark === 'birch' ? 2 : 0)) drawBark(ctx, model, fit, b, left, right, steps)
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

/** ลายเปลือกเฉพาะสายพันธุ์ — birch: ขีดดำแนวขวางบนเปลือกขาว / palm: วงแหวนรอบลำต้น / bamboo: ข้อปล้อง */
function drawBark(
  ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit, b: TreeModel['branches'][number],
  left: [number, number][], right: [number, number][], steps: number,
) {
  // ลายต่อ "ช่วงความยาว" ของกิ่ง — ใช้จุดขอบซ้าย/ขวาที่คำนวณไว้แล้ว (ตั้งฉากกับกิ่งอยู่แล้ว)
  const across = (t: number): [[number, number], [number, number]] => {
    const f = t * steps, i = Math.min(steps - 1, Math.floor(f)), u = f - i
    const lerp = (a: [number, number], c: [number, number]): [number, number] => [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u]
    return [lerp(left[i], left[i + 1]), lerp(right[i], right[i + 1])]
  }
  const [sx, sy] = toScreen(b.start, fit), [ex, ey] = toScreen(b.end, fit)
  const lenPx = Math.hypot(ex - sx, ey - sy)
  ctx.save()
  ctx.lineCap = 'round'
  if (model.bark === 'birch') {
    // เปลือกเบิร์ช: ขีดดำสั้นๆ แนวขวาง กระจายไม่สม่ำเสมอ (seed จากตำแหน่งกิ่ง)
    let k = Math.abs(Math.sin(b.start[0] * 91.7 + b.start[1] * 47.3)) * 1000
    const rnd = () => { k = (k * 9301 + 49297) % 233280; return k / 233280 }
    const n = Math.max(2, Math.round(lenPx / 9))
    ctx.strokeStyle = 'rgba(52, 48, 44, 0.75)'
    for (let i = 0; i < n; i++) {
      const [l, r] = across(0.05 + rnd() * 0.9)
      const a = 0.15 + rnd() * 0.4, w = 0.15 + rnd() * 0.35
      ctx.lineWidth = 1 + rnd() * 1.4
      ctx.beginPath()
      ctx.moveTo(l[0] + (r[0] - l[0]) * a, l[1] + (r[1] - l[1]) * a)
      ctx.lineTo(l[0] + (r[0] - l[0]) * Math.min(1, a + w), l[1] + (r[1] - l[1]) * Math.min(1, a + w))
      ctx.stroke()
    }
  } else if (model.bark === 'palm') {
    // ลำต้นปาล์ม: วงแหวนถี่ๆ รอบลำต้น (รอยทางใบเก่า)
    const n = Math.max(3, Math.round(lenPx / 5))
    ctx.strokeStyle = shade(model.trunkColor, -0.16)
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1.1
    for (let i = 1; i < n; i++) {
      const [l, r] = across(i / n)
      ctx.beginPath()
      ctx.moveTo(l[0], l[1])
      ctx.quadraticCurveTo((l[0] + r[0]) / 2, (l[1] + r[1]) / 2 + 1.5, r[0], r[1])
      ctx.stroke()
    }
  } else if (model.bark === 'bamboo') {
    // ไผ่: ข้อปล้องที่ปลายแต่ละท่อน (เส้นเข้ม + ขอบสว่างใต้ข้อ)
    const [l, r] = across(0.999)
    ctx.strokeStyle = shade(model.trunkColor, -0.2)
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(l[0], l[1])
    ctx.lineTo(r[0], r[1])
    ctx.stroke()
    ctx.strokeStyle = shade(model.trunkColor, 0.18)
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 1
    const [l2, r2] = across(0.94)
    ctx.beginPath()
    ctx.moveTo(l2[0], l2[1])
    ctx.lineTo(r2[0], r2[1])
    ctx.stroke()
  }
  ctx.restore()
}

/** รูปทรงใบ 1 หน่วยต่อแบบใบ: โคนที่ (0,0) ปลายชี้ขึ้นที่ (0,-1) — สร้างครั้งแรกที่วาด
 *  (ไม่สร้างตอน import เพราะบางสภาพแวดล้อม เช่น jsdom ในเทสต์ ไม่มี Path2D) */
const leafPaths = new Map<LeafShape, Path2D>()

/** ใบเมเปิ้ล 5 แฉก (ครึ่งขวา จากก้านใบขึ้นไปถึงปลายแฉกบนสุด) — ครึ่งซ้ายสะท้อนจากชุดนี้ */
const MAPLE_RIGHT: [number, number][] = [
  [0.015, 0], [0.02, -0.12], // ก้านใบ
  [0.1, -0.1], [0.3, -0.06], [0.24, -0.18], // แฉกล่าง ชี้ลงเฉียงออก
  [0.3, -0.24], [0.52, -0.34], [0.44, -0.42], // แฉกข้าง ชี้ออกด้านข้าง
  [0.5, -0.56], [0.36, -0.54], [0.3, -0.62], // ฟันเลื่อยขอบบนแฉกข้าง
  [0.18, -0.52], [0.2, -0.72], [0.1, -0.7], // เว้าลึกเข้าหาแฉกบน + ฟันเลื่อย
  [0.12, -0.86], [0.04, -0.84], [0, -1.02], // แฉกบน ปลายแหลม
]

function getLeafPath(shape: LeafShape): Path2D {
  const cached = leafPaths.get(shape)
  if (cached) return cached
  const p = new Path2D()
  if (shape === 'maple') {
    MAPLE_RIGHT.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)))
    for (let i = MAPLE_RIGHT.length - 2; i >= 0; i--) p.lineTo(-MAPLE_RIGHT[i][0], MAPLE_RIGHT[i][1])
    p.closePath()
    leafPaths.set(shape, p)
    return p
  }
  p.moveTo(0, 0)
  if (shape === 'needle') {
    // ใบเข็มสน: เรียวแคบมาก ปลายแหลม
    p.bezierCurveTo(0.09, -0.2, 0.09, -0.7, 0, -1.05)
    p.bezierCurveTo(-0.09, -0.7, -0.09, -0.2, 0, 0)
  } else if (shape === 'blade') {
    // ใบไผ่/ใบย่อยปาล์ม: เรียวยาว กว้างสุดช่วงล่าง ปลายแหลมยาว
    p.bezierCurveTo(0.16, -0.08, 0.18, -0.4, 0.1, -0.7)
    p.quadraticCurveTo(0.04, -0.92, 0, -1.08)
    p.quadraticCurveTo(-0.04, -0.92, -0.1, -0.7)
    p.bezierCurveTo(-0.18, -0.4, -0.16, -0.08, 0, 0)
  } else if (shape === 'fan') {
    // ใบแปะก๊วย: ก้านเรียว แผ่เป็นพัดขอบบนโค้ง มีรอยเว้าตรงกลาง
    p.lineTo(0.03, -0.3)
    p.bezierCurveTo(0.2, -0.45, 0.5, -0.62, 0.5, -0.82)
    p.quadraticCurveTo(0.3, -1.0, 0.06, -0.92)
    p.lineTo(0, -0.8)
    p.lineTo(-0.06, -0.92)
    p.quadraticCurveTo(-0.3, -1.0, -0.5, -0.82)
    p.bezierCurveTo(-0.5, -0.62, -0.2, -0.45, -0.03, -0.3)
  } else if (shape === 'oak') {
    // ใบโอ๊ก: รูปไข่ขอบหยักมน 4 หยักต่อข้าง
    p.quadraticCurveTo(0.14, -0.05, 0.18, -0.14)
    p.quadraticCurveTo(0.36, -0.2, 0.2, -0.3)
    p.quadraticCurveTo(0.44, -0.4, 0.24, -0.5)
    p.quadraticCurveTo(0.44, -0.62, 0.22, -0.7)
    p.quadraticCurveTo(0.34, -0.86, 0.1, -0.9)
    p.quadraticCurveTo(0.06, -1.02, 0, -1.02)
    p.quadraticCurveTo(-0.06, -1.02, -0.1, -0.9)
    p.quadraticCurveTo(-0.34, -0.86, -0.22, -0.7)
    p.quadraticCurveTo(-0.44, -0.62, -0.24, -0.5)
    p.quadraticCurveTo(-0.44, -0.4, -0.2, -0.3)
    p.quadraticCurveTo(-0.36, -0.2, -0.18, -0.14)
    p.quadraticCurveTo(-0.14, -0.05, 0, 0)
  } else if (shape === 'lance') {
    // ใบเรียวยาว ปลายแหลมชัด
    p.bezierCurveTo(0.26, -0.14, 0.3, -0.55, 0.16, -0.82)
    p.bezierCurveTo(0.1, -0.94, 0.03, -1, 0, -1.06)
    p.bezierCurveTo(-0.03, -1, -0.1, -0.94, -0.16, -0.82)
    p.bezierCurveTo(-0.3, -0.55, -0.26, -0.14, 0, 0)
  } else if (shape === 'petal') {
    // ใบมนนุ่ม ป่องค่อนปลาย คล้ายกลีบดอก
    p.bezierCurveTo(0.28, -0.08, 0.42, -0.58, 0.3, -0.84)
    p.bezierCurveTo(0.22, -0.99, 0.06, -1.02, 0, -1)
    p.bezierCurveTo(-0.06, -1.02, -0.22, -0.99, -0.3, -0.84)
    p.bezierCurveTo(-0.42, -0.58, -0.28, -0.08, 0, 0)
  } else if (shape === 'broad') {
    // ใบกว้างแผ่ โคนป่อง ปลายแหลมนิดๆ
    p.bezierCurveTo(0.42, -0.06, 0.44, -0.46, 0.3, -0.72)
    p.bezierCurveTo(0.2, -0.9, 0.06, -0.98, 0, -1.03)
    p.bezierCurveTo(-0.06, -0.98, -0.2, -0.9, -0.3, -0.72)
    p.bezierCurveTo(-0.44, -0.46, -0.42, -0.06, 0, 0)
  } else {
    // ใบรูปไข่ ป่องกลาง ปลายแหลมนิดๆ
    p.bezierCurveTo(0.3, -0.1, 0.38, -0.48, 0.28, -0.76)
    p.bezierCurveTo(0.2, -0.93, 0.05, -0.99, 0, -1.03)
    p.bezierCurveTo(-0.05, -0.99, -0.2, -0.93, -0.28, -0.76)
    p.bezierCurveTo(-0.38, -0.48, -0.3, -0.1, 0, 0)
  }
  p.closePath()
  leafPaths.set(shape, p)
  return p
}

/** สี่เหลี่ยมบนจอ (CSS px) */
export interface ScreenRect { x0: number; y0: number; x1: number; y1: number }

const overlaps = (a: ScreenRect, b: ScreenRect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

/** กรอบของใบ index i บนจอ (เผื่อการหมุนไหวรอบโคนใบแล้ว) */
export function leafRect(model: TreeModel, fit: TreeFit, i: number): ScreenRect {
  const leaf = model.leaves[i]
  const [x, y] = toScreen(leaf.position, fit)
  const L = Math.max(4, leaf.length * fit.scale) * 1.1 + 2
  return { x0: x - L, y0: y - L, x1: x + L, y1: y + L }
}

/** วาดใบหนึ่งใบ — angleOffset/widthFactor ใช้ตอนใบไหว (หมุนรอบโคนใบ + พลิกแคบลงเหมือนใบบิดตามลม) */
function paintLeaf(
  ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit, dpr: number, i: number, angleOffset = 0, widthFactor = 1,
) {
  const leaf = model.leaves[i]
  const [x, y] = toScreen(leaf.position, fit)
  const L = Math.max(4, leaf.length * fit.scale)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.translate(x, y)
  ctx.rotate(leaf.angle + angleOffset)
  ctx.scale(L * leaf.widthScale * widthFactor, L)
  ctx.fillStyle = leaf.color
  ctx.fill(getLeafPath(model.leafShape))
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

/** แสงแดดอุ่นแบบภาพวาดในวิดีโอพื้นหลัง: ด้านซ้ายบนของพุ่มสว่างอมเหลือง ด้านขวาล่างเงาเย็น
 *  (source-atop = ลงสีเฉพาะบนใบที่วาดแล้ว ไม่เลอะพื้นหลัง) — region = ทาเฉพาะในกรอบนี้ */
export function applyCrownGlaze(ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit, dpr: number, region?: ScreenRect) {
  if (!model.leaves.length) return
  const [ccx, ccy] = toScreen([model.crown.cx, model.crown.cy, 0], fit)
  const crx = model.crown.rx * fit.scale, cry = model.crown.ry * fit.scale
  const R = Math.max(crx, cry) * 1.3
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = 'source-atop'
  const glaze = ctx.createLinearGradient(ccx - crx, ccy - cry, ccx + crx, ccy + cry)
  glaze.addColorStop(0, 'rgba(255, 236, 170, 0.28)')
  glaze.addColorStop(0.5, 'rgba(255, 236, 170, 0)')
  glaze.addColorStop(0.62, 'rgba(24, 48, 40, 0)')
  glaze.addColorStop(1, 'rgba(24, 48, 40, 0.3)')
  ctx.fillStyle = glaze
  const r = region ?? { x0: ccx - R, y0: ccy - R, x1: ccx + R, y1: ccy + R }
  ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0)
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * ชั้นใบ: ก้อนพุ่ม → ใบทีละใบ → แสงแดด → ดอก → ผล
 * opts.skip   = index ใบที่ไม่วาด (กำลังไหวอยู่บนชั้นใบไหว)
 * opts.region = วาดใหม่เฉพาะในกรอบนี้ (ล้างกรอบก่อน) — ใช้ตอนใบเริ่ม/หยุดไหว ไม่ต้องวาดทั้งพุ่มใหม่
 */
export function drawFoliage(
  ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit, dpr: number,
  opts: { skip?: ReadonlySet<number>; region?: ScreenRect } = {},
) {
  const { skip, region } = opts
  if (region) {
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(region.x0, region.y0, region.x1 - region.x0, region.y1 - region.y0)
    ctx.beginPath()
    ctx.rect(region.x0, region.y0, region.x1 - region.x0, region.y1 - region.y0)
    ctx.clip()
  }

  // ก้อนพุ่มใต้ใบ: วงกลมสีใบเข้ม — ใบจริงวาดทับด้านบนให้ขอบพุ่มยังเป็นรูปใบ (ก้อนพุ่มไม่ไหว)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  for (const c of model.clumps) {
    const [x, y] = toScreen(c.position, fit)
    const R = c.radius * fit.scale
    if (region && !overlaps(region, { x0: x - R, y0: y - R, x1: x + R, y1: y + R })) continue
    ctx.fillStyle = c.color
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < model.leaves.length; i++) {
    if (skip?.has(i)) continue
    if (region && !overlaps(region, leafRect(model, fit, i))) continue
    paintLeaf(ctx, model, fit, dpr, i)
  }

  applyCrownGlaze(ctx, model, fit, dpr, region)

  for (const f of model.flowers) {
    const [x, y] = toScreen(f.position, fit)
    const R = Math.max(3, f.radius * fit.scale)
    if (region && !overlaps(region, { x0: x - R, y0: y - R, x1: x + R, y1: y + R })) continue
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.translate(x, y)
    if (f.kind === 'magnolia') {
      // แมกโนเลีย: ดอกใหญ่ทรงถ้วย กลีบยาวชี้ขึ้น กลีบหลังเข้มกว่า โคนกลีบอมชมพู
      ctx.rotate((f.rotation - Math.PI) * 0.08)
      for (const [a, back] of [[-0.95, true], [0.95, true], [-0.5, false], [0.5, false], [0, false]] as const) {
        const cx = Math.sin(a) * R * 0.5, cy = -Math.cos(a) * R * 0.5
        const grad = ctx.createLinearGradient(0, 0, cx * 2, cy * 2)
        grad.addColorStop(0, '#e58aa9')
        grad.addColorStop(0.55, back ? shade('#f7d5e0', -0.04) : f.color)
        grad.addColorStop(1, back ? '#f7dbe5' : '#fffafc')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(cx, cy, R * 0.3, R * 0.62, a, 0, Math.PI * 2)
        ctx.fill()
      }
      continue
    }
    ctx.rotate(f.rotation)
    ctx.fillStyle = f.color
    for (let k = 0; k < 5; k++) {
      ctx.rotate((Math.PI * 2) / 5)
      ctx.beginPath()
      ctx.ellipse(0, -R * 0.55, R * 0.42, R * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = f.center ?? '#FFE08A'
    ctx.fill()
  }

  // ผลไม้: ลูกกลมมีแสงเงา (สว่างซ้ายบน) + ขั้วสั้นๆ
  for (const fr of model.fruits) {
    const [x, y] = toScreen(fr.position, fit)
    const R = Math.max(2.5, fr.radius * fit.scale)
    if (region && !overlaps(region, { x0: x - R, y0: y - R * 1.6, x1: x + R, y1: y + R })) continue
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.strokeStyle = '#5b4028'
    ctx.lineWidth = Math.max(1, R * 0.16)
    ctx.beginPath()
    ctx.moveTo(x, y - R * 0.8)
    ctx.lineTo(x + R * 0.12, y - R * 1.4)
    ctx.stroke()
    const grad = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R)
    grad.addColorStop(0, shade(fr.color, 0.2))
    grad.addColorStop(0.6, fr.color)
    grad.addColorStop(1, shade(fr.color, -0.14))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (region) ctx.restore()
}

/** ใบที่กำลังไหว: หมุนรอบโคนใบ + บิดแคบลง แล้วทาแสงแดดทับเฉพาะใบนั้น (สีตรงกับใบบนชั้นหลัก) */
export function drawFlutterLeaf(
  ctx: CanvasRenderingContext2D, model: TreeModel, fit: TreeFit, dpr: number, i: number, angleOffset: number, widthFactor: number,
) {
  paintLeaf(ctx, model, fit, dpr, i, angleOffset, widthFactor)
  applyCrownGlaze(ctx, model, fit, dpr, leafRect(model, fit, i))
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
