import { http, API_MODE, ApiError } from '../http'
import { findQuestByCode } from '../../config/questCatalog'

/*============================================================================*\
  upload.api — อัปโหลดรูปขึ้น Supabase Storage ผ่าน signed URL ที่ backend ออกให้ (เฉพาะโหมด live)
  ────────────────────────────────────────────────────────────────────────────
  รูปเควส (เควสที่ config.requiresPhotos > 0 — ดู questCatalog.ts):
    1. logId ชั่วคราว = crypto.randomUUID() (ใช้ร่วมกันทุกรูปของการส่งเควสครั้งนั้น)
    2. POST /quests/logs/{logId}/photo-upload-url { fileExt: 'jpg' } → { signedUrl, path }
    3. PUT ไฟล์ไปที่ signedUrl (Content-Type image/jpeg) — ไม่ผ่านลองแบบ FormData (แบบ supabase-js)
    4. ส่ง path ทั้งหมดเป็น payload.photoPaths ของ POST /quest-logs/complete (ห้ามส่ง data URL)
  รูปโปรไฟล์: POST /users/me/avatar-upload-url { fileExt } → PUT ไฟล์ → PATCH /users/me { avatarUrl: publicUrl }
  โหมด mock: ไม่อัปโหลดอะไรเลย (ทำงานเหมือนเดิม)
\*============================================================================*/

interface SignedUpload {
  signedUrl: string
  path: string
  publicUrl?: string
}

/** data URL → Blob (ไม่ใช้ fetch(dataUrl) — บาง WebView/สภาพแวดล้อมทดสอบไม่รองรับ) */
export function dataUrlToBlob(dataUrl: string, type?: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match) throw new ApiError(400, 'รูปไม่ถูกต้อง ลองถ่ายใหม่อีกครั้ง')
  const [, mime = 'application/octet-stream', isBase64, data] = match
  if (!isBase64) return new Blob([decodeURIComponent(data)], { type: type ?? mime })
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: type ?? mime })
}

/** PUT ไฟล์ไปที่ signed URL — raw ไม่ผ่าน → ส่งซ้ำแบบ FormData ตามที่ supabase-js uploadToSignedUrl ทำ */
export async function putToSignedUrl(signedUrl: string, blob: Blob, failMessage: string): Promise<void> {
  const attempt = async (init: RequestInit): Promise<Response | null> => {
    try { return await fetch(signedUrl, { method: 'PUT', ...init }) } catch { return null }
  }
  const raw = await attempt({ headers: { 'Content-Type': blob.type, 'x-upsert': 'false' }, body: blob })
  if (raw?.ok) return
  const form = new FormData()
  form.append('cacheControl', '3600')
  form.append('', blob)
  const viaForm = await attempt({ headers: { 'x-upsert': 'false' }, body: form })
  if (viaForm?.ok) return
  throw new ApiError(viaForm?.status ?? raw?.status ?? 0, failMessage)
}

/** จำนวนรูปที่เควสนี้ต้องแนบ (0 = ไม่ต้องแนบ) */
export function requiredQuestPhotos(questCode: string): number {
  const n = findQuestByCode(questCode)?.config?.requiresPhotos
  return typeof n === 'number' && n > 0 ? n : 0
}

/** อัปโหลดรูปเควส (data URL) ทั้งหมด → path ใน storage เรียงตามลำดับรูป */
export async function uploadQuestPhotos(photos: string[]): Promise<string[]> {
  const logId = crypto.randomUUID()
  const paths: string[] = []
  for (const photo of photos) {
    const { signedUrl, path } = await http.post<SignedUpload>(
      `/quests/logs/${encodeURIComponent(logId)}/photo-upload-url`, { fileExt: 'jpg' },
    )
    await putToSignedUrl(signedUrl, dataUrlToBlob(photo, 'image/jpeg'), 'อัปโหลดรูปไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง')
    paths.push(path)
  }
  return paths
}

/** เตรียม payload รูปของเควสก่อนเรียก complete — mock: {} (เหมือนเดิม) · live: อัปโหลดแล้วคืน { photoPaths }
 *  จำนวนรูปต้องเท่ากับ requiresPhotos เป๊ะ · ล้มเหลว = throw (ผู้เรียกต้องแจ้งผู้ใช้และไม่เรียก complete) */
export async function prepareQuestPhotos(questCode: string, photos: string[]): Promise<{ photoPaths?: string[] }> {
  if (API_MODE === 'mock') return {}
  const required = requiredQuestPhotos(questCode)
  if (required === 0) return {}
  if (photos.length !== required) throw new ApiError(400, `เควสนี้ต้องแนบรูป ${required} รูป`)
  return { photoPaths: await uploadQuestPhotos(photos) }
}

/** นามสกุลไฟล์รูปที่ backend รับ (ตาม MIME ของไฟล์) */
export function imageFileExt(mime: string): 'jpg' | 'png' | 'webp' {
  const subtype = mime.split('/')[1] ?? ''
  if (subtype === 'png' || subtype === 'webp') return subtype
  return 'jpg'
}

/** อัปโหลดรูปโปรไฟล์ขึ้น storage → URL สาธารณะ (ยังไม่ PATCH /users/me) */
export async function uploadAvatarBlob(blob: Blob): Promise<string> {
  const fileExt = imageFileExt(blob.type)
  const { signedUrl, publicUrl } = await http.post<SignedUpload>('/users/me/avatar-upload-url', { fileExt })
  if (!publicUrl) throw new ApiError(500, 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ ลองอีกครั้ง')
  await putToSignedUrl(signedUrl, blob, 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ ลองอีกครั้ง')
  return publicUrl
}
