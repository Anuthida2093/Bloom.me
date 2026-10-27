import { useEffect, useRef, useState } from 'react'
import { WIND_PRESETS, type HomeSceneSpec, type SceneWeather } from '../../../config/homeScenes'
import { usePrefersReducedMotion, useIsLowPowerMode } from '../../../hooks/useMediaQuery'
import { generateHomeScene } from './generateHomeScene'
import { paintStatic, type StaticLayers } from './paintHomeScene'
import { composeFrame, createFrameState } from './composeHomeScene'
import type { WindParams } from './wind'
import type { MbtiType } from '../../../types'
import { speciesOf } from '../../tree/procedural/species'

/*============================================================================*\
  HomeSceneRenderer — ฉากพื้นหลังหน้า Home ที่วาดด้วยโค้ด (ฉาก 3-5)
  ────────────────────────────────────────────────────────────────────────────
  • แสดงพื้นไล่สีของฟ้าทันที (ไม่เคยจอว่าง) → วาดชั้นนิ่งตอนเครื่องว่าง → เริ่มแอนิเมชัน
  • หยุดเมื่อซ่อนแท็บ · จำกัด 30 fps บนเครื่องประหยัดพลังงาน · dpr ไม่เกิน 2 (ประหยัดพลังงาน 1.5)
  • prefers-reduced-motion หรือ animate=false → วาดเฟรมนิ่งเฟรมเดียว (หญ้าเอนนิดเดียว ไม่มีกลีบร่วง/สายน้ำวิ่ง)
  • pointer-events: none · อยู่ใต้ UI ทุกชั้น (ผู้ใช้วางเองตาม z-index ของหน้า)
\*============================================================================*/

export interface HomeSceneStats { buildMs: number; firstFrameMs: number; frameMs: number; fps: number; bytes: number; dpr: number }

interface Props {
  spec: HomeSceneSpec
  weather?: SceneWeather
  /** ทับความแรงลมของสภาพอากาศ (0-1.5) */
  windStrength?: number
  windDirection?: 1 | -1
  pan?: number
  /** ค่าเลื่อนฉากที่เปลี่ยนบ่อย (ลากต้นไม้) — อ่านทุกเฟรมโดยไม่ต้อง re-render (มีแล้วใช้แทน pan) */
  panRef?: { readonly current: number }
  /** false = ภาพนิ่ง (ตั้งค่าในแอป/เทสต์ screenshot) */
  animate?: boolean
  /** เวลาคงที่สำหรับเทสต์ (วินาที) — ใส่แล้ววาดเฟรมเดียวที่เวลานี้ */
  frozenT?: number
  className?: string
  onStats?: (s: HomeSceneStats) => void
  /** [ใหม่] MBTI ของผู้เล่น — ต้นไม้ไกลในฉาก 3 (ทุ่งหญ้าน้ำตก) เป็นสายพันธุ์/สีเดียวกับต้นของผู้เล่น */
  mbti?: MbtiType | null
}

const idle = (fn: () => void) => {
  if (typeof requestIdleCallback === 'function') { const id = requestIdleCallback(fn, { timeout: 60 }); return () => cancelIdleCallback(id) }
  const id = window.setTimeout(fn, 0); return () => window.clearTimeout(id)
}

export default function HomeSceneRenderer({ spec, weather = 'clear', windStrength, windDirection = 1, pan = 0, panRef, animate = true, frozenT, className, onStats, mbti = null }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [layers, setLayers] = useState<{ key: string; S: StaticLayers; L: ReturnType<typeof generateHomeScene> } | null>(null)
  const reduced = usePrefersReducedMotion()
  const lowPower = useIsLowPowerMode()
  const live = useRef({ weather, windStrength, windDirection, pan, panRef, onStats })
  const buildRef = useRef(0)
  const startRef = useRef(0)
  useEffect(() => { live.current = { weather, windStrength, windDirection, pan, panRef, onStats } })

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: Math.max(1, Math.round(el.clientWidth)), h: Math.max(1, Math.round(el.clientHeight)) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ชั้นนิ่ง: สร้างใหม่เมื่อขนาดจอ/ฉากเปลี่ยนเท่านั้น
  const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, lowPower ? 1.5 : 2)
  const key = size ? `${spec.id}:${size.w}x${size.h}@${dpr}:${mbti ?? '-'}` : null
  useEffect(() => {
    if (!size || !key) return
    return idle(() => {
      const t0 = performance.now()
      const L = generateHomeScene(spec, size.w, size.h)
      const S = paintStatic(L, spec.palette, dpr, (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }, speciesOf(mbti))
      setLayers({ key, S, L })
      buildRef.current = performance.now() - t0
      startRef.current = t0
    })
  }, [key, size, spec, dpr, mbti])

  const still = reduced || !animate || frozenT !== undefined
  // ภาพนิ่ง: เปลี่ยนอากาศ/ลม/เลื่อนฉาก → วาดเฟรมใหม่
  const stillKey = still ? `${weather}:${windStrength}:${windDirection}:${pan}` : ''
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx || !layers || layers.key !== key) return
    const { S, L } = layers
    cv.width = Math.round(L.w * S.dpr); cv.height = Math.round(L.h * S.dpr)
    const st = createFrameState(L)
    const windOf = (): WindParams => {
      const p = WIND_PRESETS[live.current.weather]
      return { strength: live.current.windStrength ?? p.strength, gustSpeed: p.gustSpeed, direction: live.current.windDirection }
    }
    const frame = (t: number, dt: number) => composeFrame(ctx, S, L, spec.palette, { t, dt, pan: live.current.panRef?.current ?? live.current.pan, weather: live.current.weather, wind: windOf(), reducedMotion: reduced }, st)
    const tf = performance.now()
    frame(frozenT ?? 0, 0)
    const firstFrameMs = performance.now() - startRef.current
    const report = (frameMs: number, fps: number) => live.current.onStats?.({ buildMs: buildRef.current, firstFrameMs, frameMs, fps, bytes: S.bytes, dpr: S.dpr })
    report(performance.now() - tf, 0)
    if (still) return

    const minGap = lowPower ? 1000 / 30 - 2 : 0
    let raf = 0, last = performance.now(), lastDraw = 0, acc = 0, n = 0, fpsT = last, frames = 0
    const t0 = last
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (document.hidden || now - lastDraw < minGap) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now; lastDraw = now
      const s = performance.now()
      frame((now - t0) / 1000, dt)
      acc += performance.now() - s; n++; frames++
      if (now - fpsT > 1000) { report(acc / n, (frames * 1000) / (now - fpsT)); acc = 0; n = 0; frames = 0; fpsT = now }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [layers, key, still, stillKey, reduced, lowPower, frozenT, spec.palette])

  const P = spec.palette
  return (
    <div
      ref={boxRef}
      className={className}
      aria-hidden="true"
      data-scene={spec.id}
      data-ready={layers?.key === key ? '1' : '0'}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: `linear-gradient(180deg, ${P.sky[0]} 0%, ${P.sky[2]} 55%, ${P.ground[0]} 62%, ${P.ground[1]} 100%)` }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
