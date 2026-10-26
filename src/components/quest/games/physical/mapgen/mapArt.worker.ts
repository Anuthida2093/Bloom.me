import { prepareArt } from './prepareArt'
import type { MapArtRequest, MapArtResponse } from './renderMapArt'

/*  worker วาดแผนที่ที่สร้างด้วยโค้ดนอกเธรดหลัก — สร้างฉาก → วาดบน OffscreenCanvas → ส่งภาพกลับเป็น
    ImageBitmap (โอนย้ายไม่ต้องคัดลอก) เธรดหลักไม่สะดุดระหว่างวาด
    [ใหม่] ส่งความคืบหน้าจริงระหว่างวาด (สัดส่วนช่วงงานที่วาดเสร็จ) · หลังส่งภาพแล้วเข้ารหัสเป็น WebP ส่งตามไป
    ให้เธรดหลักเก็บลง Cache Storage (เปิดครั้งหน้าไม่ต้องวาดใหม่) */

self.onmessage = async (e: MessageEvent<MapArtRequest>) => {
  const { id, seed, size } = e.data
  const post = (res: MapArtResponse, transfer: Transferable[] = []) => self.postMessage(res, { transfer })
  try {
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    const t0 = performance.now()
    const job = await prepareArt({ seed }, ctx, size)
    post({ id, progress: 0.08 })
    let done = 0
    while (!job.steps.next().done) {
      done++
      post({ id, progress: 0.08 + 0.9 * Math.min(1, done / job.total) })
    }
    const paintEnd = performance.now()
    // คัดลอกเป็นบิตแมปส่งให้แสดงก่อน (canvas ยังอยู่ไว้เข้ารหัสต่อ)
    void createImageBitmap(canvas).then((bitmap) => {
      post({ id, bitmap, timings: { generateMs: job.generateMs, paintMs: paintEnd - t0 - job.generateMs } }, [bitmap])
      return canvas.convertToBlob({ type: 'image/webp', quality: 0.92 })
    }).then((blob) => post({ id, blob }), () => { /* เข้ารหัสไม่ได้ = ไม่เก็บแคชถาวร */ })
  } catch (err) {
    post({ id, error: String(err) })
  }
}
