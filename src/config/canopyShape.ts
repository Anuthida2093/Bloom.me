import type { MbtiType } from '../types'

/**
 * CanopyShape — กรอบพื้นที่ทรงพุ่มโดยประมาณ (เป็น % ของ container) ที่ใช้สุ่มตำแหน่ง
 * "ปั๊ม" ใบไม้/ดอกไม้ลงไป โมเดลเป็นทรงกรวย/พีระมิดง่ายๆ (แคบด้านบน กว้างด้านล่าง)
 * ซึ่งเหมาะกับต้นสนซีดาร์อ่อนตามที่ต้องการ — ถ้าอยากได้ทรงพุ่มกลม/รี ให้ปรับ topWidthPct
 * ให้ใกล้เคียง baseWidthPct มากขึ้น
 *
 * ตัวเลขทั้งหมดเป็นค่าประมาณ ปรับเองได้อิสระ ไม่ผูกกับ asset จริงใดๆ — ถ้าอนาคตทีมอาร์ต
 * ให้พิกัดกิ่งจริงมา (เช่นไฟล์ JSON ต่อ mbtiType) ค่อยเปลี่ยนมาใช้พิกัดจริงแทนฟังก์ชัน
 * sampleCanopyPoint() แทนที่จะสุ่มในกรอบนี้
 */
export interface CanopyShape {
  /** ขอบบนสุดของทรงพุ่ม (% จากขอบบนของ container) */
  topPct: number
  /** ขอบล่างสุดของทรงพุ่ม (% จากขอบบนของ container) — ปกติคือจุดที่ลำต้นเริ่มแตกกิ่ง */
  bottomPct: number
  /** ความกว้างพุ่มที่ขอบบนสุด (% ของความกว้าง container) */
  topWidthPct: number
  /** ความกว้างพุ่มที่ฐาน (% ของความกว้าง container) */
  baseWidthPct: number
  /** จุดกึ่งกลางแนวนอนของทรงพุ่ม (% ของความกว้าง container) ปกติ 50 = กึ่งกลางพอดี */
  centerXPct: number
}

type MbtiGroup = 'NT' | 'NF' | 'SJ' | 'SP'

const MBTI_GROUP: Record<MbtiType, MbtiGroup> = {
  INTJ: 'NT', INTP: 'NT', ENTJ: 'NT', ENTP: 'NT',
  INFJ: 'NF', INFP: 'NF', ENFJ: 'NF', ENFP: 'NF',
  ISTJ: 'SJ', ISFJ: 'SJ', ESTJ: 'SJ', ESFJ: 'SJ',
  ISTP: 'SP', ISFP: 'SP', ESTP: 'SP', ESFP: 'SP',
}

/** ทรงพุ่มต่อกลุ่ม MBTI — NT/SJ (นักคิด/ผู้พิทักษ์) ทรงแคบเป็นระเบียบ, NF/SP (นักการทูต/นักสำรวจ) ทรงกว้างเป็นธรรมชาติกว่า */
const GROUP_CANOPY_SHAPE: Record<MbtiGroup, CanopyShape> = {
  NT: { topPct: 8, bottomPct: 58, topWidthPct: 14, baseWidthPct: 46, centerXPct: 50 },
  NF: { topPct: 10, bottomPct: 60, topWidthPct: 20, baseWidthPct: 60, centerXPct: 50 },
  SJ: { topPct: 6, bottomPct: 56, topWidthPct: 12, baseWidthPct: 42, centerXPct: 50 },
  SP: { topPct: 12, bottomPct: 62, topWidthPct: 24, baseWidthPct: 64, centerXPct: 50 },
}

const DEFAULT_CANOPY_SHAPE: CanopyShape = GROUP_CANOPY_SHAPE.NF

export function getCanopyShape(mbtiType: MbtiType | null | undefined): CanopyShape {
  if (!mbtiType) return DEFAULT_CANOPY_SHAPE
  const group = MBTI_GROUP[mbtiType]
  return group ? GROUP_CANOPY_SHAPE[group] : DEFAULT_CANOPY_SHAPE
}

export interface CanopyPoint {
  /** % จากซ้ายของ container (0-100) */
  xPct: number
  /** % จากบนของ container (0-100) */
  yPct: number
  /** 0 = ขอบบนสุด(ปลายกิ่ง) → 1 = ขอบล่างสุด(โคนพุ่ม) ใช้ตัดสินขนาด stamp (ปลายกิ่งเล็ก, โคนพุ่มใหญ่) */
  depthT: number
}

/**
 * sampleCanopyPoint — สุ่ม 1 จุดภายในทรงกรวย/พีระมิดของ CanopyShape
 * ใช้แจกจุดแบบเบ้เข้าใกล้ขอบเส้นรอบรูปทรงเล็กน้อย (แทนที่จะกระจุกอยู่กลางๆ ล้วน)
 * เพื่อให้ silhouette ของพุ่มดูเต็ม ไม่ใช่ตันตรงกลางแล้วขอบโหว่
 */
export function sampleCanopyPoint(shape: CanopyShape, rng: () => number): CanopyPoint {
  const depthT = rng() // 0 = ปลายกิ่ง(บนสุด), 1 = โคนพุ่ม(ล่างสุด)
  const yPct = shape.topPct + (shape.bottomPct - shape.topPct) * depthT
  const widthAtDepth = shape.topWidthPct + (shape.baseWidthPct - shape.topWidthPct) * depthT

  // แจกตำแหน่งแนวนอนแบบเบ้เข้าใกล้ขอบ (ใช้ sqrt ของค่าสุ่ม -0.5..0.5 ถ่วงน้ำหนักเข้าขอบ)
  const edgeBias = (rng() - 0.5)
  const signedT = Math.sign(edgeBias) * Math.sqrt(Math.abs(edgeBias) * 2)
  const xPct = shape.centerXPct + signedT * (widthAtDepth / 2)

  return { xPct, yPct, depthT }
}