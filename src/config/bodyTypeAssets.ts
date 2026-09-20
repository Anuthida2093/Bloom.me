import type { Gender } from '../types'

/*============================================================================*\
  bodyTypeAssets.ts — mapping เพศ + BMI → รูปจริงในการ์ด "รูปร่างของคุณ"
  ────────────────────────────────────────────────────────────────────────────
  [ตรวจไฟล์จริงแล้วอีกรอบ] ls public/assets/images/Bodytype/ เจอ 6 ไฟล์ตรงตามที่ระบุเป๊ะ
  ทั้งชื่อและตัวพิมพ์ใหญ่-เล็ก (Fat-man.png / Fat-woman.png ขึ้นต้นตัวใหญ่,
  well-proportioned-man.png / well-proportioned-woman.png ตัวเล็กทั้งหมด,
  Thin-man.png / Thin-woman.png ขึ้นต้นตัวใหญ่) — template string ด้านล่างตรงกับที่เจอจริง
  ไม่ต้องแก้ตรงไหน

  [แก้ — เกณฑ์ BMI ใหม่ตามที่ระบุ] แทนที่เกณฑ์เดิม (คนละช่วงตัวเลขระหว่างชาย-หญิง) ด้วย
  เกณฑ์มาตรฐานเดียวกันทั้ง 2 เพศ (WHO cutoff ทั่วไป: <18.5 ผอม / 18.5-22.9 สมส่วน / >=23.0
  อ้วน) ต่างกันแค่ "ชุดภาพ" (ต่อท้ายด้วย -woman/-man) ไม่ใช่ตัวเลขเกณฑ์ — ไม่มีรอยต่อ/ช่องโหว่
  เหมือนเกณฑ์เดิมแล้ว เพราะช่วงต่อกันสนิท (18.5 และ 22.9/23.0 เป็นขอบเขตเดียวกัน)
\*============================================================================*/

export function getBodyTypeImagePath(gender: Gender, bmi: number): string {
  const base = '/assets/images/Bodytype'
  const sex = gender === 'FEMALE' ? 'woman' : 'man'

  if (bmi < 18.5) {
    return `${base}/Thin-${sex}.png`
  }
  if (bmi <= 22.9) {
    return `${base}/well-proportioned-${sex}.png`
  }
  return `${base}/Fat-${sex}.png` // bmi >= 23.0
}
