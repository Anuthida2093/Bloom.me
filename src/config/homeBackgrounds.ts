/*============================================================================*\
  homeBackgrounds.ts — วิดีโออนิเมชันพื้นหลังหน้า Home ให้เลือกในการตั้งค่า (5 แบบ)
  ────────────────────────────────────────────────────────────────────────────
  ไฟล์: public/assets/videos/intro/hero-waterfall1.mp4 … hero-waterfall5.mp4 — ใส่ไฟล์ตามชื่อนี้ได้เลย
  ช่องที่ยังไม่มีไฟล์ หน้าเลือกจะขึ้น "ยังไม่มีไฟล์" และตั้งเป็นพื้นหลังไม่ได้
  ค่าที่เลือกเก็บใน settings.homeBackground (UIContext — จำในเครื่อง)
\*============================================================================*/

export interface HomeBackground { id: number; src: string; label: string }

export const HOME_BACKGROUNDS: HomeBackground[] = [1, 2, 3, 4, 5].map((n) => ({
  id: n,
  src: `/assets/videos/intro/hero-waterfall${n}.mp4`,
  label: `ฉากที่ ${n}`,
}))

export const DEFAULT_HOME_BACKGROUND = 1

export function homeBackgroundSrc(id: number | null | undefined): string {
  return (HOME_BACKGROUNDS.find((b) => b.id === id) ?? HOME_BACKGROUNDS[DEFAULT_HOME_BACKGROUND - 1]).src
}
