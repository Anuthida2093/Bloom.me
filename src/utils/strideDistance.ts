import type { Gender } from '../types'

/*============================================================================*\
  strideDistance.ts — ระยะทางจากจำนวนก้าว โดยประมาณความยาวก้าวจากส่วนสูง
    ระยะทาง (ม.) = ก้าว × (ส่วนสูง cm × ค่าคงที่เพศ) / 100
    ค่าคงที่: หญิง 0.413 · ชาย 0.415 · ไม่ทราบเพศ = ค่าเฉลี่ย 0.414
  ส่วนสูงไม่มี/ผิดปกติ → คืน null (ให้ผู้เรียกซ่อนค่าระยะทาง ไม่เดาส่วนสูงแทน)
\*============================================================================*/

export const STRIDE_FACTOR: Record<Gender, number> = { FEMALE: 0.413, MALE: 0.415 }
const STRIDE_FACTOR_UNKNOWN = 0.414

export function strideLengthMeters(heightCm: number, gender: Gender | null | undefined): number {
  return (heightCm * (gender ? STRIDE_FACTOR[gender] : STRIDE_FACTOR_UNKNOWN)) / 100
}

export function stepsToDistanceMeters(
  steps: number, heightCm: number | null | undefined, gender: Gender | null | undefined,
): number | null {
  if (!heightCm || !Number.isFinite(heightCm) || heightCm <= 0) return null
  return Math.max(0, steps) * strideLengthMeters(heightCm, gender)
}

/** แสดงผล: < 1 กม. เป็นเมตร, ตั้งแต่ 1 กม. เป็นกิโลเมตรทศนิยม 2 ตำแหน่ง */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} ม.` : `${(meters / 1000).toFixed(2)} กม.`
}
