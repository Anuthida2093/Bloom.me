/*============================================================================*\
  http.ts — [ไฟล์ใหม่] ตัวห่อ fetch กลางของทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  โปรเจกต์เดิมไม่มี fetch แม้แต่จุดเดียว — ข้อมูลทุกอย่างอยู่ในหน่วยความจำล้วน
  ไฟล์นี้คือ "รอยต่อ" ที่ทำให้วันที่ backend พร้อม เปลี่ยนแค่ค่า env ตัวเดียว
  โดยไม่ต้องแตะคอมโพเนนต์สักตัว

  หน้าที่ของไฟล์นี้ 4 อย่าง:
    1. ต่อ base URL จาก .env ให้อัตโนมัติ
    2. แนบ token ให้ทุกคำขอ
    3. แปลง error ของ HTTP เป็น ApiError ที่มีโครงสร้างเดียวกันเสมอ
       (คอมโพเนนต์จะได้ไม่ต้องเดาว่า error หน้าตาแบบไหน)
    4. ตั้ง timeout — คำขอที่ค้างไม่มีวันจบ แย่กว่าคำขอที่ล้มเหลวเร็ว

  ตั้งค่าใน .env:
    VITE_API_BASE_URL=https://api.bloom.me
    VITE_API_MODE=mock     # mock = ใช้ข้อมูลจำลอง, live = ยิง API จริง
\*============================================================================*/

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const API_MODE: 'mock' | 'live' = (import.meta.env.VITE_API_MODE as 'mock' | 'live') ?? 'mock'

const TIMEOUT_MS = 15_000
const TOKEN_KEY = 'bloom:auth-token'

export class ApiError extends Error {
  constructor(
    public status: number,
    /** ข้อความที่แสดงต่อผู้ใช้ได้เลย — เป็นภาษาไทยเสมอ ไม่ใช่ error ดิบจากเซิร์ฟเวอร์ */
    public userMessage: string,
    public detail?: unknown,
  ) {
    super(userMessage)
    this.name = 'ApiError'
  }
}

export function getAuthToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch { /* โหมดส่วนตัวเขียนไม่ได้ — ปล่อยผ่าน */ }
}

/** แปลงรหัสสถานะเป็นข้อความที่ผู้ใช้อ่านรู้เรื่อง และบอกว่าทำอะไรต่อได้ */
function messageForStatus(status: number): string {
  if (status === 0) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'
  if (status === 401) return 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่'
  if (status === 403) return 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้'
  if (status === 404) return 'ไม่พบข้อมูลที่ต้องการ'
  if (status === 408) return 'เซิร์ฟเวอร์ตอบช้าเกินไป ลองอีกครั้ง'
  if (status === 429) return 'ทำรายการถี่เกินไป รอสักครู่แล้วลองใหม่'
  if (status >= 500) return 'เซิร์ฟเวอร์มีปัญหาชั่วคราว ลองอีกครั้งในอีกสักครู่'
  return 'ทำรายการไม่สำเร็จ ลองอีกครั้ง'
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** ข้ามการแนบ token (ใช้กับ /auth/login, /auth/register) */
  skipAuth?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  const token = skipAuth ? null : getAuthToken()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!response.ok) {
      let detail: unknown
      try { detail = await response.json() } catch { /* body ไม่ใช่ JSON */ }
      // 401 = token ตายแล้ว ลบทิ้งทันที ไม่ต้องรอให้ผู้ใช้เจอ error ซ้ำอีกรอบ
      if (response.status === 401) setAuthToken(null)
      throw new ApiError(response.status, messageForStatus(response.status), detail)
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, messageForStatus(408))
    }
    throw new ApiError(0, messageForStatus(0), error)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const http = {
  get:  <T>(path: string, o?: RequestOptions) => request<T>(path, { ...o, method: 'GET' }),
  post: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>(path, { ...o, method: 'POST', body }),
  patch:<T>(path: string, body?: unknown, o?: RequestOptions) => request<T>(path, { ...o, method: 'PATCH', body }),
  del:  <T>(path: string, o?: RequestOptions) => request<T>(path, { ...o, method: 'DELETE' }),
}

/** หน่วงเวลาจำลอง network ในโหมด mock เพื่อให้เห็น loading state ตอนพัฒนา */
export const mockDelay = (ms = 220) => new Promise<void>((resolve) => setTimeout(resolve, ms))