import { useEffect, useState } from 'react'
import { fetchHomeWeather, WEATHER_CACHE_MS, type HomeWeather } from '../services/weather'

/** สภาพอากาศหน้า Home (Open-Meteo — services/weather.ts) ใช้ร่วมกันทั้ง HomeAmbience และฉากที่วาดด้วยโค้ด
 *  (บริการมีแคชของตัวเอง เรียกหลายที่ไม่ยิงซ้ำ) */
export function useHomeWeather(): HomeWeather {
  const [weather, setWeather] = useState<HomeWeather>('clear')
  useEffect(() => {
    let cancelled = false
    const load = () => { void fetchHomeWeather().then((w) => { if (!cancelled) setWeather(w) }) }
    load()
    const id = window.setInterval(load, WEATHER_CACHE_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [])
  return weather
}
