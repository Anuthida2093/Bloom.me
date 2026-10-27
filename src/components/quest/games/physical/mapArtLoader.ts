import type { MapDef } from '../../../../types.journey'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import { cachedMapArt, MAP_ART_THUMB_SIZE, renderMapArt, sceneArtSize } from './mapgen/renderMapArt'
import { GENERATED_MAP_NATIVE_SIZE } from './journeyPathMath'

/*============================================================================*\
  mapArtLoader — โหลด/ถอดรหัสภาพแผนที่ล่วงหน้า (ทั้งภาพวาด 1-8 และแผนที่วาดด้วยโค้ด 9) พร้อมความคืบหน้าจริง
  ────────────────────────────────────────────────────────────────────────────
  - เรียกซ้ำได้ (งานเดียวกันใช้ promise เดิม) · ผลเก็บในหน่วยความจำ:
    ภาพวาด = <img> ที่ decode() แล้วล่าสุด DECODED_CAP ใบ · แผนที่โค้ด = LRU ของ renderMapArt (MEMORY_CAP)
  - ความคืบหน้าภาพวาด = ไบต์ที่ดาวน์โหลด (Content-Length) 0-85% แล้วถอดรหัส 85-100%
\*============================================================================*/

export type Progress = (p: number) => void
const DECODED_CAP = 4
const decoded = new Map<string, HTMLImageElement>()
const imageJobs = new Map<string, Promise<void>>()
const imageProgress = new Map<string, number>()
const imageListeners = new Map<string, Set<Progress>>()

/** ขนาดภาพของแผนที่โค้ด — ต้องตรงกับที่ MapArtImage ขอ (คีย์แคชเดียวกัน) */
export function generatedArtSize(variant: 'scene' | 'thumb'): number {
  return variant === 'thumb' ? MAP_ART_THUMB_SIZE : sceneArtSize(undefined, GENERATED_MAP_NATIVE_SIZE.width)
}

function emit(src: string, p: number) {
  const v = Math.max(imageProgress.get(src) ?? 0, p)
  imageProgress.set(src, v)
  imageListeners.get(src)?.forEach((fn) => fn(v))
}

async function loadImage(src: string): Promise<void> {
  try {
    const res = await fetch(src)
    const total = Number(res.headers.get('Content-Length')) || 0
    if (res.body && total > 0) {
      const reader = res.body.getReader()
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        got += value.byteLength
        emit(src, 0.85 * Math.min(1, got / total))
      }
    } else {
      await res.blob()
      emit(src, 0.6)
    }
  } catch { /* ออฟไลน์ — ให้ <img> ลองเองอีกครั้ง */ }
  const img = new Image()
  img.decoding = 'async'
  img.src = src // ได้จาก HTTP cache ที่เพิ่งดาวน์โหลด
  await img.decode().catch(() => {})
  decoded.delete(src)
  decoded.set(src, img)
  while (decoded.size > DECODED_CAP) decoded.delete(decoded.keys().next().value as string)
  emit(src, 1)
}

/** ภาพของแผนที่ใบนี้พร้อมวาดทันทีหรือยัง */
export function isMapArtReady(mapDef: Pick<MapDef, 'artAsset' | 'generated'> | null | undefined, variant: 'scene' | 'thumb' = 'scene'): boolean {
  if (!mapDef) return false
  if (mapDef.generated) return cachedMapArt(mapDef.generated, generatedArtSize(variant)) !== null
  return decoded.has(mapDef.artAsset)
}

/** โหลดภาพแผนที่ล่วงหน้า (onProgress 0..1 ไม่ถอยหลัง) — resolve เมื่อวาดได้ทันที */
export function warmMapArt(mapDef: Pick<MapDef, 'artAsset' | 'generated'>, onProgress?: Progress, variant: 'scene' | 'thumb' = 'scene'): Promise<void> {
  if (mapDef.generated) {
    return renderMapArt(mapDef.generated, generatedArtSize(variant), onProgress).then(() => {})
  }
  const src = mapDef.artAsset
  if (onProgress) {
    const set = imageListeners.get(src) ?? new Set()
    set.add(onProgress)
    imageListeners.set(src, set)
    onProgress(decoded.has(src) ? 1 : imageProgress.get(src) ?? 0)
  }
  if (decoded.has(src)) return Promise.resolve()
  let job = imageJobs.get(src)
  if (!job) {
    job = loadImage(src).finally(() => imageJobs.delete(src))
    imageJobs.set(src, job)
  }
  return job
}

export function stopMapArtListener(mapDef: Pick<MapDef, 'artAsset' | 'generated'>, onProgress: Progress) {
  if (!mapDef.generated) imageListeners.get(mapDef.artAsset)?.delete(onProgress)
}

/** การ์ดหน้าเลือกแผนที่ (ยังไม่ได้เลือกแผนที่ของวันนี้) */
export function warmPickerThumbs(): void {
  for (const m of JOURNEY_MAPS) void warmMapArt(m, undefined, 'thumb')
}

export function mapDefById(id: string | null | undefined): MapDef | null {
  return JOURNEY_MAPS.find((m) => m.id === id) ?? null
}
