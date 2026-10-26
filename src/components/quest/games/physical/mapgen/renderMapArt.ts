import { artIdOf, prepareArt, type MapArtSource } from './prepareArt'

export type { MapArtSource }

/*============================================================================*\
  renderMapArt — ทำภาพพื้นหลังของแผนที่ที่สร้างด้วยโค้ด "ครั้งเดียว" แล้วใช้ซ้ำ
  ────────────────────────────────────────────────────────────────────────────
  - หลัก: worker + OffscreenCanvas คืน ImageBitmap (ไม่แย่งเธรดหลัก) · สำรอง: ทยอยวาดบนเธรดหลักตอนเครื่องว่าง
  - [ใหม่] แคชถาวร (Cache Storage — ผู้ใช้อนุญาตแล้ว): วาดเสร็จครั้งแรก worker เข้ารหัส WebP ส่งมาเก็บไว้
    เปิดครั้งหน้า (แม้ปิดแอปไปแล้ว) แค่ถอดรหัสไฟล์ ~0.1-0.3 วิ แทนวาดใหม่ 6-9 วิ
    คีย์มี ART_VERSION — แก้ตัวสร้าง/ตัววาดฉากเมื่อไหร่ ต้องเพิ่มเลขนี้ ไม่งั้นจะเห็นภาพเก่าจากแคช
  - แคชในหน่วยความจำแบบ LRU เก็บล่าสุด MEMORY_CAP ภาพ (3 × ≤36 MiB) เกินแล้วปล่อยภาพเก่าสุด
  - ความคืบหน้าจริง (onProgress 0..1): ระหว่างวาด = สัดส่วนช่วงงานที่เสร็จ · จากแคช = อ่าน → ถอดรหัส
  - ขนาดภาพตามความละเอียดจอ เพดาน 3072×3072 px (≈ 36 MiB ต่อภาพ) — การ์ดเลือกแผนที่ใช้ 768 px (≈ 2.3 MiB)
    [แก้ตามที่ระบุ] เลือกความคมแทนความเร็ว: วัดแล้ว 3072 px วาดนานกว่า 2048 px ราว 2 เท่า ผู้ใช้ยอมรอได้
\*============================================================================*/

export interface MapArtTimings { generateMs: number; paintMs: number }
export interface MapArtRequest { id: number; seed: number; size: number }
export type MapArtResponse =
  | { id: number; progress: number }
  | { id: number; bitmap: ImageBitmap; timings: MapArtTimings }
  | { id: number; blob: Blob }
  | { id: number; error: string }
export interface MapArtResult {
  image: ImageBitmap | HTMLCanvasElement
  size: number
  mode: 'worker' | 'idle' | 'cache'
  /** totalMs = ตั้งแต่ขอภาพจนได้ภาพ (รวมเวลาเริ่ม worker / รอเครื่องว่าง / อ่านแคช) */
  timings: MapArtTimings & { totalMs: number }
}
export type ProgressFn = (p: number) => void

/** เพดานด้านกว้างของภาพ (px) — 3072² × 4 ไบต์ ≈ 36 MiB */
export const MAP_ART_MAX_SIZE = 3072
export const MAP_ART_THUMB_SIZE = 768
/** เลขเวอร์ชันของภาพในแคชถาวร — เพิ่มทุกครั้งที่แก้ generateMapScene / paintMapScene / sceneryPrimitives */
export const ART_VERSION = 3
/** เก็บภาพที่วาดแล้วในหน่วยความจำได้กี่ภาพ (ที่เหลือยังอยู่ในแคชถาวร) */
export const MEMORY_CAP = 3
const CACHE_NAME = 'bloom-map-art'

/** ขนาดภาพแผนที่เต็มที่เหมาะกับจอนี้ (ปัดขึ้นทีละ 256 px) — cssSize = ขนาดกล่องแผนที่ก่อนซูม */
export function sceneArtSize(dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, cssSize = 1024): number {
  return Math.min(MAP_ART_MAX_SIZE, Math.max(cssSize, Math.ceil((cssSize * dpr) / 256) * 256))
}

const jobs = new Map<string, Promise<MapArtResult>>()
const ready = new Map<string, MapArtResult>()
const progressOf = new Map<string, number>()
const listeners = new Map<string, Set<ProgressFn>>()
let worker: Worker | null = null
let workerBroken = false
let nextId = 1
interface Pending { onProgress: ProgressFn; resolve: (r: MapArtResponse) => void; onBlob: (b: Blob) => void }
const pending = new Map<number, Pending>()

const keyOf = (src: MapArtSource, size: number) => `${artIdOf(src)}:${size}`
const cacheUrl = (src: MapArtSource, size: number) => `/__map-art/v${ART_VERSION}/${artIdOf(src)}-${size}.webp`

function report(key: string, p: number) {
  // ไม่ถอยหลัง
  const v = Math.max(progressOf.get(key) ?? 0, Math.min(1, p))
  progressOf.set(key, v)
  listeners.get(key)?.forEach((fn) => fn(v))
}

function canUseWorker(): boolean {
  return !workerBroken && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
    && typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function'
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./mapArt.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<MapArtResponse>) => {
      const h = pending.get(e.data.id)
      if (!h) return
      if ('progress' in e.data) h.onProgress(e.data.progress)
      else if ('blob' in e.data) { h.onBlob(e.data.blob); pending.delete(e.data.id) }
      else {
        h.resolve(e.data)
        if ('error' in e.data) pending.delete(e.data.id)
      }
    }
    worker.onerror = () => {
      // worker โหลดไม่ขึ้น → ทุกงานที่ค้างอยู่ไปใช้ทางสำรองแทน
      workerBroken = true
      for (const [id, h] of pending) h.resolve({ id, error: 'worker failed' })
      pending.clear()
    }
  }
  return worker
}

function renderInWorker(src: MapArtSource, size: number, onProgress: ProgressFn, onBlob: (b: Blob) => void): Promise<MapArtResponse> {
  const id = nextId++
  return new Promise((resolve) => {
    pending.set(id, { onProgress, resolve, onBlob })
    getWorker().postMessage({ id, seed: src.seed, size } satisfies MapArtRequest)
  })
}

const idle = (): Promise<void> => new Promise((resolve) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 120 })
  else setTimeout(resolve, 0)
})

async function renderOnIdle(src: MapArtSource, size: number, onProgress: ProgressFn): Promise<{ image: HTMLCanvasElement; timings: MapArtTimings }> {
  await idle()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const job = await prepareArt(src, ctx, size)
  const t1 = performance.now()
  onProgress(0.08)
  // ทยอยวาดทีละช่วง คืนเธรดให้หน้าจอระหว่างช่วง — เวลาที่รอเครื่องว่างไม่นับเป็นเวลาวาด
  let waited = 0, done = 0
  while (!job.steps.next().done) {
    onProgress(0.08 + 0.9 * Math.min(1, ++done / job.total))
    const s = performance.now()
    await idle()
    waited += performance.now() - s
  }
  return { image: canvas, timings: { generateMs: job.generateMs, paintMs: performance.now() - t1 - waited } }
}

async function readPersisted(src: MapArtSource, size: number, onProgress: ProgressFn): Promise<ImageBitmap | null> {
  try {
    if (typeof caches === 'undefined') return null
    const res = await (await caches.open(CACHE_NAME)).match(cacheUrl(src, size))
    if (!res) return null
    onProgress(0.4)
    const blob = await res.blob()
    onProgress(0.7)
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

function persist(src: MapArtSource, size: number, blob: Blob) {
  if (typeof caches === 'undefined') return
  void caches.open(CACHE_NAME).then(async (c) => {
    await c.put(cacheUrl(src, size), new Response(blob, { headers: { 'Content-Type': 'image/webp' } }))
    // ลบภาพเวอร์ชันเก่าที่ไม่ใช้แล้ว (รวมภาพแผนที่ 1-8 แบบโค้ดที่เลิกใช้)
    for (const req of await c.keys()) if (!req.url.includes(`/__map-art/v${ART_VERSION}/`) || /\/[a-z-]+-v\d+-\d+\.webp$/.test(req.url)) await c.delete(req)
  }).catch(() => { /* โควตาเต็ม/ไม่รองรับ — ข้ามไป */ })
}

async function render(src: MapArtSource, size: number, key: string): Promise<MapArtResult> {
  const t0 = performance.now()
  const onProgress = (p: number) => report(key, p)
  const cached = await readPersisted(src, size, onProgress)
  if (cached) return { image: cached, size, mode: 'cache', timings: { generateMs: 0, paintMs: 0, totalMs: performance.now() - t0 } }
  if (canUseWorker()) {
    const res = await renderInWorker(src, size, onProgress, (blob) => persist(src, size, blob))
    if ('bitmap' in res) return { image: res.bitmap, size, mode: 'worker', timings: { ...res.timings, totalMs: performance.now() - t0 } }
    workerBroken = true
  }
  const { image, timings } = await renderOnIdle(src, size, onProgress)
  return { image, size, mode: 'idle', timings: { ...timings, totalMs: performance.now() - t0 } }
}

function remember(key: string, r: MapArtResult) {
  ready.delete(key)
  ready.set(key, r)
  while (ready.size > MEMORY_CAP) {
    const oldest = ready.keys().next().value as string
    ready.delete(oldest)
    jobs.delete(oldest)
    progressOf.delete(oldest)
  }
}

/** ภาพของแหล่งภาพ + ขนาดนี้ (วาด/อ่านแคชครั้งแรกครั้งเดียว ครั้งต่อไปได้จากหน่วยความจำ) — เรียกซ้ำได้ (idempotent) */
export function renderMapArt(src: MapArtSource, size: number, onProgress?: ProgressFn): Promise<MapArtResult> {
  const key = keyOf(src, size)
  if (onProgress) {
    const set = listeners.get(key) ?? new Set()
    set.add(onProgress)
    listeners.set(key, set)
    onProgress(ready.has(key) ? 1 : progressOf.get(key) ?? 0)
  }
  let job = jobs.get(key)
  if (!job) {
    job = render(src, size, key)
    job.then((r) => { remember(key, r); report(key, 1) }, () => { jobs.delete(key); progressOf.delete(key) }) // ล้มเหลว → ลองใหม่ได้ครั้งหน้า
    jobs.set(key, job)
  }
  return job
}

/** เลิกฟังความคืบหน้า (คอมโพเนนต์ถอดออก) */
export function stopMapArtProgress(src: MapArtSource, size: number, onProgress: ProgressFn) {
  listeners.get(keyOf(src, size))?.delete(onProgress)
}

/** ภาพที่วาดเสร็จแล้วในหน่วยความจำ (ไม่มี = null) — ให้คอมโพเนนต์แสดงภาพทันทีโดยไม่ต้องรอ */
export function cachedMapArt(src: MapArtSource, size: number): MapArtResult | null {
  return ready.get(keyOf(src, size)) ?? null
}
