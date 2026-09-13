/**
 * zIndex.ts — z-index มาตรฐานกลางของทั้งแอป
 * ────────────────────────────────────────
 * เดิมแต่ละ modal/panel เขียน `zIndex: 200 / 300 / 500 / 600 / 700` กระจายกันไปทีละไฟล์
 * ทำให้พอเพิ่ม modal ใหม่ต้องมานั่งไล่ดูว่าเลขไหนว่าง เสี่ยงชนกันเวลาเปิดหลาย modal ซ้อนกัน
 * รวมไว้ที่เดียวตรงนี้ ให้ทุก modal import ค่าคงที่ชุดนี้แทนการเขียนเลขตรงๆ
 *
 * ลำดับชั้น (ต่ำ→สูง) สะท้อนว่าอะไรควรอยู่ "บนสุด" เมื่อเปิดพร้อมกันจริง:
 *   floating (NavBar/panel ข้างจอ) < full-screen section (เควส/ร้านค้า/คลัง)
 *   < confirm/detail modal ที่ซ้อนทับ section < gameplay modal < reward/celebration
 */
export const Z_INDEX = {
  /** NavBar, floating panel ข้างจอ (leaderboard/tree stats) */
  floatingChrome: 100,
  /** Leaderboard modal เต็มจอ */
  leaderboardModal: 200,
  /** PlayerDetailModal ที่ซ้อนทับ Leaderboard */
  playerDetailModal: 300,
  /** เช็คอินอารมณ์ (เต็มจอ) */
  moodCheckin: 400,
  /** ระบบเควส/ร้านค้า/คลังไอเทม (full-screen section) */
  fullScreenSection: 500,
  /** ยืนยันก่อนเริ่มเควส (ซ้อนทับ full-screen section) */
  confirmModal: 650,
  /** หน้าจอเล่นเควสจริง (ซ้อนทับทุกอย่างของระบบเควส) */
  gameplayModal: 700,
  /** [ใหม่ — ข้อ D7/D8] หน้าถ่ายรูปยืนยันเควส (CameraCapture.tsx) — ต้องเต็มจอจริงๆ ซ้อนทับ
   *  แม้กระทั่งหัวเรื่อง/คำแนะนำของ GameShell เอง (ดู .game-shell__header) */
  cameraFullscreen: 800,
  /** ฉลองครบ streak (สูงสุด ต้องเห็นชัดกว่าทุกอย่าง) */
  celebration: 900,
} as const