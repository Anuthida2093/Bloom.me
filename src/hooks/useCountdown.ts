import { useEffect, useState } from 'react'

/** เวลาที่เหลือ (ms) จนถึง untilIso — อัปเดตทุก tickMs · null/หมดเวลา = 0
 *  ใช้แสดงผลเท่านั้น (เช่น การ์ด ×2 เหลือกี่ชั่วโมง) — เซิร์ฟเวอร์ตัดสินว่าหมดเวลาจริงเมื่อไร */
export function useCountdown(untilIso: string | null | undefined, tickMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!untilIso) return
    const id = window.setInterval(() => setNow(Date.now()), tickMs)
    return () => window.clearInterval(id)
  }, [untilIso, tickMs])
  if (!untilIso) return 0
  return Math.max(0, Date.parse(untilIso) - now)
}

/** 5h 07m → "5 ชม. 7 นาที" · ต่ำกว่า 1 ชม. → "42 นาที" */
export function formatRemainingTh(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} นาที`
  return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}
