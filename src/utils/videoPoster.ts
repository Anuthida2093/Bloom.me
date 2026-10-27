/** [1.5 โหลดเร็วขึ้น] ภาพโปสเตอร์ (เฟรมแรก) ของวิดีโอ — สร้างโดย scripts/optimize-videos.mjs เป็น
 *  <ชื่อวิดีโอ>.poster.webp ข้างไฟล์วิดีโอ ใช้เป็น poster="" หรือพื้นหลังระหว่างรอวิดีโอโหลด
 *  (ตัด #t=... ท้าย URL ออกก่อน) */
export function posterOf(videoSrc: string): string {
  return videoSrc.replace(/#.*$/, '').replace(/\.mp4$/i, '.poster.webp')
}
