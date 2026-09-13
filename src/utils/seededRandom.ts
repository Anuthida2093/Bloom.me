/**
 * hashSeed / mulberry32 — แปลง string ใดๆ ให้เป็นตัวเลข seed แล้วสร้างฟังก์ชันสุ่ม
 * ที่ deterministic (ใส่ seed เดิม ได้ลำดับตัวเลขเดิมเป๊ะทุกครั้ง)
 *
 * ใช้กับระบบ "ปั๊มใบไม้" ใน TreeOfLife.tsx — seed มาจาก `${mbtiType}-${level}`
 * ทำให้ต้นไม้ของผู้เล่นคนเดิมที่ level เดิม มีการจัดวางใบเหมือนเดิมทุกครั้งที่ re-render
 * (ไม่กระพริบ/สลับตำแหน่งใบไปมาเวลา React re-render โดยไม่มี level เปลี่ยนจริง)
 * แต่พอ level เปลี่ยน seed จะเปลี่ยนตาม ได้ลาย pattern ใบใหม่ที่ดู "งอกเพิ่ม" ขึ้นมาจริง
 */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

export function mulberry32(seed: number): () => number {
  let s = seed
  return function random() {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** สร้างฟังก์ชันสุ่มแบบ deterministic ตรงจาก string seed เดียว (ย่อ 2 ฟังก์ชันข้างบนไว้ที่เดียว) */
export function seededRandom(seedString: string): () => number {
  return mulberry32(hashSeed(seedString))
}