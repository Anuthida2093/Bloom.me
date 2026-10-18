/*============================================================================*\
  learningDomains.ts — หมวด/วิชาของเควส "ผสมเกสรข้ามศาสตร์" (ใช้ร่วมกับปฏิทินป่าแห่งสิบปี)
  ────────────────────────────────────────────────────────────────────────────
  หมวดพื้นฐาน 5 หมวด + [เพิ่มตามที่ระบุ] วิชาที่ผู้เล่นตั้งชื่อเอง (เก็บในเครื่องแยกตามบัญชี)
  id ของวิชาที่ตั้งเอง = "custom:<ชื่อ>" — ชื่ออยู่ใน id เลย อ่านย้อนหลังได้แม้ลบออกจากรายการแล้ว
\*============================================================================*/

export interface LearningDomain { id: string; label: string; emoji: string }

export const BASE_DOMAINS: LearningDomain[] = [
  { id: 'language', label: 'ภาษา', emoji: '🗣️' },
  { id: 'logic', label: 'คณิต / ตรรกะ', emoji: '🔢' },
  { id: 'science', label: 'วิทยาศาสตร์', emoji: '🔬' },
  { id: 'social', label: 'สังคม / ประวัติศาสตร์', emoji: '🏛️' },
  { id: 'skill', label: 'ทักษะปฏิบัติ / ศิลปะ', emoji: '🎨' },
]

const CUSTOM_PREFIX = 'custom:'
const MAX_NAME = 40
const storageKey = (userId: string) => `bloom:custom-subjects:${userId || 'guest'}`

export function customDomainId(name: string): string {
  return `${CUSTOM_PREFIX}${name.trim().slice(0, MAX_NAME)}`
}

export function loadCustomDomains(userId: string): LearningDomain[] {
  try {
    const names = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? '[]') as string[]
    return Array.isArray(names) ? names.map((n) => ({ id: customDomainId(n), label: n, emoji: '📘' })) : []
  } catch { return [] }
}

/** เพิ่มชื่อวิชาเอง — ชื่อว่าง/ซ้ำ (ทั้งกับหมวดพื้นฐาน) ไม่เพิ่ม คืนรายการล่าสุด */
export function addCustomDomain(userId: string, rawName: string): LearningDomain[] {
  const name = rawName.trim().slice(0, MAX_NAME)
  const current = loadCustomDomains(userId)
  const taken = [...BASE_DOMAINS, ...current].some((d) => d.label.toLowerCase() === name.toLowerCase())
  if (!name || taken) return current
  try { window.localStorage.setItem(storageKey(userId), JSON.stringify([...current.map((d) => d.label), name])) } catch { /* storage ปิด */ }
  return loadCustomDomains(userId)
}

export function removeCustomDomain(userId: string, id: string): LearningDomain[] {
  const rest = loadCustomDomains(userId).filter((d) => d.id !== id)
  try { window.localStorage.setItem(storageKey(userId), JSON.stringify(rest.map((d) => d.label))) } catch { /* storage ปิด */ }
  return rest
}

/** ชื่อที่แสดงของหมวด/วิชาจาก id (ใช้ใน payload ของ quest log) — ไม่รู้จัก = คืน id เดิม */
export function domainLabel(id: string | null | undefined): string {
  if (!id) return '—'
  if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length)
  return BASE_DOMAINS.find((d) => d.id === id)?.label ?? id
}
