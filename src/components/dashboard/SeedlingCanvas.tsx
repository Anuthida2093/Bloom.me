import { useLayoutEffect, useMemo, useRef } from 'react'
import type { MbtiType } from '../../types'
import { SEEDLING_BASE_Y, SEEDLING_HEIGHT_RATIO, seedlingModel } from './seedlingModel'
import { drawBranches, drawFoliage, fitTree } from '../tree/procedural/drawTree2D'

/*============================================================================*\
  SeedlingCanvas — [แก้ตามที่ระบุ] ต้นกล้าของ MBTI นั้นจริงๆ (สายพันธุ์/รูปใบ/สีเดียวกับต้นไม้บนหน้า Home)
  วาดด้วยเครื่องวาดต้นไม้ชุดเดียวกัน (buildTreeModel + drawTree2D) แต่เฉพาะลำต้น+ใบ ไม่มีพื้นหญ้า
  ขยายให้เต็มกรอบ — ใช้ในฉากรับต้นกล้า (PlantIntro.tsx)
\*============================================================================*/

interface SeedlingCanvasProps {
  mbtiType: MbtiType | null
  /** เลเวลลำต้นของเจ้าของ (ผู้ใช้ใหม่ = 1) — ต้นกล้าหน้าตาเดียวกับที่จะปลูกบนหน้า Home */
  trunkBranchLevel: number
  leafFlowerLevel?: number
  /** จอเล็ก — ใช้ทรงเดียวกับต้นบนหน้า Home (TreeOfLife ใช้ compact บนจอ ≤640px) */
  compact?: boolean
  /** ขนาดกรอบวาด (CSS px) */
  width: number
  height: number
}

export default function SeedlingCanvas({ mbtiType, trunkBranchLevel, leafFlowerLevel = 0, compact = false, width, height }: SeedlingCanvasProps) {
  const branchRef = useRef<HTMLCanvasElement>(null)
  const foliageRef = useRef<HTMLCanvasElement>(null)
  // [แก้ตามที่ระบุ] ต้นเดียวกับบนหน้า Home ทุกอย่าง (โมเดลเดียวกัน) → ตอนสลับเป็นต้นจริงไม่เห็นรอยต่อ
  const model = useMemo(
    () => seedlingModel(mbtiType, trunkBranchLevel, leafFlowerLevel, compact),
    [mbtiType, trunkBranchLevel, leafFlowerLevel, compact],
  )

  useLayoutEffect(() => {
    const branch = branchRef.current, foliage = foliageRef.current
    if (!branch || !foliage || width < 2 || height < 2) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // เต็มกรอบ: โคนต้นที่ 96% ของความสูง ต้นสูง ~88% ของกรอบ (ชดเชยตัวคูณ growth ของต้นกล้า)
    const fit = fitTree(model, width, height, SEEDLING_BASE_Y, SEEDLING_HEIGHT_RATIO / Math.max(model.growth, 0.1))
    for (const c of [branch, foliage]) {
      c.width = Math.round(width * dpr)
      c.height = Math.round(height * dpr)
      c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const bctx = branch.getContext('2d'), fctx = foliage.getContext('2d')
    if (!bctx || !fctx) return
    drawBranches(bctx, model, fit)
    drawFoliage(fctx, model, fit, dpr)
  }, [model, width, height])

  const style = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const
  return (
    <>
      <canvas ref={branchRef} style={style} />
      <canvas ref={foliageRef} style={style} />
    </>
  )
}
