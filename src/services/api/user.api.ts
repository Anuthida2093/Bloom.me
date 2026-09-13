import { http, API_MODE, mockDelay, setAuthToken } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { UserData, MbtiType } from '../../types'

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
  birthDate: string; height: number; weight: number
}

export async function login(payload: LoginPayload): Promise<UserData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    setAuthToken('mock-token')
    const db = updateDb((d) => { d.user = { ...d.user, username: payload.username || d.user.username } })
    return db.user
  }
  const res = await http.post<{ token: string; user: UserData }>('/auth/login', payload, { skipAuth: true })
  setAuthToken(res.token)
  return res.user
}

export async function register(payload: RegisterPayload): Promise<UserData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    setAuthToken('mock-token')
    const db = updateDb((d) => {
      d.user = {
        ...d.user,
        email: payload.email,
        username: payload.username || d.user.username,
        birthDate: payload.birthDate || null,
        height: payload.height > 0 ? payload.height : d.user.height,
        weight: payload.weight > 0 ? payload.weight : d.user.weight,
      }
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
    return updateDb((d) => { d.user = { ...d.user, ...patch } }).user
  }
  return http.patch<UserData>('/users/me', patch)
}