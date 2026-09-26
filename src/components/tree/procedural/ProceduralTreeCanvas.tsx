import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import type { TreeModel } from './buildTreeModel'
import { buildMeadow, drawBranches, drawFlutterLeaf, drawFoliage, drawGround, drawMeadow, fitTree, leafRect } from './drawTree2D'

interface ProceduralTreeCanvasProps {
  model: TreeModel
  /** ขนาดฉากทั้งหมด (CSS px) — กว้างกว่าจอได้เมื่อเลื่อนซ้าย-ขวาได้ — null = ยังวัดไม่เสร็จ */
  size: { w: number; h: number } | null
  /** ความกว้างของจอที่มองเห็น (ต้นไม้จัดขนาดตามนี้ ไม่ใช่ตามความกว้างฉาก) — ไม่ระบุ = เท่าฉาก */
  viewWidth?: number
  /** ตำแหน่งเลื่อนปัจจุบัน (px, ≤ 0) — ใช้วาดหญ้าไหวเฉพาะช่วงที่อยู่ในจอ */
  panRef?: RefObject<number>
  /** เลเวลหญ้า/ดิน (healthStack) — ความหนาแน่นของหญ้า/ดอกไม้ในทุ่ง */
  grassSoilLevel: number
  /** ความแห้งของดิน 0 (เขียวสด) → 1 (ดินร้าง) — ดู config/groundFertility.ts */
  dryness: number
  /** false = หญ้าไม่ไหว วาดภาพนิ่งครั้งเดียว (prefers-reduced-motion) */
  animateWind?: boolean
  /** style ชั้นใบ (filter ใบเหี่ยว/ความจาง) — ลำต้นไม่โดนผลนี้ */
  foliageStyle?: CSSProperties
}

/** หญ้าไหวที่ ~30 fps พอ (ลมช้าๆ) — ประหยัดแบตมือถือครึ่งหนึ่งเทียบกับ 60 fps */
const WIND_FRAME_MS = 1000 / 30
/** ชั้นที่กว้างเท่าฉาก (ดิน/หญ้า) ใช้ความละเอียดไม่เกินนี้ — ฉากกว้างหลายเท่าจอ ประหยัดหน่วยความจำ */
const WIDE_LAYER_MAX_DPR = 1.5
/** ใบไหวพร้อมกันได้สูงสุดกี่ใบ (ธรรมชาติ: ทีละ 2-3 ใบ ไม่ไหวทั้งพุ่ม) */
const FLUTTER_SLOTS = 3

interface FlutterSlot {
  /** index ใบที่กำลังไหว (-1 = ว่าง รอถึง nextAt) */
  leaf: number
  start: number
  duration: number
  amp: number
  freq: number
  nextAt: number
}

/**
 * ProceduralTreeCanvas — ต้นไม้ procedural วาด 2D ลง canvas 6 ชั้น:
 *   แปลงหญ้า/ดิน → หญ้าหลังต้น (ไหว) → ลำต้น/กิ่ง → หญ้าหน้าต้น (ไหว ทับโคนต้น) → ใบ+ดอก → ใบที่กำลังไหว
 * ใบไหวทีละ 2-3 ใบแบบสุ่ม (เฉพาะใบริมพุ่ม ก้อนพุ่มไม่ขยับ): ตอนใบเริ่มไหว ลบใบนั้นออกจากชั้นใบ
 * (วาดใหม่เฉพาะกรอบเล็กๆ รอบใบ) แล้ววาดใบที่หมุน/บิดบนชั้นใบไหวทุกเฟรม — หยุดไหวก็วาดกลับที่เดิม
 * ดิน/หญ้ากว้างเต็มฉาก (เลื่อนดูได้) ส่วนต้นไม้วาดบนแถบกว้างเท่าจอตรงกลางฉาก
 * ดิน/ลำต้น/ใบ วาดใหม่เฉพาะตอนข้อมูลหรือขนาดเปลี่ยน — มีแค่ 2 ชั้นหญ้าที่วาดซ้ำทุกเฟรม (เฉพาะช่วงที่อยู่ในจอ)
 */
export default function ProceduralTreeCanvas({
  model, size, viewWidth, panRef, grassSoilLevel, dryness, animateWind = true, foliageStyle,
}: ProceduralTreeCanvasProps) {
  const groundRef = useRef<HTMLCanvasElement>(null)
  const meadowBackRef = useRef<HTMLCanvasElement>(null)
  const branchRef = useRef<HTMLCanvasElement>(null)
  const meadowFrontRef = useRef<HTMLCanvasElement>(null)
  const foliageRef = useRef<HTMLCanvasElement>(null)
  const flutterRef = useRef<HTMLCanvasElement>(null)

  const view = Math.min(viewWidth ?? size?.w ?? 0, size?.w ?? 0)
  const bandLeft = size ? (size.w - view) / 2 : 0

  useLayoutEffect(() => {
    const ground = groundRef.current, branch = branchRef.current, foliage = foliageRef.current
    if (!size || size.w < 2 || size.h < 2 || view < 2 || !ground || !branch || !foliage) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const wideDpr = Math.min(dpr, WIDE_LAYER_MAX_DPR)
    const treeFit = fitTree(model, view, size.h)
    const setup = (c: HTMLCanvasElement, w: number, d: number) => {
      c.width = Math.round(w * d)
      c.height = Math.round(size.h * d)
      const ctx = c.getContext('2d')
      ctx?.setTransform(d, 0, 0, d, 0, 0)
      return ctx
    }
    const gctx = setup(ground, size.w, wideDpr)
    const bctx = setup(branch, view, dpr)
    const fctx = setup(foliage, view, dpr)
    if (!gctx || !bctx || !fctx) return
    drawGround(gctx, { ...treeFit, baseX: size.w / 2 }, size.w, size.h, dryness)
    drawBranches(bctx, model, treeFit)
    drawFoliage(fctx, model, treeFit, dpr)
  }, [model, size, view, dryness])

  // หญ้า/ดอกเดซี่ไหวตามลม — วน requestAnimationFrame (เบราว์เซอร์หยุดให้เองตอนแท็บไม่แสดงผล)
  useEffect(() => {
    const back = meadowBackRef.current
    const front = meadowFrontRef.current
    if (!size || size.w < 2 || size.h < 2 || view < 2 || !back || !front) return
    const d = Math.min(window.devicePixelRatio || 1, WIDE_LAYER_MAX_DPR)
    const fit = { ...fitTree(model, view, size.h), baseX: size.w / 2 }
    const meadow = buildMeadow(fit, size.w, size.h, grassSoilLevel, dryness, view)
    const layers = [
      { canvas: back, data: meadow.back },
      { canvas: front, data: meadow.front },
    ].map(({ canvas, data }) => {
      canvas.width = Math.round(size.w * d)
      canvas.height = Math.round(size.h * d)
      return { ctx: canvas.getContext('2d'), data }
    })
    const render = (t: number, visible?: [number, number]) => {
      const [x0, x1] = visible ?? [0, size.w]
      for (const { ctx, data } of layers) {
        if (!ctx) continue
        ctx.setTransform(d, 0, 0, d, 0, 0)
        ctx.clearRect(x0 - 40, 0, x1 - x0 + 80, size.h)
        drawMeadow(ctx, data, t, visible)
      }
    }
    if (!animateWind) {
      render(0)
      return
    }
    let raf = 0
    let last = -Infinity
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < WIND_FRAME_MS) return
      last = now
      // วาดเฉพาะช่วงของฉากที่อยู่ในจอตอนนี้ (+ขอบเผื่อ) — ฉากกว้างกว่าจอหลายเท่าก็ไม่หนักขึ้น
      const x0 = -(panRef?.current ?? -bandLeft)
      render(now / 1000, [x0, x0 + view])
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [model, size, view, bandLeft, panRef, grassSoilLevel, dryness, animateWind])

  // ใบไหวตามลมทีละ 2-3 ใบ — ช่องละใบ แต่ละช่องไหว 1.2-2.4 วินาที แล้วพักสุ่ม ไม่พร้อมกัน
  useEffect(() => {
    const foliage = foliageRef.current
    const flutter = flutterRef.current
    if (!animateWind || !size || size.h < 2 || view < 2 || !foliage || !flutter || !model.flutterable.length) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const fit = fitTree(model, view, size.h)
    const fctx = foliage.getContext('2d')
    flutter.width = Math.round(view * dpr)
    flutter.height = Math.round(size.h * dpr)
    const lctx = flutter.getContext('2d')
    if (!fctx || !lctx) return
    const skip = new Set<number>()
    const now0 = performance.now() / 1000
    const slots: FlutterSlot[] = Array.from({ length: FLUTTER_SLOTS }, (_, k) => ({
      leaf: -1, start: 0, duration: 0, amp: 0, freq: 0, nextAt: now0 + 0.3 + k * 0.7 + Math.random() * 0.6,
    }))
    const restore = (leaf: number) => {
      skip.delete(leaf)
      drawFoliage(fctx, model, fit, dpr, { skip, region: leafRect(model, fit, leaf) })
    }

    let raf = 0
    let last = -Infinity
    const loop = (nowMs: number) => {
      raf = requestAnimationFrame(loop)
      if (nowMs - last < WIND_FRAME_MS) return
      last = nowMs
      const t = nowMs / 1000
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lctx.clearRect(0, 0, view, size.h)
      for (const s of slots) {
        if (s.leaf >= 0 && t - s.start >= s.duration) {
          restore(s.leaf)
          s.leaf = -1
          s.nextAt = t + 0.4 + Math.random() * 1.6
        }
        if (s.leaf < 0 && t >= s.nextAt) {
          const pool = model.flutterable
          const pick = pool[Math.floor(Math.random() * pool.length)]
          if (!skip.has(pick)) {
            s.leaf = pick
            s.start = t
            s.duration = 1.2 + Math.random() * 1.2
            s.amp = 0.14 + Math.random() * 0.16
            s.freq = 1.8 + Math.random() * 1.4
            skip.add(pick)
            drawFoliage(fctx, model, fit, dpr, { skip, region: leafRect(model, fit, pick) })
          }
        }
        if (s.leaf >= 0) {
          const u = (t - s.start) / s.duration
          const env = Math.sin(Math.PI * Math.min(1, u)) // ค่อยๆ เริ่ม-ค่อยๆ หยุด กลับมาที่มุมเดิมพอดี
          const wave = Math.sin(2 * Math.PI * s.freq * (t - s.start))
          drawFlutterLeaf(lctx, model, fit, dpr, s.leaf, s.amp * env * wave, 1 - 0.35 * env * Math.abs(wave))
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      // คืนใบที่ค้างอยู่กลางการไหวกลับชั้นใบหลัก
      for (const leaf of [...skip]) restore(leaf)
      lctx.setTransform(1, 0, 0, 1, 0, 0)
      lctx.clearRect(0, 0, flutter.width, flutter.height)
    }
  }, [model, size, view, animateWind])

  const bandStyle: CSSProperties = { left: bandLeft, width: view }
  return (
    <>
      <canvas ref={groundRef} className="tree-of-life__canvas tree-of-life__canvas--ground" aria-hidden="true" />
      <canvas ref={meadowBackRef} className="tree-of-life__canvas tree-of-life__canvas--meadow" aria-hidden="true" />
      <canvas ref={branchRef} className="tree-of-life__canvas tree-of-life__canvas--branches" style={bandStyle} aria-hidden="true" />
      <canvas ref={meadowFrontRef} className="tree-of-life__canvas tree-of-life__canvas--meadow-front" aria-hidden="true" />
      <canvas
        ref={foliageRef}
        className="tree-of-life__canvas tree-of-life__canvas--foliage"
        style={{ ...foliageStyle, ...bandStyle }}
        aria-hidden="true"
      />
      <canvas
        ref={flutterRef}
        className="tree-of-life__canvas tree-of-life__canvas--foliage tree-of-life__canvas--flutter"
        style={{ ...foliageStyle, ...bandStyle }}
        aria-hidden="true"
      />
    </>
  )
}
