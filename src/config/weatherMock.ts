import type { WeatherType } from '../types.journey'

/*============================================================================*\
  weatherMock.ts — [ชั่วคราว] สุ่มสภาพอากาศแทนการต่อ weather API จริง
  ────────────────────────────────────────────────────────────────────────────
  TODO: แทนที่ด้วยการเรียก weather API จริงตามพิกัดผู้ใช้ (ยังไม่ตัดสินใจว่าจะใช้ provider ไหน —
  OpenWeatherMap/WeatherAPI/อื่นๆ) ตอนนี้สุ่มไปก่อนเพื่อให้ WeatherEffectLayer.tsx มีอะไรให้ตอบสนอง
\*============================================================================*/
export function getMockWeather(): WeatherType {
  const roll = Math.random()
  if (roll < 0.35) return 'rain'
  if (roll < 0.75) return 'sunny'
  return 'clear'
}
