/*============================================================================*\
  wind — สนามลมกลางของฉากหน้า Home (แหล่งความจริงเดียว: หญ้า ดอกไม้ กลีบ หมอก เมฆ ใช้ร่วมกัน)
  ────────────────────────────────────────────────────────────────────────────
  wind(t, x) = คลื่นลมความถี่ต่ำที่ "เคลื่อนผ่าน" ทุ่ง (เห็นเป็นระลอก ไม่ใช่ใบหญ้าส่ายแยกกัน) + noise นุ่มๆ
  - ต่อเนื่องทั้งเวลาและตำแหน่ง · ค่าจำกัดใน [0, MAX_WIND] (เทสต์ตรวจ)
  - windStrength ปรับได้ (ภายหลังผูกกับข้อมูลอากาศจริง) · ต้นไม้ของผู้เล่นอ่านค่านี้ได้ภายหลัง (ยังไม่แก้ต้นไม้)
\*============================================================================*/

export interface WindParams {
  /** ความแรงพื้นฐาน 0-1+ (แดด ≈ 0.35 · ฝน ≈ 0.8 — WIND_PRESETS) */
  strength: number
  /** ความเร็วระลอกลม (ระลอก/วินาที) — ฝนถี่กว่า */
  gustSpeed: number
  /** ทิศลม +1 = ซ้าย→ขวา, -1 = ขวา→ซ้าย */
  direction: 1 | -1
}

export interface WindSample { strength: number; direction: 1 | -1 }

export const MAX_WIND = 1.6
const TAU = Math.PI * 2

/** ลม ณ เวลา t (วินาที) ตำแหน่ง x01 (0 = ซ้ายจอ, 1 = ขวาจอ) */
export function wind(t: number, x01: number, p: WindParams): WindSample {
  // ระลอกหลักเคลื่อนตามทิศลม (เฟสลดลงตามเวลา × ทิศ → ยอดคลื่นวิ่งไปทางที่ลมพัด)
  const travel = x01 * 1.6 - t * p.gustSpeed * p.direction
  const g = 0.5 + 0.5 * Math.sin(TAU * travel)
  const gust = g * g * (3 - 2 * g) // นุ่มที่ยอด/ท้องคลื่น
  // ระลอกรองยาวกว่า ทำให้แต่ละรอบไม่ซ้ำกัน
  const swell = 0.5 + 0.5 * Math.sin(TAU * (x01 * 0.45 - t * p.gustSpeed * 0.37 * p.direction) + 1.3)
  const noise = 0.1 * Math.sin(t * 1.7 + x01 * 9.1) * Math.sin(t * 0.63 + x01 * 3.7)
  const s = p.strength * (0.3 + 0.55 * gust + 0.25 * swell + noise)
  return { strength: Math.max(0, Math.min(MAX_WIND, s)), direction: p.direction }
}

/** การเอนของหญ้า (หน่วย = ระยะเลื่อนแนวนอนต่อความสูง 1 หน่วย) — ลมดัน + แกว่งกลับเล็กน้อย
 *  reducedMotion → เอนนิ่งๆ นิดเดียว ไม่แกว่ง */
export function grassLean(t: number, x01: number, p: WindParams, amp: number, reducedMotion = false): number {
  if (reducedMotion) return 0.04 * p.direction * amp
  const w = wind(t, x01, p)
  const flutter = 0.82 + 0.18 * Math.sin(t * 2.7 + x01 * 11)
  return w.strength * w.direction * flutter * amp
}
