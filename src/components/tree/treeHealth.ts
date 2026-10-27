/* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3+4] "state overlay" (healthy/wilting/dying) ผูกกับ "จำนวนวันที่ไม่ได้ทำ
 * เควสสำเร็จในหมวดนั้นๆ ล่าสุด" (คำนวณจาก questLogs ใน Dashboard.tsx) N=5 เริ่ม wilting,
 * N=10 เริ่ม dying — ใบไม้ผูกกับหมวดจิตใจ (EMOTION), พื้นดิน/หญ้าผูกกับหมวดสุขภาพกาย (HEALTH)
 * ใช้ร่วมกันระหว่างตัวต้นไม้ (TreeOfLife.tsx) กับแผงข้อมูลต้นไม้ (TreeInfoPanel.tsx) */
export type HealthPhase = 'healthy' | 'wilting' | 'dying'

export function toHealthPhase(daysSinceLastQuest: number | null): HealthPhase {
  if (daysSinceLastQuest === null) return 'healthy'
  if (daysSinceLastQuest >= 10) return 'dying'
  if (daysSinceLastQuest >= 5) return 'wilting'
  return 'healthy'
}
