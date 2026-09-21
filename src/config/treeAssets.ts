import type { MbtiType } from '../types'

/*============================================================================*\
  treeAssets.ts — ที่อยู่ไฟล์ภาพต้นไม้ชุดใหม่ (trunk/leaf/ground) จัดกลุ่มตาม "shape" (1-4)
  แทนการแยกทีละ MBTI 16 แบบ

  [แก้ตามที่ระบุ — รอบนี้] ไฟล์จริงที่ทีมงานส่งมอบมาที่ public/assets/images/tree/ ยัง
  ไม่ได้ rename เป็นชื่อ/โฟลเดอร์ตามที่ระบบเคย scaffold ไว้ก่อนหน้า (trunk/shape-{N}/...)
  เลยสักไฟล์ — ยังอยู่ในโฟลเดอร์ต้นทางที่ส่งมอบมาตรงๆ (ชื่อภาษาไทย + เลขรหัสต่อท้าย + ใช้
  ตัวอักษร A/B/C/D แทนเลข 1-4) แก้โค้ดให้ชี้ไปที่ไฟล์จริงตรงๆ แทนการรอ rename (เจ้าของ
  โปรเจกต์ยืนยันว่าจะจัดการเรื่อง alpha ของ leaf เองภายหลัง โค้ดนี้แค่ให้ชี้ไฟล์ถูกที่ก่อน)

  [สำคัญ — การจับคู่ตัวอักษร↔เลข shape] ไฟล์ดิบใช้ตัวอักษร A/B/C/D ซึ่ง "ไม่ได้เรียงตรงกับ"
  เลข shape 1-4 ที่ผูก MBTI ไว้ด้านล่าง — ยืนยันจากหลักฐานจริงในชื่อโฟลเดอร์สีเฉพาะ MBTI
  ของชุด LeafCanopy: shape C มีโฟลเดอร์สี "INTJ" (กลุ่ม NT) ตรงกับ shape เลข 1, shape A มี
  โฟลเดอร์สี ESFJ/ESTJ/ISFJ/ISTJ (กลุ่ม SJ) ตรงกับ shape เลข 3, shape B มี ESFP/ESTP/ISFP/
  ISTP (กลุ่ม SP) ตรงกับ shape เลข 4 — shape D ไม่เหลือโฟลเดอร์สีให้ยืนยันตรงๆ (คือกลุ่ม NF
  ที่เหลือจากการตัดออก) ตรงกับ shape เลข 2 ห้าม map ตามลำดับตัวอักษรตรงๆ (A→1,B→2,...)
  เพราะจะได้ทรงผิดกลุ่ม MBTI ทั้ง 4 กลุ่มทันที

  [หมายเหตุสำคัญ] ระบบนี้ "แยกต่างหาก" จากระบบเดิมที่ TreeOfLife.tsx เคยใช้ (src/assets/
  trees/<MBTI>/trunk_lvl{N}.* โหลดผ่าน import.meta.glob) ซึ่งไม่มีไฟล์จริงเลยสักไฟล์ (เช็ค
  แล้ว มีแค่ .gitkeep) — leaf/ground ย้ายมาใช้ระบบนี้แทนแล้วในรอบนี้ (เดิมยังใช้ระบบเก่าอยู่)
\*============================================================================*/

export type TreeShape = 1 | 2 | 3 | 4
export type RawShapeLetter = 'A' | 'B' | 'C' | 'D'

/** กลุ่ม MBTI ตาม temperament (Analysts/Diplomats/Sentinels/Explorers) → shape 1-4
 *  ตามที่ยืนยันแล้ว (ดูสรุปงาน) — mapping นี้ "คงเดิมไม่แก้" ตัวที่แก้คือ SHAPE_TO_RAW_LETTER
 *  ด้านล่างซึ่งแปลเลขนี้ไปหาตัวอักษรไฟล์จริงอีกที */
export const MBTI_SHAPE_MAP: Record<MbtiType, TreeShape> = {
  INTJ: 1, INTP: 1, ENTJ: 1, ENTP: 1, // Analysts (NT)
  INFJ: 2, INFP: 2, ENFJ: 2, ENFP: 2, // Diplomats (NF)
  ISTJ: 3, ISFJ: 3, ESTJ: 3, ESFJ: 3, // Sentinels (SJ)
  ISTP: 4, ISFP: 4, ESTP: 4, ESFP: 4, // Explorers (SP)
}

/** เลข shape (ผูก MBTI ไว้แล้วด้านบน) → ตัวอักษรไฟล์จริงบนดิสก์ (ดูหลักฐานยืนยันที่หัวไฟล์) */
const SHAPE_TO_RAW_LETTER: Record<TreeShape, RawShapeLetter> = {
  1: 'C', // Analysts (NT)
  2: 'D', // Diplomats (NF)
  3: 'A', // Sentinels (SJ)
  4: 'B', // Explorers (SP)
}

const DEFAULT_SHAPE: TreeShape = 1

function resolveShape(mbtiType: MbtiType | null | undefined): TreeShape {
  return (mbtiType && MBTI_SHAPE_MAP[mbtiType]) ?? DEFAULT_SHAPE
}

/** [ใหม่ — ตามที่ระบุรอบนี้] เปิดเผยตัวอักษรไฟล์จริง (A/B/C/D) ให้ TreeOfLife.tsx ใช้ค้นหา
 *  ใน CANOPY_TIP_POINTS (canopyTipPoints.ts) ได้ตรงๆ — เดิมมีแค่ SHAPE_TO_RAW_LETTER ส่วนตัว
 *  ในไฟล์นี้ ไม่เคย export ออกไปให้ที่อื่นใช้ */
export function getShapeLetter(mbtiType: MbtiType | null | undefined): RawShapeLetter {
  return SHAPE_TO_RAW_LETTER[resolveShape(mbtiType)]
}

function clampVisualLevel(visualLevel: number): number {
  return Math.max(1, Math.min(8, Math.round(visualLevel)))
}

/** โฟลเดอร์ต้นทางจริงตามที่ทีมงานส่งมอบมา (ชื่อภาษาไทย/มีช่องว่าง/วงเล็บ/em dash/เท่ากับ
 *  ปนกัน — ยังไม่ใช่ชื่อสุดท้าย) ใช้ encodeURI() ตอนประกอบ URL เสมอ (เข้ารหัสเฉพาะช่องว่าง/
 *  อักขระนอก ASCII เท่านั้น ไม่แตะ '/','=','(',')' ที่ต้องคงไว้ตรงๆ ในโครงสร้าง path) */
const TRUNK_ROOT_FOLDER = 'ส่วนที่ 1 Trunk Layer (8 Level) — Shape A'
const LEAF_ROOT_FOLDER = 'ส่วนที่ 2 LeafCanopy Layer (8 Level) — Shape A'
const GROUND_ROOT_FOLDER = 'ส่วนที่ 3 Ground Layer (3 แบบ)'

/** เลขรหัสต่อท้ายชื่อโฟลเดอร์ย่อยแต่ละตัวอักษร (ของจริงบนดิสก์ — ดู `ls` ที่ทำไว้ก่อนแก้ไฟล์
 *  นี้) เลขชุด Trunk (1000x) กับ Leaf (2000x) ไม่ใช่เลขเดียวกัน ต้องแยกตาราง */
const TRUNK_SUFFIX: Record<RawShapeLetter, string> = { A: '10001', B: '10002', C: '10003', D: '10004' }
const LEAF_SUFFIX: Record<RawShapeLetter, string> = { A: '20001', B: '20002', C: '20003', D: '20004' }

/** ลำต้น — มีไฟล์จริงครบทั้ง 4 shape × 8 level แล้ว (432×432/435×435, RGBA มี alpha จริง) */
export function getTrunkImagePath(mbtiType: MbtiType | null | undefined, visualLevel: number): string {
  const letter = SHAPE_TO_RAW_LETTER[resolveShape(mbtiType)]
  const clamped = clampVisualLevel(visualLevel)
  return encodeURI(`/assets/images/tree/${TRUNK_ROOT_FOLDER}/shape ${letter}=${TRUNK_SUFFIX[letter]}/tree_${letter}_trunk_lv${clamped}.png`)
}

/** ใบไม้ — ชุดฐาน (ไม่ทาสีเฉพาะ MBTI) มีไฟล์จริงครบทั้ง 4 shape × 8 level แล้ว [ต้องแจ้ง]
 *  ตอนนี้ยังไม่มี alpha channel เลยสักไฟล์ (เจ้าของโปรเจกต์แจ้งว่าจะตัดเองภายหลัง) — จะเห็น
 *  เป็นกล่องทึบบังลำต้นชั่วคราวจนกว่าจะตัด alpha เสร็จ ไม่ใช่บั๊กโค้ด */
export function getLeafImagePath(mbtiType: MbtiType | null | undefined, visualLevel: number): string {
  const letter = SHAPE_TO_RAW_LETTER[resolveShape(mbtiType)]
  const clamped = clampVisualLevel(visualLevel)
  return encodeURI(`/assets/images/tree/${LEAF_ROOT_FOLDER}/shape ${letter}=${LEAF_SUFFIX[letter]}/tree_${letter}_leaf_lv${clamped}.png`)
}

/** [ใหม่ — ตามที่ระบุรอบนี้] พิกัด "ปลายกิ่งจริง" ที่ตรวจจับมาจากภาพลำต้นแต่ละ shape/level
 *  (ดู scripts/extract-branch-tips.mjs — รันครั้งเดียว offline ไม่ผูกกับ runtime) ไฟล์ JSON
 *  1 ไฟล์ต่อ 1 shape letter × 1 visual level (32 ไฟล์รวม) รูปแบบ [{x,y}, ...] เป็น % ของ
 *  ขนาดภาพต้นฉบับไฟล์นั้น (ไม่ใช่ % ของกล่อง .tree-of-life — ผู้เรียกต้องแปลงพิกัดเองตาม
 *  object-fit:contain จริงที่ TrunkLayer ใช้ ดู mapImagePointToContainerPct ใน TreeOfLife.tsx) */
export function getBranchTipsPath(mbtiType: MbtiType | null | undefined, visualLevel: number): string {
  const letter = SHAPE_TO_RAW_LETTER[resolveShape(mbtiType)]
  const clamped = clampVisualLevel(visualLevel)
  return encodeURI(`/assets/images/tree/branch-tips/shape-${letter}-trunk-lv${clamped}.json`)
}

/** พื้นดิน — ไม่ผูกกับ MBTI/shape มีแค่ 3 variant ใช้ร่วมกันทุกต้น
 *  [แก้ตามที่ระบุรอบนี้] เจ้าของโปรเจกต์แก้ไฟล์จริงบนดิสก์แล้ว (ตรวจซ้ำจริงด้วย `ls`:
 *  ground_variant_1/2/3.png นามสกุลเดียวเรียบร้อย ไม่มี .png.png ซ้อนแล้ว) โค้ดเดิมยังต่อ
 *  .png.png ตามชื่อไฟล์เก่า ทำให้ 404 ไปหมด — ตัดนามสกุลซ้ำออกให้ตรงกับไฟล์จริง */
export function getGroundImagePath(variant: 1 | 2 | 3): string {
  return encodeURI(`/assets/images/tree/${GROUND_ROOT_FOLDER}/ground_variant_${variant}.png`)
}

/*============================================================================*\
  toTrunkVisualLevel — [เขียนใหม่ตามที่ระบุรอบนี้] แทนที่ toVisualLevel เดิมสำหรับ "ลำต้น
  โดยเฉพาะ" ด้วยตาราง fix ตามที่ระบุเป๊ะ (ไม่ใช่สูตร progressive แบบเดิมอีกต่อไป)

  [หมายเหตุ — ความต่างจากโค้ดตัวอย่างที่ระบุมา] สเปกที่ให้มารับ `knowledgeStack` ดิบแล้ว
  คำนวณ gameLevel เองข้างในฟังก์ชัน (`Math.max(1, Math.floor(knowledgeStack /
  STACK_PER_VISUAL_LEVEL) + 1)`) แต่สูตรนี้ "คำนวณอยู่แล้ว" ที่ UserContext.tsx (บรรทัด
  `trunkBranchLevel: Math.max(1, Math.floor(userData.knowledgeStack / STACK_PER_VISUAL_LEVEL)
  + 1)`) แล้วส่ง gameLevel ที่คำนวณเสร็จนี้ลงมาเป็น prop `trunkBranchLevel` ให้ TreeOfLife.tsx
  ตรงๆ อยู่แล้ว — ให้ฟังก์ชันนี้รับ "gameLevel ที่คำนวณเสร็จแล้ว" แทนที่จะรับ knowledgeStack
  ดิบมาคำนวณซ้ำอีกรอบ (กันมี 2 จุดคำนวณสูตรเดียวกันซ้ำซ้อนกันในระบบ) ผลลัพธ์ที่ได้ตรงกับ
  ตัวอย่างที่ระบุมาทุกกรณี เพราะ trunkBranchLevel ที่ TreeOfLife.tsx ได้รับมาคือ gameLevel
  ตัวเดียวกันเป๊ะอยู่แล้ว — ตารางเทียบเลเวลด้านล่างตรงตามที่ระบุ 100%:
    เกมเลเวล 1-10    → trunk lv1 (ไม่มีใบเลย)
    เกมเลเวล 11-20   → trunk lv2 (ไม่มีใบเลย)
    เกมเลเวล 21-40   → trunk lv3 (เริ่มมีใบ)
    เกมเลเวล 41-60   → trunk lv4
    เกมเลเวล 61-80   → trunk lv5
    เกมเลเวล 81-100  → trunk lv6
    เกมเลเวล 101-120 → trunk lv7
    เกมเลเวล 121+    → trunk lv8 (สูงสุด ไม่มีเพดานบนของเกมเลเวลอีกต่อไป ค้างที่ lv8)
\*============================================================================*/
export function toTrunkVisualLevel(gameLevel: number): number {
  if (gameLevel <= 10) return 1
  if (gameLevel <= 20) return 2
  if (gameLevel <= 40) return 3
  if (gameLevel <= 60) return 4
  if (gameLevel <= 80) return 5
  if (gameLevel <= 100) return 6
  if (gameLevel <= 120) return 7
  return 8
}

/*============================================================================*\
  getLeafPool / getLeafDensityRange — [ใหม่ตามที่ระบุรอบนี้] ยกเลิก toLeafVisualLevel/
  leafVisualLevel เดิมทั้งหมด (ที่เคยให้ใบขยับเร็วกว่า trunk ผ่าน emotionStack แยกต่างหาก)
  ใบไม่ผูกกับ emotionStack อีกต่อไป — ผูกกับ "เกมเลเวลเดียวกับที่ใช้คำนวณ trunk" (คือ
  knowledgeStack ตัวเดียวกัน ผ่าน gameLevel ตัวเดียวกับที่ป้อนเข้า toTrunkVisualLevel ด้านบน)
  (ดอกไม้/flower stamps ยังผูกกับ emotionStack เหมือนเดิมไม่เปลี่ยน — เปลี่ยนเฉพาะ "ใบ" สีเขียว
  ตามที่ระบุ)

  Generalize เป็นฟังก์ชันเดียว (ไม่ hardcode ทีละช่วง 8 ครั้ง): ตั้งแต่เกมเลเวล 21 ขึ้นไป แบ่ง
  เป็น cycle ยาว 20 เกมเลเวล/cycle (ตรงกับความกว้างของแต่ละ trunk-level bucket ตั้งแต่ lv3
  ขึ้นไปพอดี — lv3=21-40, lv4=41-60, ... ยาว 20 เท่ากันทุกช่วง) ครึ่งแรกของ cycle (10 เกมเลเวล
  แรก) = ชุดใบ lv1-4 + ใบ 2-4 ใบ/จุด, ครึ่งหลัง = ชุดใบเต็ม lv1-8 + ใบ 4-8 ใบ/จุด (เพิ่มความ
  หนาแน่น/หลากหลายโดยไม่ต้องมี tip point เพิ่ม)
\*============================================================================*/
type LeafBucketPhase = 'none' | 'first-half' | 'second-half'

function getLeafBucketPhase(gameLevel: number): LeafBucketPhase {
  if (gameLevel <= 20) return 'none'
  const posInBucket = (gameLevel - 21) % 20 // 0-19
  return posInBucket < 10 ? 'first-half' : 'second-half'
}

/** ชุด (pool) ไฟล์ใบ (เลข visual level 1-8 ของ getLeafImagePath) ที่อนุญาตให้สุ่มใช้ ณ
 *  เกมเลเวลนี้ — null = ยังไม่มีใบเลย (trunk lv1-2 โล่งๆ) */
export function getLeafPool(gameLevel: number): number[] | null {
  const phase = getLeafBucketPhase(gameLevel)
  if (phase === 'none') return null
  return phase === 'first-half' ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7, 8]
}

/** จำนวนใบต่อ "1 tip point" (กลุ่มใบที่เกาะปลายกิ่งจริง 1 จุด) — [min, max] ให้ผู้เรียกสุ่ม
 *  เลือกจำนวนจริงต่อจุดเอง (deterministic ตาม seed ของจุดนั้น) null = ไม่มีใบเลย */
export function getLeafDensityRange(gameLevel: number): [number, number] | null {
  const phase = getLeafBucketPhase(gameLevel)
  if (phase === 'none') return null
  return phase === 'first-half' ? [2, 4] : [4, 8]
}

/** [ใหม่] พื้นดินมีแค่ 3 variant ภาพจริง (ไม่ใช่ 8 เหมือน trunk/leaf) — bucket กว้างๆ 3 ช่วง
 *  จาก grassSoilLevel (เลเวลระบบจริงของ healthStack สูตรเดียวกับ trunkBranchLevel/
 *  leafFlowerLevel) ตัวเลขนี้เป็นจุดเริ่มต้นคร่าวๆ ที่สมเหตุสมผล ยังไม่ได้ทดสอบ pace จริง
 *  (นอกขอบเขตที่ขอในรอบนี้ — ปรับได้ทีหลังถ้ารู้สึกเร็ว/ช้าเกินไป) */
export function toGroundVariant(systemLevel: number): 1 | 2 | 3 {
  if (systemLevel <= 10) return 1
  if (systemLevel <= 25) return 2
  return 3
}
