/*============================================================================*\
  testerSession.ts — บัญชีทดสอบ UI (tester@bloom.me) แบบแยกขาดจากข้อมูลจริง
  ────────────────────────────────────────────────────────────────────────────
  ผู้ทดสอบหลายคนใช้บัญชีเดียวกันพร้อมกันได้โดยข้อมูลไม่ชนกัน เพราะ:
    • ล็อกอินด้วยบัญชีนี้ = ไม่ยิง API จริงเลยไม่ว่า VITE_API_MODE จะเป็นอะไร
      (isMockMode() ใน http.ts คืน true เสมอระหว่าง tester session)
    • ทุกอย่างที่ปกติเก็บใน localStorage (mockDb: MBTI/ต้นไม้/เควส/เหรียญ/ไอเทม,
      การตั้งค่า, ก้าว, แคปซูลเวลา, แชท ฯลฯ) ถูกเปลี่ยนไปเก็บใน sessionStorage แทน
      ผ่าน appStorage ด้านล่าง → แต่ละแท็บ/เครื่องเป็นผู้ทดสอบคนละคน ปิดเบราว์เซอร์แล้วหายหมด

  กติกา: โค้ดที่อ่าน/เขียนข้อมูลของผู้ใช้ต้องใช้ appStorage แทน window.localStorage ตรงๆ เสมอ
  (ยกเว้น resetLocalData.ts ที่ล้างทั้งเครื่อง และธงของไฟล์นี้เองที่ต้องอยู่ใน sessionStorage)
\*============================================================================*/

export const TESTER_EMAIL = 'tester@bloom.me'
export const TESTER_PASSWORD = '123456'
export const TESTER_USERNAME = 'ผู้ทดสอบ'
export const TESTER_ACCOUNT_ID = 'acct-tester'
/** เพื่อนตั้งต้นของบัญชีทดสอบ — "พงศ์พล" (p3) ติดตามเราอยู่แล้วในข้อมูลจำลอง (SEED_ACTIVITY)
 *  เราติดตามกลับให้ตั้งแต่เริ่ม = เป็นเพื่อนกันทันที ผู้ทดสอบลองรดน้ำให้เพื่อนได้เลย */
export const TESTER_SEED_FRIEND_ID = 'p3'

/** ค่าที่กรอกไว้ให้ในหน้าสมัครสมาชิก — กดสมัครได้ทันทีไม่ต้องพิมพ์เอง */
export const TESTER_REGISTER_DEFAULTS = {
  email: TESTER_EMAIL,
  username: TESTER_USERNAME,
  password: TESTER_PASSWORD,
  birthDate: '2000-01-01',
  gender: 'FEMALE' as const,
  height: '160',
  weight: '55',
}

const FLAG_KEY = 'bloom:tester-session'

/** ช่องแรกของ Login รับได้ทั้งชื่อผู้ใช้และอีเมล — เทียบแบบไม่สนตัวพิมพ์/ช่องว่าง */
export function isTesterCredentials(identifier: string, password: string): boolean {
  return identifier.trim().toLowerCase() === TESTER_EMAIL && password === TESTER_PASSWORD
}

export function isTesterSession(): boolean {
  try { return window.sessionStorage.getItem(FLAG_KEY) === '1' } catch { return false }
}

export function startTesterSession() {
  try { window.sessionStorage.setItem(FLAG_KEY, '1') } catch { /* storage ปิด — ใช้ได้แค่ในหน้านี้ */ }
}

/** ออกจาก tester session — ล้างข้อมูลทดสอบของแท็บนี้ทิ้งทั้งหมด (ไม่แตะ localStorage ของบัญชีจริง) */
export function endTesterSession() {
  if (!isTesterSession()) return
  try { window.sessionStorage.clear() } catch { /* noop */ }
}

/** storage ที่ถูกต้องของผู้ใช้ปัจจุบัน: tester → sessionStorage, ผู้ใช้จริง → localStorage
 *  ตัดสินใหม่ทุกครั้งที่เรียก (ไม่ cache) เพราะสถานะ tester เปลี่ยนได้กลางทางตอนล็อกอิน/ออก */
function currentStore(): Storage {
  return isTesterSession() ? window.sessionStorage : window.localStorage
}

export const appStorage = {
  getItem: (key: string): string | null => currentStore().getItem(key),
  setItem: (key: string, value: string): void => currentStore().setItem(key, value),
  removeItem: (key: string): void => currentStore().removeItem(key),
}
