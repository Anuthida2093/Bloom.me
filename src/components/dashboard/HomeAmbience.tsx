import { useEffect, useMemo, useState } from 'react'
import { fetchHomeWeather, WEATHER_CACHE_MS, type HomeWeather } from '../../services/weather'
import './HomeAmbience.css'

/*============================================================================*\
  HomeAmbience — [ใหม่ตามที่ระบุ] บรรยากาศหน้า Home ตามธีมและสภาพอากาศจริง
  ────────────────────────────────────────────────────────────────────────────
  • ธีมสว่าง: ลำแสงแดดสาดส่องลงมาที่ต้นไม้ (ขยับเบาๆ)
  • ธีมมืด:  ฉากกลางคืน — ท้องฟ้ามืดลง แสงจันทร์ และหิ่งห้อยลอยรอบต้นไม้
  • ฝนตก (Open-Meteo — services/weather.ts): ฝนตกปอยๆ + ท้องฟ้าครึ้ม (แสงแดดหรี่ลง)
  ทั้งหมดเป็น CSS ล้วน ไม่รับคลิก (pointer-events:none) และเคารพ prefers-reduced-motion
  ธีมเลือกด้วย CSS จาก [data-theme] บน <html> — คอมโพเนนต์วาดทั้งสองชั้น CSS แสดงชั้นที่ตรงธีม
\*============================================================================*/

const RAINDROPS = 46
const FIREFLIES = 14
const SUN_RAYS = 5

interface HomeAmbienceProps {
  /** [แก้ตามที่ระบุ] ซ่อนเมื่อเปิดหน้าอื่นทับ (เควส/ร้านค้า/โปรไฟล์ ฯลฯ) — ไม่ให้หมอกมืดไปทับหน้าเหล่านั้น */
  hidden?: boolean
}

export default function HomeAmbience({ hidden = false }: HomeAmbienceProps) {
  const [weather, setWeather] = useState<HomeWeather>('clear')

  useEffect(() => {
    let cancelled = false
    const load = () => { void fetchHomeWeather().then((w) => { if (!cancelled) setWeather(w) }) }
    load()
    const id = window.setInterval(load, WEATHER_CACHE_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [])

  // ตำแหน่ง/จังหวะคงที่ตลอดอายุคอมโพเนนต์ (สุ่มแบบกำหนดได้จาก index)
  const drops = useMemo(() => Array.from({ length: RAINDROPS }, (_, i) => ({
    left: (i * 7.3 + (i % 7) * 2.1) % 100,
    delay: ((i * 0.37) % 2).toFixed(2),
    duration: (0.85 + (i % 5) * 0.12).toFixed(2),
    opacity: 0.35 + (i % 4) * 0.12,
  })), [])
  const flies = useMemo(() => Array.from({ length: FIREFLIES }, (_, i) => ({
    left: 18 + ((i * 23) % 64),
    top: 38 + ((i * 17) % 44),
    delay: ((i * 0.9) % 6).toFixed(1),
    duration: (6 + (i % 4) * 1.5).toFixed(1),
  })), [])

  if (hidden) return null

  return (
    <>
    {/* [แก้ตามที่ระบุ] ธีมมืด: มืดเฉพาะ "พื้นหลัง" (ชั้นนี้อยู่ใต้ต้นไม้/พื้นหญ้า) ไม่เป็นหมอกบังต้นไม้ */}
    <div className="home-ambience-bg" aria-hidden="true">
      <div className="home-ambience-bg__night" />
      <div className="home-ambience__moon-glow" />
    </div>
    <div className={`home-ambience${weather === 'rain' ? ' is-rain' : ''}`} aria-hidden="true">
      {/* ธีมสว่าง: แสงแดดสาดส่องมาที่ต้นไม้ */}
      <div className="home-ambience__day">
        <div className="home-ambience__sun-glow" />
        {Array.from({ length: SUN_RAYS }).map((_, i) => (
          <span key={i} className="home-ambience__ray" style={{ ['--ray-i' as string]: i }} />
        ))}
      </div>

      {/* ธีมมืด: หิ่งห้อยลอยรอบต้นไม้ (ไม่มีชั้นมืดทับแล้ว — ความมืดอยู่ที่พื้นหลังเท่านั้น) */}
      <div className="home-ambience__night">
        {flies.map((f, i) => (
          <span
            key={i}
            className="home-ambience__firefly"
            style={{ left: `${f.left}%`, top: `${f.top}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s` }}
          />
        ))}
      </div>

      {/* ฝนตกปอยๆ ตามสภาพอากาศจริง */}
      {weather === 'rain' && (
        <div className="home-ambience__rain">
          {drops.map((d, i) => (
            <span
              key={i}
              className="home-ambience__drop"
              style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s`, opacity: d.opacity }}
            />
          ))}
        </div>
      )}
    </div>
    </>
  )
}
