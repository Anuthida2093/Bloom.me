/**
 * sfxGate.ts — [แก้ตามที่ระบุ] ปิดเสียงเอฟเฟกต์ทั้งระบบชั่วคราว
 * ใช้ตอนเควสฟื้นฟูหน้าดินเริ่ม "กล่อมนอน" — ได้ยินแค่เสียงกล่อมนอนของเควสนั้นอย่างเดียว
 * (เสียงคลิก/เสียงเกม/เสียงสังเคราะห์ทั้งหมดถูกข้าม) · แยกไฟล์เพื่อไม่ให้ import วนกัน
 */
let suppressed = false

export function setSfxSuppressed(value: boolean): void { suppressed = value }
export function isSfxSuppressed(): boolean { return suppressed }
