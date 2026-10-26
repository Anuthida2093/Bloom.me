/*============================================================================*\
  progressTracker — เปอร์เซ็นต์โหลดจริงจากงานถ่วงน้ำหนัก (ไม่ใช่ตัวจับเวลาหลอก)
  ────────────────────────────────────────────────────────────────────────────
  progress = Σ(น้ำหนัก × ความคืบหน้าของงาน) / Σน้ำหนัก · ไม่ถอยหลังเด็ดขาด
  ถึง 1 (100%) ก็ต่อเมื่อทุกงานเสร็จจริง (งานที่ยังไม่ครบ 1 ถูกจำกัดไว้ที่ 0.99 ของสัดส่วนตัวเอง)
\*============================================================================*/

export interface ProgressTracker<K extends string> {
  set(task: K, done: number): number
  value(): number
}

export function createProgressTracker<K extends string>(weights: Record<K, number>): ProgressTracker<K> {
  const total = Object.values<number>(weights).reduce((a, b) => a + b, 0) || 1
  const done = Object.fromEntries(Object.keys(weights).map((k) => [k, 0])) as Record<K, number>
  let shown = 0
  const compute = () => {
    let sum = 0
    let allDone = true
    for (const k of Object.keys(weights) as K[]) {
      const d = Math.max(0, Math.min(1, done[k]))
      if (d < 1) allDone = false
      sum += weights[k] * d
    }
    const raw = sum / total
    return allDone ? 1 : Math.min(raw, 0.99)
  }
  return {
    set(task, v) {
      done[task] = Math.max(done[task], v) // งานเดียวกันก็ไม่ถอยหลัง
      shown = Math.max(shown, compute())
      return shown
    },
    value: () => shown,
  }
}
