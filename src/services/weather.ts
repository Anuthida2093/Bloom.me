/*============================================================================*\
  weather.ts — สภาพอากาศจริงสำหรับเอฟเฟกต์หน้า Home (ฝนตก/ฟ้าโปร่ง)
  ────────────────────────────────────────────────────────────────────────────
  ใช้ Open-Meteo (https://open-meteo.com) — ฟรี ไม่ต้องมี API key
  • ตำแหน่ง: ถ้าผู้ใช้เคยอนุญาตตำแหน่งให้เว็บนี้ไว้แล้ว ใช้ตำแหน่งจริง (ปัดทศนิยม 2 ตำแหน่ง ~1 กม.)
    ถ้ายังไม่เคยอนุญาต ใช้กรุงเทพฯ แทน — ไม่เด้งขอสิทธิ์ตำแหน่งเองเพื่อไม่รบกวนผู้ใช้
  • แคชผลไว้ 30 นาทีใน sessionStorage — ดึงไม่สำเร็จ = ถือว่าฟ้าโปร่ง (ไม่มีเอฟเฟกต์ฝน)
\*============================================================================*/

export type HomeWeather = 'rain' | 'clear'

const CACHE_KEY = 'bloom.homeWeather'
export const WEATHER_CACHE_MS = 30 * 60 * 1000
const BANGKOK = { lat: 13.75, lon: 100.5 }

/** WMO weather code: ฝนปรอย 51-57, ฝน 61-67, ฝนซู่ 80-82, พายุฝนฟ้าคะนอง 95-99 */
function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95
}

async function getCoords(): Promise<{ lat: number; lon: number }> {
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    if (perm?.state !== 'granted') return BANGKOK
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: WEATHER_CACHE_MS }))
    return { lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 }
  } catch {
    return BANGKOK
  }
}

export async function fetchHomeWeather(): Promise<HomeWeather> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; weather: HomeWeather } | null
    if (cached && Date.now() - cached.at < WEATHER_CACHE_MS) return cached.weather
  } catch { /* ไม่มีแคช */ }

  try {
    const { lat, lon } = await getCoords()
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,precipitation`)
    if (!res.ok) return 'clear'
    const data = (await res.json()) as { current?: { weather_code?: number; precipitation?: number } }
    const code = data.current?.weather_code ?? 0
    const weather: HomeWeather = isRainCode(code) || (data.current?.precipitation ?? 0) > 0 ? 'rain' : 'clear'
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), weather })) } catch { /* ไม่เป็นไร */ }
    return weather
  } catch {
    return 'clear'
  }
}
