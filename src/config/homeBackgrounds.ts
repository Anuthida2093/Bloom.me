/*============================================================================*\
  homeBackgrounds.ts — วิดีโออนิเมชันพื้นหลังหน้า Home ให้เลือกในการตั้งค่า (ฉาก 1-2)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ 2026-10-27] ลบวิดีโอฉาก 2, 4, 5 เดิม · วิดีโอฉาก 3 เดิมเปลี่ยนชื่อไฟล์เป็นฉาก 2
  ฉาก 3-5 = ฉากวาดด้วยโค้ด (config/homeScenes.ts) ปลดล็อกตามเลเวล
  ไฟล์: public/assets/videos/intro/hero-waterfall1.mp4, hero-waterfall2.mp4
  ช่องที่ยังไม่มีไฟล์ หน้าเลือกจะขึ้น "ยังไม่มีไฟล์" และตั้งเป็นพื้นหลังไม่ได้
  ค่าที่เลือกเก็บใน settings.homeBackground (UIContext — จำในเครื่อง)
\*============================================================================*/

export interface HomeBackground { id: number; src: string; label: string }

export const HOME_BACKGROUNDS: HomeBackground[] = [1, 2].map((n) => ({
  id: n,
  src: `/assets/videos/intro/hero-waterfall${n}.mp4`,
  label: `ฉากที่ ${n}`,
}))

export const DEFAULT_HOME_BACKGROUND = 1

/** เลขฉากแบบเดิม (วิดีโอ 1-5 + โค้ด 6-8) → เลขใหม่ · ฉากที่ถูกลบ (2, 4, 5 เดิม) → ฉาก 1 */
export const LEGACY_BACKGROUND_IDS: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 1, 5: 1, 6: 3, 7: 4, 8: 5 }

export function homeBackgroundSrc(id: number | null | undefined): string {
  return (HOME_BACKGROUNDS.find((b) => b.id === id) ?? HOME_BACKGROUNDS[DEFAULT_HOME_BACKGROUND - 1]).src
}
