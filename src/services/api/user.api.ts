import { http, API_MODE, ApiError, mockDelay, setAuthToken } from '../http'
import { getDb, updateDb, resetDb, switchActiveAccount } from '../mock/mockDb'
import { DEFAULT_USER_DATA, type UserData, type MbtiType, type Gender } from '../../types'
import { computeBmi, computeBodyType } from '../../utils/bmi'
import { hashPasswordMock, verifyPasswordMock, generateMockResetToken } from '../../utils/mockAuth'

/** อายุของโทเคนกู้รหัสผ่านจำลอง — ของจริง backend มักตั้ง 15-60 นาที */
const RESET_TOKEN_TTL_MS = 30 * 60_000

/*============================================================================*\
  user.api.ts — [ไฟล์ใหม่] ทุกคำขอที่เกี่ยวกับผู้ใช้
  ────────────────────────────────────────────────────────────────────────────
  ทุกฟังก์ชันในไฟล์นี้มีโครงเดียวกันหมด:
      if (API_MODE === 'mock') { ...ทำกับข้อมูลจำลอง... }
      return http.xxx(...)      ← ของจริง
  ทำให้ตอนสลับไป live รู้ทันทีว่าต้องเช็คอะไรบ้าง และไม่มี logic ซ่อนอยู่ที่อื่น
\*============================================================================*/

export interface LoginPayload { username: string; password: string }
export interface RegisterPayload {
  email: string; username: string; password: string
  birthDate: string; gender: Gender; height: number; weight: number
}

export async function login(payload: LoginPayload): Promise<UserData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const usernameLower = payload.username.trim().toLowerCase()
    const account = getDb().accounts.find((a) => a.username.trim().toLowerCase() === usernameLower)
    // [ตามที่ระบุ] ข้อความ error เดียวกันไม่ว่าจะพิมพ์ username ผิดหรือรหัสผ่านผิด — มาตรฐาน
    // ความปลอดภัยจริงเพื่อไม่บอกผู้โจมตีว่า "username นี้มีอยู่ในระบบ" ผ่าน error message
    // ที่ต่างกัน (backend จริงต้องทำแบบเดียวกันนี้)
    const invalidCredentialsError = new ApiError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    if (!account) throw invalidCredentialsError
    const passwordOk = await verifyPasswordMock(payload.password, account.passwordHash)
    if (!passwordOk) throw invalidCredentialsError

    setAuthToken('mock-token')
    // [แก้บั๊กรอบนี้] เดิมเขียนทับแค่ d.user แต่ d.questLogs/moodEntries/inventory/posts/activity
    // ทั้งก้อนยังเป็นของบัญชีที่ล็อกอินอยู่ก่อนหน้าเสมอ (เซฟไฟล์เดียวใช้ร่วมกันทุกบัญชี) —
    // switchActiveAccount() เซฟข้อมูลบัญชีเดิมออกและโหลดข้อมูลของบัญชีนี้เข้ามาแทนแบบแยกจริง
    const db = updateDb((d) => {
      switchActiveAccount(d, account.id, { username: account.username, email: account.email })
    })
    return db.user
  }
  const res = await http.post<{ token: string; user: UserData }>('/auth/login', payload, { skipAuth: true })
  setAuthToken(res.token)
  return res.user
}

export async function register(payload: RegisterPayload): Promise<UserData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const emailLower = payload.email.trim().toLowerCase()
    // [ตามที่ระบุ — ข้อ 1] กันสมัครซ้ำ เทียบแบบ case-insensitive ("A@x.com" ถือว่าซ้ำกับ
    // "a@x.com") ก่อนสร้างบัญชีใหม่ทับไปเรื่อยๆ แบบเดิม
    const emailTaken = getDb().accounts.some((a) => a.email === emailLower)
    if (emailTaken) {
      throw new ApiError(409, 'อีเมลนี้มีผู้ใช้งานแล้ว ลองเข้าสู่ระบบหรือกู้รหัสผ่านแทน')
    }
    const passwordHash = await hashPasswordMock(payload.password)
    setAuthToken('mock-token')
    // [แก้บั๊กรอบนี้] เดิม fallback height/weight เป็น d.user.height/weight ของบัญชีก่อนหน้า
    // (เศษบั๊กเดียวกัน — บัญชีใหม่เห็นส่วนสูง/น้ำหนักของคนก่อน) ตอนนี้บัญชีใหม่ไม่เคยมี d.user
    // เดิมให้ fallback แล้ว (switchActiveAccount สร้างโปรไฟล์ใหม่จริง) จึง fallback ไปที่ค่า
    // เริ่มต้นกลางแทน
    const height = payload.height > 0 ? payload.height : DEFAULT_USER_DATA.height
    const weight = payload.weight > 0 ? payload.weight : DEFAULT_USER_DATA.weight
    // [แก้ตามที่ระบุ — เอาตาม backend] เดิม bmi/bodyType ไม่เคยถูกคำนวณที่ไหนเลย ยังเป็น
    // null ค้างเสมอ (ProfilePage คำนวณ bmi เองแบบ client-only แยกต่างหาก ไม่เคยเขียนกลับ
    // เข้า userData) จำลองพฤติกรรมที่ backend จริงควรทำ (คำนวณตอนบันทึก height/weight)
    const bmi = height && weight ? computeBmi(height, weight) : null
    const db = updateDb((d) => {
      const accountId = `acct-${Date.now()}`
      d.accounts.push({
        id: accountId,
        email: emailLower,
        username: payload.username,
        passwordHash,
        createdAt: new Date().toISOString(),
      })
      // [แก้บั๊กรอบนี้] เดิมเขียนทับแค่ d.user แต่ d.questLogs/moodEntries/inventory/posts/activity
      // ทั้งก้อนยังเป็นของบัญชีก่อนหน้าเสมอ — switchActiveAccount() สร้างโปรไฟล์เกมใหม่ทั้งชุด
      // (questLogs ว่าง ฯลฯ) ให้บัญชีที่เพิ่งสมัครจริงๆ แทนการสืบทอดของบัญชีเดิม
      switchActiveAccount(d, accountId, {
        email: payload.email,
        username: payload.username,
        birthDate: payload.birthDate || null,
        gender: payload.gender,
        height,
        weight,
        bmi,
        bodyType: bmi ? computeBodyType(bmi) : null,
      })
    })
    return db.user
  }
  const res = await http.post<{ token: string; user: UserData }>('/auth/register', payload, { skipAuth: true })
  setAuthToken(res.token)
  return res.user
}

export async function logout(): Promise<void> {
  setAuthToken(null)
  if (API_MODE === 'mock') return
  await http.post<void>('/auth/logout')
}

/*============================================================================*\
  [เพิ่มรอบนี้ — ข้อ 2] flow "ลืมรหัสผ่าน" แบบเต็ม จำลองฝั่ง mock ทั้งหมด
\*============================================================================*/

export interface RequestPasswordResetResult {
  /** [เฉพาะ dev/เดโมเท่านั้น] token จริงที่ backend จะฝังไว้ในลิงก์อีเมล — ระบบจริงต้อง "ไม่มีทาง"
   *  ส่งค่านี้กลับมาให้ฝั่ง client เห็นเด็ดขาด (ต้องอยู่ในอีเมลที่ส่งออกไปเท่านั้น) ที่ต้องคืนมา
   *  ตรงนี้เพราะโปรเจกต์นี้ยังไม่มีระบบส่งอีเมลจริง ใช้แทนที่ "หน้าจำลองอีเมล" ชั่วคราวสำหรับ
   *  เทสระหว่างพัฒนาเท่านั้น — เป็น null เสมอถ้าไม่พบอีเมลนี้ในระบบ (แต่ข้อความที่โชว์ผู้ใช้ต้อง
   *  เหมือนกันทั้ง 2 กรณีเสมอ ดู ForgotPassword.tsx) ลบ field นี้ทิ้งทันทีที่ต่อระบบส่งอีเมลจริง */
  devToken: string | null
}

export async function requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const emailLower = email.trim().toLowerCase()
    const account = getDb().accounts.find((a) => a.email === emailLower)
    if (!account) return { devToken: null }

    const token = generateMockResetToken()
    updateDb((d) => {
      // ลบโทเคนเก่าของอีเมลเดียวกันทิ้งก่อน กันมีหลายลิงก์ใช้ได้พร้อมกัน
      d.passwordResetTokens = d.passwordResetTokens.filter((t) => t.email !== emailLower)
      d.passwordResetTokens.push({ token, email: emailLower, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString() })
    })
    return { devToken: token }
  }
  // ของจริง: backend คืนแค่ 200 เสมอไม่ว่าจะเจออีเมลหรือไม่ (กันเปิดเผยว่าอีเมลไหนมีในระบบ)
  await http.post<void>('/auth/request-password-reset', { email }, { skipAuth: true })
  return { devToken: null }
}

export async function resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const db = getDb()
    const entry = db.passwordResetTokens.find((t) => t.token === payload.token)
    if (!entry) throw new ApiError(400, 'ลิงก์กู้รหัสผ่านนี้ไม่ถูกต้องหรือถูกใช้ไปแล้ว')
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      throw new ApiError(400, 'ลิงก์กู้รหัสผ่านนี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่')
    }
    const passwordHash = await hashPasswordMock(payload.newPassword)
    updateDb((d) => {
      const account = d.accounts.find((a) => a.email === entry.email)
      if (account) account.passwordHash = passwordHash
      // [ตามที่ระบุ — ข้อ 2e] invalidate token ทันทีหลังใช้สำเร็จ กันใช้ลิงก์เดิมซ้ำ
      d.passwordResetTokens = d.passwordResetTokens.filter((t) => t.token !== payload.token)
    })
    return
  }
  await http.post<void>('/auth/reset-password', payload, { skipAuth: true })
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const db = getDb()
    const account = db.accounts.find((a) => a.email === db.user.email.trim().toLowerCase())
    if (!account) throw new ApiError(404, 'ไม่พบบัญชีนี้ในระบบ')
    const currentOk = await verifyPasswordMock(payload.currentPassword, account.passwordHash)
    if (!currentOk) throw new ApiError(401, 'รหัสผ่านปัจจุบันไม่ถูกต้อง')
    const newHash = await hashPasswordMock(payload.newPassword)
    updateDb((d) => {
      const acc = d.accounts.find((a) => a.id === account.id)
      if (acc) acc.passwordHash = newHash
    })
    return
  }
  await http.post<void>('/auth/change-password', payload)
}

/** [เพิ่มรอบนี้ — ข้อ 3] ลบบัญชีถาวร — โหมด mock: เคลียร์ mockDb ทั้งก้อน (ข้อมูลเกม/เควส/
 * อารมณ์/โพสต์/คลังไอเทม/บัญชีที่สมัครไว้ทั้งหมด) กลับไปเป็นค่าเริ่มต้น */
export async function deleteAccount(): Promise<void> {
  setAuthToken(null)
  if (API_MODE === 'mock') { resetDb(); return }
  await http.del<void>('/users/me')
}

export async function getMe(): Promise<UserData> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().user }
  return http.get<UserData>('/users/me')
}

export async function updateMbti(mbtiType: MbtiType): Promise<UserData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    return updateDb((d) => { d.user = { ...d.user, mbtiType } }).user
  }
  return http.patch<UserData>('/users/me', { mbtiType })
}

export async function updateProfile(patch: Partial<UserData>): Promise<UserData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    return updateDb((d) => {
      const next = { ...d.user, ...patch }
      // [แก้ตามที่ระบุ — เอาตาม backend] คำนวณ bmi/bodyType ใหม่ทุกครั้งที่ height/weight
      // ถูกแก้ไข (ไม่ใช่แค่ตอน register) ให้ userData.bmi/bodyType เป็นค่าจริงที่ใช้ได้เสมอ
      // แทนที่จะค้าง null แล้วให้แต่ละหน้า (ProfilePage) คำนวณเองแยกกันคนละที่
      if (('height' in patch || 'weight' in patch) && next.height && next.weight) {
        next.bmi = computeBmi(next.height, next.weight)
        next.bodyType = computeBodyType(next.bmi)
      }
      d.user = next
    }).user
  }
  return http.patch<UserData>('/users/me', patch)
}