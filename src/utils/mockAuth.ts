/*============================================================================*\
  mockAuth.ts — [ไฟล์ใหม่] เครื่องมือช่วยสำหรับระบบ auth จำลอง (mockDb) เท่านั้น
  ────────────────────────────────────────────────────────────────────────────
  [เตือนสำคัญ — อ่านก่อนใช้] ทุกฟังก์ชันในไฟล์นี้ทำงานฝั่ง client ล้วนๆ (browser)
  เพื่อจำลองพฤติกรรมที่ backend จริงควรทำ ระหว่างที่ยังไม่มี backend ต่ออยู่
  (API_MODE=mock) — "ไม่ใช่" มาตรฐานความปลอดภัยจริงสำหรับ production เพราะ:

    • hashPasswordMock ใช้ SHA-256 เปล่าๆ ไม่มี salt/pepper และเร็วเกินไป
      (ทนต่อการ brute-force ด้วย GPU ไม่ได้เลย) — ของจริงต้องใช้ bcrypt/argon2
      ที่ตั้งใจให้ "ช้า" และมี salt ในตัว
    • แฮชเกิดขึ้นฝั่ง client ผู้ใช้ที่เปิด DevTools สามารถอ่าน/ปลอมแปลงค่าที่ส่งได้เสมอ
    • เมื่อต่อ backend จริง ต้องส่ง "รหัสผ่านดิบ" ผ่าน HTTPS ไปให้ server แฮชเองที่นั่น
      ห้ามส่งค่าที่ผ่าน hashPasswordMock นี้ไปแทนรหัสผ่านดิบเด็ดขาด

  ฟังก์ชันเหล่านี้มีไว้แค่ให้ mockDb (ซึ่ง persist ลง localStorage ของเบราว์เซอร์ผู้ใช้เอง)
  ไม่เก็บรหัสผ่านเป็น plain text ตรงๆ ระหว่างพัฒนา/เดโมเท่านั้น
\*============================================================================*/

/** แฮชรหัสผ่านด้วย SHA-256 (Web Crypto API) — ดูคำเตือนด้านบนของไฟล์ก่อนใช้ */
export async function hashPasswordMock(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** เทียบรหัสผ่านดิบกับแฮชที่เก็บไว้ */
export async function verifyPasswordMock(password: string, hash: string): Promise<boolean> {
  return (await hashPasswordMock(password)) === hash
}

/** เกณฑ์ขั้นต่ำของรหัสผ่าน — คืนข้อความ error ถ้าไม่ผ่าน, คืน null ถ้าผ่าน */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
  if (!/[A-Za-z]/.test(password)) return 'รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว'
  if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'
  return null
}

/** โทเคนสุ่มสำหรับลิงก์กู้รหัสผ่านจำลอง — ของจริง backend จะสุ่มด้วยไลบรารีที่ปลอดภัยกว่านี้
 * (เช่น crypto.randomBytes) และไม่มีทางให้ client เห็นค่านี้ก่อนกดลิงก์ในอีเมลจริง */
export function generateMockResetToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
