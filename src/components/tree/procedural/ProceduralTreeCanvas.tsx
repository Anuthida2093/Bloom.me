import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { TreeModel } from './buildTreeModel'
import { drawBranches, drawFoliage, fitTree } from './drawTree2D'

interface ProceduralTreeCanvasProps {
  model: TreeModel
  /** ขนาดกล่อง .tree-of-life จริง (CSS px) — null = ยังวัดไม่เสร็จ */
  size: { w: number; h: number } | null
  /** style ของชั้นใบ (filter ใบเหี่ยว/ความจาง) — ลำต้นไม่โดนผลนี้ */
  foliageStyle?: CSSProperties
  /** class เพิ่มของชั้นใบ (เช่น ลมกระโชก) */
  foliageClassName?: string
}

/**
 * ProceduralTreeCanvas — ต้นไม้ procedural วาด 2D ลง canvas 2 ชั้น (ลำต้น/กิ่ง + ใบ/ดอก)
 * วาดใหม่เฉพาะตอนข้อมูลต้นไม้หรือขนาดกล่องเปลี่ยน (ไม่วาดทุกเฟรม) — การไหวตามลมเป็น CSS
 * transform บน canvas ใบทั้งแผ่น จึงไม่ต้องวาดซ้ำ
 */
export default function ProceduralTreeCanvas({ model, size, foliageStyle, foliageClassName }: ProceduralTreeCanvasProps) {
  const branchRef = useRef<HTMLCanvasElement>(null)
  const foliageRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const branchCanvas = branchRef.current
    const foliageCanvas = foliageRef.current
    if (!size || !branchCanvas || !foliageCanvas || size.w < 2 || size.h < 2) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const fit = fitTree(model, size.w, size.h)
    for (const canvas of [branchCanvas, foliageCanvas]) {
      canvas.width = Math.round(size.w * dpr)
      canvas.height = Math.round(size.h * dpr)
    }
    const bctx = branchCanvas.getContext('2d')
    const fctx = foliageCanvas.getContext('2d')
    if (!bctx || !fctx) return
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bctx.clearRect(0, 0, size.w, size.h)
    drawBranches(bctx, model, fit)
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    fctx.clearRect(0, 0, size.w, size.h)
    drawFoliage(fctx, model, fit, dpr)
  }, [model, size])

  return (
    <>
      <canvas ref={branchRef} className="tree-of-life__canvas tree-of-life__canvas--branches" aria-hidden="true" />
      <canvas
        ref={foliageRef}
        className={['tree-of-life__canvas', 'tree-of-life__canvas--foliage', foliageClassName].filter(Boolean).join(' ')}
        style={foliageStyle}
        aria-hidden="true"
      />
    </>
  )
}
