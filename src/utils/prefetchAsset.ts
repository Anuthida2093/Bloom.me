/*============================================================================*\
  prefetchAsset.ts — [แก้ตามที่ระบุ — 1.5 โหลดเร็วขึ้น] ดึงไฟล์ที่ผู้ใช้ "น่าจะเปิดถัดไป" มาเก็บในแคช
  ของเบราว์เซอร์ล่วงหน้าแบบความสำคัญต่ำ (<link rel="prefetch">) — เช่นวิดีโอแผนที่เควสการเรียนรู้ 4.9MB
  ที่เดิมเริ่มโหลดตอนกดเข้าเควสแล้วเท่านั้น จอจึงเป็นพื้นเขียวเปล่าอยู่พักหนึ่ง
  เรียกเมื่อมีสัญญาณว่าผู้ใช้กำลังจะเข้าไปจริง (เปิดเมนูเควส) ไม่ใช่ทุกครั้งที่เปิดแอป — ประหยัดเน็ตมือถือ
  ข้ามเองเมื่อผู้ใช้เปิดโหมดประหยัดดาต้า (Save-Data) และดึงแต่ละไฟล์แค่ครั้งเดียวต่อการเปิดแอป
\*============================================================================*/
const requested = new Set<string>()

export function prefetchAsset(url: string): void {
  if (typeof document === 'undefined' || requested.has(url)) return
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return
  requested.add(url)
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  document.head.appendChild(link)
}

/** วิดีโอพื้นหลังแผนที่เควสการเรียนรู้ (LearningQuestMap.tsx) */
export const LEARNING_MAP_VIDEO = '/assets/videos/quest-learning/QuestPathMap.mp4'
