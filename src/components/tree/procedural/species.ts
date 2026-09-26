import type { MbtiType } from '../../../types'
import type { TreeParams } from './generateTree'

/*============================================================================*\
  species — ต้นไม้ประจำตัวของ MBTI ทั้ง 16 แบบ (สายพันธุ์ + ลักษณะเด่นที่สื่อถึงตัวตน)
  ────────────────────────────────────────────────────────────────────────────
  นักการทูต (NF) พริ้วไหว อ่อนโยน : INFP หลิว · INFJ ซากุระ · ENFJ เมเปิล · ENFP จาคารันดา
  นักวิเคราะห์ (NT) โครงสร้างมั่นคง : INTJ สนไซเปรส · INTP แปะก๊วย · ENTJ โอ๊ก · ENTP ไทร
  ผู้ดูแล (SJ) สมมาตร ให้ผลผลิต   : ISTJ สนสปรูซ · ISFJ แอปเปิล · ESTJ มะฮอกกานี · ESFJ แมกโนเลีย
  นักสำรวจ (SP) ยืดหยุ่น สีจัดจ้าน  : ISTP ไผ่ · ISFP เบิร์ช · ESTP ปาล์ม · ESFP ส้ม

  form = โครงสร้างต้น: broadleaf (แตกกิ่งปกติ generateTree) / weeping (หลิว: เส้นใบห้อยจากปลายกิ่ง)
         column (ไซเปรส: ทรงเสาเรียว) / cone (สปรูซ: กรวยเป็นชั้น) / palm (ลำต้นเดี่ยว+ทางใบ) / bamboo (หลายลำ มีข้อ)
  ทุกสายพันธุ์โตตามขั้นภาพ 1-8 เหมือนกัน (buildTreeModel.ts / speciesForms.ts)
\*============================================================================*/

export type TreeForm = 'broadleaf' | 'weeping' | 'column' | 'cone' | 'palm' | 'bamboo'
export type BarkStyle = 'plain' | 'birch' | 'palm' | 'bamboo'
/** รูปทรงใบ — ผู้วาด (drawTree2D getLeafPath) มีเส้นรูปใบของแต่ละแบบ */
export type LeafShape = 'lance' | 'petal' | 'oval' | 'broad' | 'maple' | 'needle' | 'fan' | 'oak' | 'blade'

export interface Species {
  /** ชื่อไทยที่แสดงใน tooltip */
  name: string
  /** ชื่ออังกฤษ */
  nameEn: string
  /** ต้นไม้นี้สื่อถึงตัวตนแบบไหน (แสดงในแผง MBTI / แผงข้อมูลต้นไม้) */
  meaning: string
  form: TreeForm
  /** ปรับการแตกกิ่ง (broadleaf/weeping) — ทับค่าที่ได้จากกลุ่ม+ตัวอักษร MBTI */
  params?: Partial<TreeParams>
  leafShape: LeafShape
  /** ตัวคูณขนาดใบ */
  leafSize?: number
  leafColors: string[]
  trunkColor: string
  bark?: BarkStyle
  /** ดอก: amount คูณจำนวนดอกปกติ, size คูณขนาด, kind = รูปดอก */
  flowers?: { colors: string[]; amount: number; size?: number; kind?: 'blossom' | 'magnolia'; center?: string }
  /** พุ่มเป็นกลุ่มฟูๆ ที่ปลายกิ่ง (ซากุระ) แทนพุ่มโดมทึบ — size คูณขนาดกลุ่ม */
  puffs?: { size: number }
  /** ผล (ขั้นภาพ 4+): amount คูณจำนวนผลปกติ */
  fruit?: { color: string; amount: number; size?: number }
  /** ไทร: รากอากาศห้อยจากกิ่งลงดิน */
  aerialRoots?: boolean
}

const TRUNK_SOFT = '#a8835f'

export const SPECIES: Record<MbtiType, Species> = {
  // ── นักการทูต (NF) ──
  INFP: {
    name: 'ต้นหลิว', nameEn: 'Weeping Willow',
    meaning: 'กิ่งก้านพริ้วไหวลู่ไปตามลม สื่อถึงความเข้าอกเข้าใจและอารมณ์ที่อ่อนไหว',
    form: 'weeping', leafShape: 'lance', leafSize: 0.85,
    params: { branchAngle: 50, upwardBias: 0.1, gnarl: 0.22 },
    leafColors: ['#8dbf6a', '#a6d17f', '#76ad5a'], trunkColor: '#9c7b5b',
  },
  INFJ: {
    // ซากุระบาน: พุ่มเป็นกลุ่มดอกสีชมพูฟูๆ ที่ปลายกิ่ง เห็นกิ่งสีเข้มลอดระหว่างกลุ่ม ดอกห้ากลีบใจกลางชมพูเข้ม
    name: 'ต้นซากุระ', nameEn: 'Cherry Blossom',
    meaning: 'สวยงาม ลึกซึ้ง และผลิบานเพื่อสร้างแรงบันดาลใจให้ผู้คนรอบข้าง',
    form: 'broadleaf', leafShape: 'petal', leafSize: 0.9,
    params: { branchAngle: 60, upwardBias: 0.08, gnarl: 0.24 },
    leafColors: ['#fbd3df', '#f7b3c7', '#f39ab4', '#fde6ee'], trunkColor: '#5f4a44',
    flowers: { colors: ['#fff0f5', '#ffd6e4', '#ffffff'], amount: 3, center: '#e0679a' },
    puffs: { size: 1 },
  },
  ENFJ: {
    name: 'ต้นเมเปิล', nameEn: 'Maple',
    meaning: 'ใบเปลี่ยนสีโดดเด่น ให้ร่มเงาที่อบอุ่น สื่อถึงผู้นำที่คอยดูแลและโอบอุ้มผู้อื่น',
    form: 'broadleaf', leafShape: 'maple',
    params: { branchAngle: 54, upwardBias: 0.08 },
    leafColors: ['#d9482b', '#f08a24', '#f4b73f', '#c0392b'], trunkColor: TRUNK_SOFT,
  },
  ENFP: {
    // ยามบานสะพรั่ง พุ่มเป็นสีม่วงเกือบทั้งต้น (ใบเขียวแซมบ้าง) ทรงร่มกางกว้าง
    name: 'ต้นจาคารันดา', nameEn: 'Jacaranda',
    meaning: 'ดอกสีม่วงบานสะพรั่งเต็มต้น สดใส ร่าเริง และเต็มไปด้วยจินตนาการที่ไร้กรอบ',
    form: 'broadleaf', leafShape: 'petal', leafSize: 0.85,
    params: { branchAngle: 50, upwardBias: 0.28, lengthDecay: 0.8, gnarl: 0.12 },
    leafColors: ['#9b7ad8', '#b394e6', '#8566c4', '#a88ae0', '#7cb46b'], trunkColor: TRUNK_SOFT,
    flowers: { colors: ['#9b6fd6', '#b48be8', '#8a5cc7', '#c9a6f2'], amount: 4, center: '#5e3d99' },
    puffs: { size: 1.15 },
  },
  // ── นักวิเคราะห์ (NT) ──
  INTJ: {
    name: 'ต้นสนไซเปรส', nameEn: 'Cypress',
    meaning: 'เติบโตอย่างมีระเบียบ แข็งแกร่ง มีโครงสร้างชัดเจนและมุ่งตรงสู่เป้าหมาย',
    form: 'column', leafShape: 'needle',
    leafColors: ['#1f4d3a', '#2d6a4f', '#3f7f5c'], trunkColor: '#8a6a4a',
  },
  INTP: {
    name: 'ต้นแปะก๊วย', nameEn: 'Ginkgo',
    meaning: 'รูปทรงใบแปลกตา สายพันธุ์เก่าแก่และซับซ้อน สื่อถึงความคิดวิเคราะห์ที่ลึกซึ้งและไม่เหมือนใคร',
    form: 'broadleaf', leafShape: 'fan',
    params: { branchAngle: 36, upwardBias: 0.22 },
    leafColors: ['#9cc53b', '#b8d65a', '#e3c542', '#d4b62e'], trunkColor: '#9a8067',
  },
  ENTJ: {
    name: 'ต้นโอ๊ก', nameEn: 'Oak',
    meaning: 'ลำต้นใหญ่ แผ่กิ่งก้านอย่างทรงพลัง รากหยั่งลึก สื่อถึงความเป็นผู้นำและความมั่นคงเด็ดขาด',
    form: 'broadleaf', leafShape: 'oak',
    params: { trunkRadius: 0.58, trunkHeight: 3.4, branchAngle: 56, upwardBias: 0.1, lengthDecay: 0.83, lateralBranches: [2, 3] },
    leafColors: ['#3d6b35', '#4f7f3f', '#5f9148'], trunkColor: '#8d6b4c',
  },
  ENTP: {
    name: 'ต้นไทร', nameEn: 'Banyan',
    meaning: 'รากอากาศแตกแขนงเชื่อมโยงกันอย่างซับซ้อน พลิกแพลงได้ตลอด เหมือนไอเดียที่ไม่มีวันตัน',
    form: 'broadleaf', leafShape: 'oval', leafSize: 0.9,
    params: { trunkRadius: 0.5, trunkHeight: 3.8, branchAngle: 60, upwardBias: 0.1, lengthDecay: 0.83, lateralBranches: [2, 3] },
    leafColors: ['#2f6b3c', '#3f8a4b', '#58a25e'], trunkColor: '#9a8570', aerialRoots: true,
  },
  // ── ผู้ดูแล (SJ) ──
  ISTJ: {
    name: 'ต้นสนสปรูซ', nameEn: 'Spruce',
    meaning: 'รูปทรงกรวยเป๊ะ สมมาตร สื่อถึงความมีระเบียบวินัย ตรงไปตรงมา และเคารพกฎเกณฑ์',
    form: 'cone', leafShape: 'needle',
    leafColors: ['#1e4a3c', '#2a5e4a', '#37715a'], trunkColor: '#7d5a3e',
  },
  ISFJ: {
    name: 'ต้นแอปเปิล', nameEn: 'Apple Tree',
    meaning: 'ออกผลหอมหวาน คอยหล่อเลี้ยงและดูแลสิ่งมีชีวิตรอบตัว สื่อถึงความใจดีและปกป้อง',
    form: 'broadleaf', leafShape: 'oval',
    leafColors: ['#4f9a4a', '#6cb35a', '#86c46a'], trunkColor: TRUNK_SOFT,
    flowers: { colors: ['#ffffff', '#fde2e8'], amount: 0.5 },
    fruit: { color: '#d6333a', amount: 1 },
  },
  ESTJ: {
    name: 'ต้นมะฮอกกานี', nameEn: 'Mahogany',
    meaning: 'เนื้อไม้แข็งแรง ทรงคุณค่า สื่อถึงการเป็นเสาหลักที่ไว้ใจได้และการวางรากฐานที่มั่นคง',
    form: 'broadleaf', leafShape: 'oval', leafSize: 1.1,
    // เน้นความสูง: ลำต้นยาวตรง กิ่งชี้ขึ้น พุ่มเป็นกลุ่มหนาอยู่ช่วงบน
    params: { trunkHeight: 4.8, trunkRadius: 0.5, upwardBias: 0.26, branchAngle: 44, lengthDecay: 0.8 },
    leafColors: ['#2f5d34', '#3e7442', '#4f8a50'], trunkColor: '#8a4b2e',
  },
  ESFJ: {
    name: 'ต้นแมกโนเลีย', nameEn: 'Magnolia',
    meaning: 'ดอกใหญ่สวยงามบานต้อนรับผู้คน สื่อถึงความใส่ใจสังคมและชอบดูแลความรู้สึกคนอื่น',
    form: 'broadleaf', leafShape: 'oval', leafSize: 1.15,
    leafColors: ['#3f7d4a', '#579a5a', '#6aa866'], trunkColor: '#8f7a68',
    flowers: { colors: ['#fdf1f5', '#f3b6c9', '#e892b0'], amount: 0.8, size: 2.3, kind: 'magnolia' },
  },
  // ── นักสำรวจ (SP) ──
  ISTP: {
    name: 'ต้นไผ่', nameEn: 'Bamboo',
    meaning: 'เติบโตเร็ว ยืดหยุ่นลู่ลมได้ดีแต่ไม่หักง่าย สื่อถึงการแก้ปัญหาเฉพาะหน้าและดัดแปลงได้หลากหลาย',
    form: 'bamboo', leafShape: 'blade',
    leafColors: ['#7fb04a', '#9cc85e', '#6a9a3d'], trunkColor: '#8fb85a', bark: 'bamboo',
  },
  ISFP: {
    name: 'ต้นเบิร์ช', nameEn: 'Birch',
    meaning: 'เปลือกไม้สีขาวลอกเป็นแผ่น มีเอกลักษณ์ทางศิลปะ สื่อถึงความรักอิสระและสุนทรียภาพ',
    form: 'broadleaf', leafShape: 'oval', leafSize: 0.8,
    params: { trunkRadius: 0.3, upwardBias: 0.22, branchAngle: 40 },
    leafColors: ['#9cc95a', '#b6d86e', '#e6c74a'], trunkColor: '#efebe2', bark: 'birch',
  },
  ESTP: {
    name: 'ต้นปาล์ม', nameEn: 'Palm Tree',
    meaning: 'ท้าทายแสงแดดและพายุ โดดเด่นและปรับตัวเข้ากับสภาพสุดขั้วได้ดี สื่อถึงความกล้าเสี่ยง',
    form: 'palm', leafShape: 'blade',
    leafColors: ['#3e8e41', '#5aa845', '#2f7a37'], trunkColor: '#b08a5e', bark: 'palm',
    fruit: { color: '#7a5230', amount: 0.4, size: 1.3 },
  },
  ESFP: {
    name: 'ต้นส้ม', nameEn: 'Orange Tree',
    meaning: 'ผลสีสดใส เปรี้ยวอมหวาน สื่อถึงความร่าเริง มีชีวิตชีวา และเป็นศูนย์กลางของความสนุก',
    form: 'broadleaf', leafShape: 'oval',
    leafColors: ['#2f7a3a', '#3f9148', '#58a655'], trunkColor: TRUNK_SOFT,
    flowers: { colors: ['#ffffff'], amount: 0.3 },
    fruit: { color: '#f28c1b', amount: 1.3 },
  },
}

/** ผู้เล่นที่ยังไม่มีผล MBTI — ต้นไม้ใบรูปไข่ทั่วไป */
export function speciesOf(mbti: MbtiType | null | undefined): Species {
  return (mbti && SPECIES[mbti]) || DEFAULT_SPECIES
}

export const DEFAULT_SPECIES: Species = {
  name: 'ต้นไม้แห่งชีวิต', nameEn: 'Tree of Life', meaning: 'ต้นไม้ที่เติบโตไปพร้อมกับตัวคุณ',
  form: 'broadleaf', leafShape: 'oval',
  leafColors: ['#52b788', '#74c69d', '#40916c'], trunkColor: TRUNK_SOFT,
}
