import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import type { TreeModel } from './buildTreeModel'
import { buildMeadow, drawBranches, drawFoliage, drawGround, drawMeadow, fitTree } from './drawTree2D'

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

/**
 * ProceduralTreeCanvas — ต้นไม้ procedural วาด 2D ลง canvas 5 ชั้น:
 *   แปลงหญ้า/ดิน → หญ้าหลังต้น (ไหว) → ลำต้น/กิ่ง → หญ้าหน้าต้น (ไหว ทับโคนต้น) → ใบ+ดอก
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
    </>
  )
}
