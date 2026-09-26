/*============================================================================*\
  color — ปรับสี hex ใน HSL (ใช้ร่วมกันทั้งตัวสร้างต้นไม้ ผู้วาด 2D และฉาก 3D)
\*============================================================================*/

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/** ปรับสี hex ใน HSL: dl = ความสว่าง ±, dh = hue ±, ds = saturation ± → 'hsl(h, s%, l%)'
 *  (คั่นจุลภาค — ใช้ได้ทั้ง canvas และ THREE.Color) */
export function shade(hex: string, dl: number, dh = 0, ds = 0): string {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  const H = (((h + dh) % 1) + 1) % 1
  return `hsl(${Math.round(H * 360)}, ${Math.round(clamp01(s + ds) * 100)}%, ${Math.round(clamp01(l + dl) * 100)}%)`
}
