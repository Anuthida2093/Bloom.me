import type { MbtiType } from '../types'

/*============================================================================*\
  treeAssets.ts — [ไฟล์ใหม่] ที่อยู่ไฟล์ภาพต้นไม้ชุดใหม่ (trunk/leaf/ground) ที่จัดกลุ่มตาม
  "shape" (1-4) แทนการแยกทีละ MBTI 16 แบบ — มี asset จริงแค่ trunk/shape-1 ตอนนี้ (ดู
  public/assets/images/tree/) ที่เหลือยังเป็นโฟลเดอร์เปล่ารอ asset (README ในแต่ละโฟลเดอร์
  บอกชื่อไฟล์ที่ต้องการไว้แล้ว)

  [หมายเหตุสำคัญ] ระบบนี้ "แยกต่างหาก" จากระบบเดิมที่ TreeOfLife.tsx ใช้อยู่ก่อนหน้า
  (src/assets/trees/<MBTI>/trunk_lvl{N}.* โหลดผ่าน import.meta.glob) ซึ่งจัดกลุ่มตาม MBTI
  ตรงๆ ทีละ 16 โฟลเดอร์ — ระบบเดิมยังว่างเปล่าอยู่ (มีแค่โฟลเดอร์ BALANCED ไม่มีไฟล์จริง จึง
  render เป็น placeholder 🌱 มาตลอด) ตอนนี้เปลี่ยนมาใช้ระบบนี้แทนเฉพาะ "ลำต้น" เท่านั้น
  ส่วนหญ้า/ใบไม้-ดอกไม้ (grassUrl/leafBrushUrls/flowerBrushUrls ใน TreeOfLife.tsx) ยังคงใช้
  ระบบเดิม (src/assets/trees) เหมือนเดิมทุกจุด — ยังไม่ได้ย้ายมาระบบนี้ในรอบนี้
\*============================================================================*/

export type TreeShape = 1 | 2 | 3 | 4

/** กลุ่ม MBTI ตาม temperament (Analysts/Diplomats/Sentinels/Explorers) → shape 1-4
 *  ตามที่ยืนยันแล้ว (ดูสรุปงาน) */
export const MBTI_SHAPE_MAP: Record<MbtiType, TreeShape> = {
  INTJ: 1, INTP: 1, ENTJ: 1, ENTP: 1, // Analysts (NT)
  INFJ: 2, INFP: 2, ENFJ: 2, ENFP: 2, // Diplomats (NF)
  ISTJ: 3, ISFJ: 3, ESTJ: 3, ESFJ: 3, // Sentinels (SJ)
  ISTP: 4, ISFP: 4, ESTP: 4, ESFP: 4, // Explorers (SP)
}

const DEFAULT_SHAPE: TreeShape = 1

function resolveShape(mbtiType: MbtiType | null | undefined): TreeShape {
  return (mbtiType && MBTI_SHAPE_MAP[mbtiType]) ?? DEFAULT_SHAPE
}

function clampVisualLevel(visualLevel: number): number {
  return Math.max(1, Math.min(8, Math.round(visualLevel)))
}

/** ลำต้น — มี asset จริงเฉพาะ shape-1 ตอนนี้ (ดู public/assets/images/tree/trunk/) */
export function getTrunkImagePath(mbtiType: MbtiType | null | undefined, visualLevel: number): string {
  const shape = resolveShape(mbtiType)
  const clamped = clampVisualLevel(visualLevel)
  return `/assets/images/tree/trunk/shape-${shape}/trunk_shape-${shape}_lv${clamped}.png`
}

/** ใบไม้ — [เตรียมไว้รอ asset] ยังไม่มีไฟล์จริงสักตัว โครงไว้ให้งานต่อเนื่องเรียกใช้ได้ทันที */
export function getLeafImagePath(mbtiType: MbtiType | null | undefined, visualLevel: number): string {
  const shape = resolveShape(mbtiType)
  const clamped = clampVisualLevel(visualLevel)
  return `/assets/images/tree/leaf/shape-${shape}/tree_shape-${shape}_leaf_lv${clamped}.png`
}

/** พื้นดิน — [เตรียมไว้รอ asset] ไม่ผูกกับ MBTI/shape มีแค่ 3 variant ใช้ร่วมกันทุกต้น
 *  variant คงที่ (ไม่ได้ผูกกับ level) — ผู้เรียกเป็นคนสุ่ม/เลือก variant เอง (1-3) */
export function getGroundImagePath(variant: 1 | 2 | 3): string {
  return `/assets/images/tree/ground/ground_variant_${variant}.png`
}

/*============================================================================*\
  toVisualLevel — map "เลเวลระบบจริง" (trunkBranchLevel ไม่มีเพดานบน คำนวณจาก
  Math.max(1, Math.floor(knowledgeStack / STACK_PER_VISUAL_LEVEL) + 1) ใน UserContext.tsx/
  Dashboard.tsx) ให้เป็น "visual level 1-8" ที่มีเพดาน (จำนวนไฟล์ภาพที่มีจริง)

  [ตรวจ pace จริงแล้ว] STACK_PER_VISUAL_LEVEL = 50 (types.ts) เควสหมวดความรู้ที่ทำซ้ำได้
  ทุกวัน (isDaily:true) ให้ expReward รวมกันประมาณ 20+40+35+25+50 = 170 คะแนน/วัน "ถ้าทำครบ
  ทุกเควสทุกวัน" (≈3.4 เลเวลระบบ/วัน) ส่วนผู้เล่นทั่วไปที่ทำ 1 เควส/วันจะได้ราว 20-50
  คะแนน/วัน (≈0.4-1 เลเวลระบบ/วัน) — ด้วย pace นี้ bucket ที่เสนอมา (ถี่ช่วงต้น/ห่างช่วงท้าย
  ทีละ +1 เควสในแต่ละขั้น) ให้จังหวะที่สมเหตุสมผลสำหรับผู้เล่นทั่วไป: visual level ใหม่ทุก
  ~1-2 สัปดาห์ในช่วงแรก ยืดเป็น ~1-2 เดือนในช่วงท้ายก่อนถึงเพดาน 8 — ผู้เล่นขยันสุดขีดจะไต่ถึง
  เพดานเร็วกว่านั้นมาก (ในหลักสิบวัน) ซึ่งเป็นข้อจำกัดโดยธรรมชาติของระบบที่มีภาพแค่ 8 ระดับ
  ไม่ใช่สิ่งที่ปรับ bucket แก้ได้ (ต้องเพิ่มจำนวนภาพถ้าต้องการแก้จุดนี้จริง) — ค่าเริ่มต้นที่
  ให้มาจึงคงไว้ตามเดิมไม่ได้ปรับ */
export function toVisualLevel(systemLevel: number): number {
  if (systemLevel <= 2) return 1
  if (systemLevel <= 5) return 2
  if (systemLevel <= 9) return 3
  if (systemLevel <= 14) return 4
  if (systemLevel <= 20) return 5
  if (systemLevel <= 27) return 6
  if (systemLevel <= 35) return 7
  return 8 // ครอบคลุมเลเวลระบบสูงสุดที่เหลือทั้งหมด ไม่มีเพดานบน
}
