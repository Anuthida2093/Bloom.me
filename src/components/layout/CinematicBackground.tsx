import { useRef, useEffect, useState } from 'react'

const SHADOW_1 = 'rgba(255, 244, 214, .8)'
const C_2 = '#FFF3C4'
const C_3 = '#B9C9E8'
const C_4 = '#9FB6DE'
const C_5 = '#4A7C5D'
const C_6 = '#C9BFAE'
const C_7 = '#EAF7FF'
const C_8 = '#DFF3FF'
const BG_9 = '#274b3d'
const BG_10 = '#4a7c63'
const BG_11 = 'rgba(0,0,0,.05)'
const C_12 = '#7EB5D6'
const C_13 = '#FFE9D6'

/**
 * CinematicBackground
 * ────────────────────
 * พื้นหลังฉาก "น้ำตก + พระอาทิตย์" เต็มจอ 2 โหมด:
 *
 *  1) วิดีโอจริง (ถ้ามีไฟล์ที่ videoSrc) — เล่นลูป เงียบ พร้อม Ken Burns pan
 *  2) Fallback ฉากวาดด้วย canvas (ท้องฟ้าไล่สี + พระอาทิตย์เรืองแสง + ภูเขา
 *     พารัลแลกซ์ + น้ำตกไหลแบบมีสายน้ำเคลื่อนไหวจริง) — ใช้อัตโนมัติถ้ายังไม่มี
 *     ไฟล์วิดีโอ หรือไฟล์โหลดไม่สำเร็จ (onError) ไม่ต้องรอไฟล์จริงก่อนถึงจะเห็นผล
 *
 * บวกเลเยอร์ละอองฝุ่นเรืองแสง (มีทั้ง 2 โหมด) และระบบเสียงแวดล้อมเบาๆ
 * (ambient audio) ที่ผูกกับ musicVolume + soundEnabled ของ SettingsModal — เบราว์เซอร์ห้าม
 * เล่นเสียงอัตโนมัติก่อน user โต้ตอบกับหน้าเว็บ จึงต้องรอ click/touch ครั้งแรก
 *
 * [ข้อกำหนดข้อ 3] videoSrc ค่าเริ่มต้นบังคับเป็น "hero-waterfall.mp4" (ไฟล์เดียวกับที่
 * WelcomeModal.tsx ใช้เป็นภาพนิ่ง hero-waterfall.jpg) — ถ้าโหลดไฟล์นี้ไม่สำเร็จ (onError)
 * ค่อย fallback ไปที่ฉาก canvas วาดเอง (ของเดิมมีอยู่แล้ว ไม่ต้องแก้ตรรกะ fallback)
 * ส่วนเสียง (ทั้งเสียงแวดล้อมและเสียงของวิดีโอเอง ถ้าไฟล์มี audio track) คูณด้วย 0
 * ทันทีเมื่อ soundEnabled=false จาก SettingsModal ไม่ว่า musicVolume จะตั้งไว้เท่าไหร่
 *
 * หมายเหตุ: ทั้งไฟล์วิดีโอ (videoSrc) และไฟล์เสียง (musicSrc) ต้องเป็นไฟล์ที่
 * คุณมีสิทธิ์ใช้งานจริง (ถ่าย/แต่งเอง หรือมี license) — component นี้แค่เล่น
 * ไฟล์ที่มีอยู่ ไม่ได้ generate เนื้อหาใดๆ เอง
 */

interface DustParticle {
  x: number
  y: number
  r: number
  speedY: number
  driftX: number
  phase: number
  alphaBase: number
}

interface CinematicBackgroundProps {
  videoSrc?: string
  videoSrcWebm?: string
  musicSrc?: string
  musicVolume?: number // 0-100 จาก SettingsModal (state.musicVolume)
  /** ปุ่มเปิด/ปิดเสียงหลักจาก SettingsModal — false = ปิดเสียงวิดีโอ+เสียงแวดล้อมทั้งหมด */
  soundEnabled?: boolean
  dustParticles?: boolean
}

export default function CinematicBackground({
  videoSrc = '/assets/videos/intro/hero-waterfall.mp4',
  videoSrcWebm = '',
  musicSrc = '/assets/ambient-waterfall.mp3',
  musicVolume = 60,
  soundEnabled = true,
  dustParticles = true,
}: CinematicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const particlesRef = useRef<DustParticle[]>([])
  const fallbackRafRef = useRef<number>(0)
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [videoFailed, setVideoFailed] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)

  // videoSrc เปลี่ยนได้ระหว่างใช้งาน (WelcomeModal สลับไฟล์ตามการหมุนจอ) — ให้ไฟล์ใหม่ได้ลองโหลด
  // อีกครั้งแม้ไฟล์ก่อนหน้าจะล้มเหลวไปแล้ว (ปรับ state ระหว่าง render แพทเทิร์นเดียวกับ useMediaQuery)
  const [prevVideoSrc, setPrevVideoSrc] = useState(videoSrc)
  if (videoSrc !== prevVideoSrc) {
    setPrevVideoSrc(videoSrc)
    setVideoFailed(false)
  }

  /* ── ละอองฝุ่นเรืองแสง (ใช้ได้ทั้ง 2 โหมด) ── */
  useEffect(() => {
    if (!dustParticles) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      const count = Math.round((canvas.width * canvas.height) / 18000)
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 1 + Math.random() * 2.5,
        speedY: -(0.15 + Math.random() * 0.35),
        driftX: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        alphaBase: 0.25 + Math.random() * 0.45,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const loop = () => {
      t += 0.016
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current.forEach((p) => {
        p.y += p.speedY
        p.x += p.driftX + Math.sin(t + p.phase) * 0.15
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width }
        const twinkle = 0.6 + 0.4 * Math.sin(t * 1.5 + p.phase)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 244, 214, ${p.alphaBase * twinkle})`
        ctx.shadowColor = SHADOW_1
        ctx.shadowBlur = 6
        ctx.fill()
      })
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current) }
  }, [dustParticles])

  /* ── Fallback scene: ท้องฟ้า + พระอาทิตย์ + ภูเขา + น้ำตกไหล (canvas 2D) ── */
  useEffect(() => {
    if (!videoFailed) return
    const canvas = fallbackCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const loop = () => {
      t += 0.016
      const w = canvas.width, h = canvas.height
      const horizonY = h * 0.6

      // ท้องฟ้าไล่สี
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY)
      sky.addColorStop(0, C_12)
      sky.addColorStop(1, C_13)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, horizonY)

      // พระอาทิตย์ + เรืองแสงหลายชั้น
      const sunX = w * 0.76, sunY = h * 0.22
      for (let i = 5; i >= 0; i--) {
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, 244, 214, ${0.05 + (5 - i) * 0.01})`
        ctx.arc(sunX, sunY, w * (0.05 + i * 0.028), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath(); ctx.fillStyle = C_2; ctx.arc(sunX, sunY, w * 0.045, 0, Math.PI * 2); ctx.fill()

      // ภูเขาพารัลแลกซ์ 2 ชั้น
      ;[{ c: C_3, base: horizonY - h * 0.02, amp: h * 0.06 }, { c: C_4, base: horizonY + h * 0.01, amp: h * 0.045 }].forEach((layer, li) => {
        ctx.beginPath(); ctx.fillStyle = layer.c
        ctx.moveTo(0, horizonY + 4)
        for (let x = 0; x <= w; x += w / 24) {
          const y = layer.base - Math.sin((x / w) * Math.PI * (1.6 + li) + t * 0.02) * layer.amp
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, horizonY + 4); ctx.closePath(); ctx.fill()
      })

      // พื้นป่า/หญ้าโทนเขียวใต้แนวภูเขา
      ctx.fillStyle = C_5
      ctx.fillRect(0, horizonY, w, h - horizonY)

      // น้ำตก: ลำธารนิ่ง + สายน้ำเคลื่อนไหวไล่ลง
      const fx = w * 0.5, fw = w * 0.1, topY = h * 0.08, botY = horizonY + 10
      ctx.fillStyle = C_6
      ctx.fillRect(fx - fw * 0.85, topY, fw * 0.4, botY - topY)
      ctx.fillRect(fx + fw * 0.45, topY, fw * 0.4, botY - topY)
      ctx.save()
      ctx.beginPath(); ctx.rect(fx - fw / 2, topY, fw, botY - topY); ctx.clip()
      ctx.fillStyle = C_7
      ctx.fillRect(fx - fw / 2, topY, fw, botY - topY)
      for (let i = 0; i < 8; i++) {
        const sx = fx - fw / 2 + (i / 7) * fw
        const speed = 260 + (i % 3) * 50
        const offset = ((t * speed + i * 41) % (botY - topY + 50)) - 25
        ctx.strokeStyle = 'var(--glass-w-85)'
        ctx.lineWidth = 2 + (i % 2)
        ctx.beginPath(); ctx.moveTo(sx, topY + offset); ctx.lineTo(sx + (i % 2 ? 3 : -3), topY + offset + 28); ctx.stroke()
      }
      ctx.restore()
      // แอ่งน้ำ + ระลอก
      ctx.fillStyle = C_8
      ctx.beginPath(); ctx.ellipse(fx, botY + 8, fw * 1.1, 12, 0, 0, Math.PI * 2); ctx.fill()

      fallbackRafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(fallbackRafRef.current) }
  }, [videoFailed])

  /* ── เสียงแวดล้อม: เล่นได้ก็ต่อเมื่อ user โต้ตอบหน้าเว็บครั้งแรก (นโยบายเบราว์เซอร์) ──
     ปลดล็อกเสียงได้ก็ต่อเมื่อ soundEnabled=true เท่านั้น (ถ้าผู้ใช้ปิดเสียงไว้ตั้งแต่แรก
     ไม่ต้อง unlock อะไรเลย รอจนกว่าจะเปิดเสียงใน SettingsModal แล้วค่อย unlock รอบถัดไป) */
  useEffect(() => {
    if (!soundEnabled) return
    const enableAudio = () => {
      if (audioRef.current && !audioEnabled) {
        audioRef.current.play().then(() => setAudioEnabled(true)).catch(() => {})
      }
      // วิดีโอเองก็ปลดล็อกเสียง (ถ้าไฟล์มี audio track) พร้อมกันในจังหวะเดียวกัน
      if (videoRef.current) {
        videoRef.current.muted = false
      }
    }
    window.addEventListener('click', enableAudio, { once: true })
    window.addEventListener('touchstart', enableAudio, { once: true })
    return () => {
      window.removeEventListener('click', enableAudio)
      window.removeEventListener('touchstart', enableAudio)
    }
  }, [audioEnabled, soundEnabled])

  // [ข้อกำหนดข้อ 3] เชื่อมระบบเสียงของพื้นหลัง (ambient audio + วิดีโอ) เข้ากับ
  // soundEnabled จาก SettingsModal โดยตรง — ปิดเสียงคือปิดจริง ไม่ใช่แค่ volume ต่ำ
  useEffect(() => {
    const effectiveVolume = soundEnabled ? Math.min(1, Math.max(0, musicVolume / 100)) * 0.5 : 0 // เบาไว้ก่อนเสมอ (แวดล้อม ไม่ใช่เพลงหลัก)
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume
      if (!soundEnabled) {
        audioRef.current.pause()
      } else if (audioEnabled) {
        audioRef.current.play().catch(() => {})
      }
    }
    if (videoRef.current) {
      videoRef.current.muted = !soundEnabled || !audioEnabled
      videoRef.current.volume = effectiveVolume
    }
  }, [musicVolume, soundEnabled, audioEnabled, videoSrc]) // videoSrc: <video> ถูก remount ใหม่ ต้องตั้งเสียงซ้ำ

  // [ข้อกำหนดข้อ 5: Performance] หยุดเล่นวิดีโอ/เสียงแวดล้อมตอนสลับไปแท็บอื่น (tab ไม่ active)
  // — <video>/<audio> ไม่หยุดเล่นเองอัตโนมัติตอนแท็บถูกซ่อน (ต่างจาก requestAnimationFrame
  // ที่เบราว์เซอร์ throttle ให้อัตโนมัติอยู่แล้ว) ทำให้ video decode ทำงานสิ้นเปลือง
  // CPU/แบตเตอรี่ต่อไปเรื่อยๆ ทั้งที่มองไม่เห็นจอ — ใช้ Page Visibility API จับจังหวะ
  // สลับแท็บ แล้วสั่ง pause/play ตรงๆ กลับมาเล่นต่อเฉพาะตอนเปิดเสียงไว้อยู่แล้วเท่านั้น
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause()
        audioRef.current?.pause()
      } else {
        videoRef.current?.play().catch(() => {})
        if (soundEnabled && audioEnabled) {
          audioRef.current?.play().catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [soundEnabled, audioEnabled])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: `linear-gradient(160deg,${BG_9},${BG_10})` }}>
      {!videoFailed && (
        <video
          // key ผูกกับ videoSrc — เปลี่ยน <source> อย่างเดียวเบราว์เซอร์ไม่โหลดไฟล์ใหม่ ต้อง remount <video>
          key={videoSrc}
          ref={videoRef}
          autoPlay muted loop playsInline
          onError={() => setVideoFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', animation: 'cinematicPan 40s ease-in-out infinite alternate' }}
        >
          {/* error ของไฟล์ที่หาไม่เจอยิงที่ <source> ไม่ใช่ <video> (onError ของ <video> ด้านบนจับแค่ error
              ตอนถอดรหัส) — ต้องดักที่ <source> ตัวสุดท้าย ไม่งั้นฉาก canvas สำรองไม่เคยได้แสดงเลย */}
          <source src={videoSrc} type="video/mp4" onError={videoSrcWebm ? undefined : () => setVideoFailed(true)} />
          {videoSrcWebm && <source src={videoSrcWebm} type="video/webm" onError={() => setVideoFailed(true)} />}
        </video>
      )}

      {videoFailed && (
        <canvas
          ref={fallbackCanvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'cinematicPan 40s ease-in-out infinite alternate' }}
        />
      )}

      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, var(--glass-b-8) 0%, ${BG_11} 50%, var(--glass-b-35) 100%)` }} />

      {dustParticles && (
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      )}

      {/* เสียงแวดล้อมเบาๆ — เล่นลูป ระดับเสียงผูกกับ musicVolume + soundEnabled จาก SettingsModal */}
      <audio ref={audioRef} src={musicSrc} loop />

      <style>{`
        @keyframes cinematicPan {
          0%   { transform: scale(1.06) translate(0%, 0%); }
          100% { transform: scale(1.16) translate(-2%, -1.2%); }
        }
      `}</style>
    </div>
  )
}