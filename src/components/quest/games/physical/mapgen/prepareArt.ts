import { MUSHROOM_FOREST_PALETTE } from '../../../../../config/generatedMapArt'
import type { Ctx2D } from '../../../../scenery/sceneryPrimitives'
import { generateMapScene } from './generateMapScene'
import { paintMapSceneSteps, paintStepCount } from './paintMapScene'

/*============================================================================*\
  prepareArt — เตรียมงานวาดภาพแผนที่โค้ด (แผนที่ 9) — ใช้ร่วมกันทั้ง worker และทางสำรองบนเธรดหลัก
  คืน steps (generator ทีละช่วง) + จำนวนช่วงทั้งหมด → ผู้เรียกรายงานความคืบหน้าจริงเอง
\*============================================================================*/

export interface MapArtSource { seed: number }

export interface PreparedArt {
  steps: Generator<void, void, void>
  total: number
  generateMs: number
}

export async function prepareArt(src: MapArtSource, ctx: Ctx2D, size: number): Promise<PreparedArt> {
  const t0 = performance.now()
  const scene = generateMapScene(src.seed)
  const generateMs = performance.now() - t0
  return { steps: paintMapSceneSteps(ctx, scene, MUSHROOM_FOREST_PALETTE, size / scene.world), total: paintStepCount(scene), generateMs }
}

/** คีย์ของภาพ (แคชในหน่วยความจำ + แคชถาวร) */
export function artIdOf(src: MapArtSource): string {
  return String(src.seed)
}
