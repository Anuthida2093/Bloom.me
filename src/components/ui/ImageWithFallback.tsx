import { useState } from 'react'

interface ImageWithFallbackProps {
  src: string
  /** emoji/ข้อความสั้นที่แสดงแทนเมื่อไฟล์รูปยังไม่มีหรือโหลดไม่ได้ */
  fallback: string
  /** ความกว้าง = ความสูง (ค่า CSS ใดก็ได้ เช่น '3rem' หรือ 'clamp(...)') */
  size: string
  alt?: string
  /** true = วางแทรกในบรรทัดข้อความ (inline-block + จัดกึ่งกลางแนวตั้งกับตัวอักษร) */
  inline?: boolean
}

/**
 * ImageWithFallback — รูปที่ถ้าไฟล์ยังไม่มี/โหลดไม่ได้ จะแสดง emoji แทน (ไม่โชว์ไอคอนรูปแตก)
 * ใช้ร่วมกันระหว่างหน้า Welcome และหน้า auth ทั้งชุด (โลโก้ Logo.png ด้านบนหัวข้อ)
 */
export default function ImageWithFallback({ src, fallback, size, alt = '', inline = false }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)
  const placement = inline ? { verticalAlign: 'middle' } : null

  if (failed) {
    return (
      <span aria-hidden={alt ? undefined : true} role={alt ? 'img' : undefined} aria-label={alt || undefined}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, fontSize: `calc(${size} * .7)`, lineHeight: 1, ...placement }}>
        {fallback}
      </span>
    )
  }
  return (
    <img src={src} alt={alt} onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: inline ? 'inline-block' : 'block', ...placement }} />
  )
}
