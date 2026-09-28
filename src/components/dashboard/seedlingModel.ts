import type { MbtiType } from '../../types'
import { buildTreeModel } from '../tree/procedural/buildTreeModel'

/** โคนต้นอยู่ที่ 96% ของความสูงกรอบ / ต้นสูง 88% ของกรอบ — PlantIntro ใช้ค่าเดียวกันคำนวณขนาดตอนลงดิน */
export const SEEDLING_BASE_Y = 0.96
export const SEEDLING_HEIGHT_RATIO = 0.88

/** โมเดลต้นไม้ชุดเดียวกับที่หน้า Home วาด (buildTreeModel อินพุตเดียวกัน) */
export function seedlingModel(mbtiType: MbtiType | null, trunkBranchLevel: number, leafFlowerLevel = 0, compact = false) {
  return buildTreeModel({ mbtiType, trunkBranchLevel: Math.max(1, trunkBranchLevel), leafFlowerLevel, compact })
}
