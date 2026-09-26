import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useAppContext } from '../../../context/AppContext'
import { playSfx, startLoopingSfx, stopLoopingSfx } from '../../../utils/audioPlayer'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import './IncineratorPage.css'
import { BADGE_ICONS } from '../../../config/iconAssets'

type Stage = 'ask' | 'write' | 'reading' | 'crumpling' | 'drag' | 'burning' | 'done'

interface IncineratorPageProps {
  onComplete: () => void
  onFail: () => void
  onClose: () => void
}

// Preset ขยะความคิดสำหรับคนสมองล้า (Cognitive Load สูง)
const PRESET_THOUGHTS = [
  '⚡ ฉันมันแย่ ไม่ดีพอ',
  '😮‍💨 เหนื่อยกับทุกอย่างจัง',
  '😰 กลัวทำพลาด / กลัวอนาคต',
  '💭 แบกความคาดหวังไม่ไหว'
]

// ข้อความตอกย้ำทางจิตวิทยา (CBT & Externalization Affirmations)
const AFFIRMATIONS = [
  'ความคิดลบไม่ใช่ตัวตนของคุณ มันได้มอดไหม้ไปแล้ว',
  'คุณได้แยกความเครียดออกจากจิตใจเรียบร้อยแล้ว',
  'ปล่อยวางเรื่องที่ควบคุมไม่ได้ แล้วกลับมาอยู่กับปัจจุบัน',
  'ภาระในหัวเบาลงแล้ว คุณเก่งมากที่กล้าปลดปล่อยมัน'
]

const CONFIG_LANDSCAPE = {
  video: { width: 1920, height: 1080 },
  fire: { fx: 0.5, fy: 0.65, fw: 0.2, fh: 0.3 },
  src: '/assets/videos/quest-mental/incinerator-bg-browser_1920x1080.mp4'
}

const CONFIG_PORTRAIT = {
  video: { width: 1080, height: 1920 },
  fire: { fx: 0.5, fy: 0.70, fw: 0.4, fh: 0.25 },
  src: '/assets/videos/quest-mental/incinerator-bg-browser_1080x1920.mp4'
}

interface MappedRect { leftPct: number; topPct: number; widthPct: number; heightPct: number }

function computeContainMappedRect(
  containerW: number, 
  containerH: number, 
  videoNative: { width: number, height: number }, 
  fireSource: { fx: number, fy: number, fw: number, fh: number }
): MappedRect {
  if (containerW <= 0 || containerH <= 0) return { leftPct: 50, topPct: 60, widthPct: 26, heightPct: 30 }
  
  const scale = Math.min(containerW / videoNative.width, containerH / videoNative.height)
  const renderedW = videoNative.width * scale
  const renderedH = videoNative.height * scale
  const offsetX = (containerW - renderedW) / 2
  const offsetY = (containerH - renderedH) / 2

  const centerX = offsetX + fireSource.fx * renderedW
  const centerY = offsetY + fireSource.fy * renderedH
  const widthPx = fireSource.fw * renderedW
  const heightPx = fireSource.fh * renderedH

  return {
    leftPct: (centerX / containerW) * 100,
    topPct: (centerY / containerH) * 100,
    widthPct: (widthPx / containerW) * 100,
    heightPct: (heightPx / containerH) * 100,
  }
}

export default function IncineratorPage({ onComplete, onFail, onClose }: IncineratorPageProps) {
  useLockBodyScroll()

  const { settings } = useAppContext()
  // [แก้] ตรึง identity ของ sfxOpts ด้วย useMemo — เดิมสร้าง object ใหม่ทุก render ทำให้ต้อง
  // ตัด sfxOpts ออกจาก dependency ของ effect ด้านล่าง (เสี่ยง stale closure ถ้าตั้งค่าเสียงเปลี่ยน
  // ระหว่างเล่น) ตอนนี้ใส่กลับเป็น dependency ได้ตรงๆ โดยไม่ทำให้ effect รีรันทุก render
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  const [stage, setStage] = useState<Stage>('ask')
  const [text, setText] = useState('')
  const [selectedAffirmation, setSelectedAffirmation] = useState('')
  
  const succeededRef = useRef(false)
  const completedCalledRef = useRef(false)
  const burnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)
  
  const [isOverFire, setIsOverFire] = useState(false)
  // [แก้] สุ่มระยะ/เวลาของประกายไฟไว้ล่วงหน้าตอนสร้าง spark (ใน event handler) แทนการเรียก
  // Math.random() ตรงๆ ใน JSX ระหว่าง render (react-hooks/purity)
  const [sparks, setSparks] = useState<{ id: number; dx: number; dy: number; duration: number }[]>([])
  const [fireRect, setFireRect] = useState<MappedRect>({ leftPct: 50, topPct: 60, widthPct: 26, heightPct: 30 })

  const [isMobile, setIsMobile] = useState(false)
  const activeConfig = isMobile ? CONFIG_PORTRAIT : CONFIG_LANDSCAPE

  // ฟังก์ชันส่งสัญญาณสำเร็จไปยัง Context/Dashboard
  const triggerCompletion = () => {
    if (!completedCalledRef.current) {
      completedCalledRef.current = true
      succeededRef.current = true
      onComplete()
    }
  }

  const requestClose = () => {
    if (succeededRef.current) {
      triggerCompletion()
    } else {
      onFail()
    }
    onClose()
  }

  useEscapeKey(requestClose)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (burnTimerRef.current) clearTimeout(burnTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    const el = videoContainerRef.current
    if (!el) return
    const update = () => setFireRect(computeContainMappedRect(el.clientWidth, el.clientHeight, activeConfig.video, activeConfig.fire))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [stage, activeConfig])

  useEffect(() => {
    if (['reading', 'crumpling', 'write', 'drag', 'burning'].includes(stage)) {
      startLoopingSfx('FIRE_CRACKLE', { ...sfxOpts, volume: (sfxOpts.volume ?? 70) * 0.4 })
    }
    return () => stopLoopingSfx('FIRE_CRACKLE')
  }, [stage, sfxOpts])

  useEffect(() => {
    if (stage === 'reading') {
      const timer = setTimeout(() => {
        playSfx('PAPER_CRUMPLE', sfxOpts)
        setStage('crumpling')
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [stage, sfxOpts])

  const handleCrumple = (selectedText?: string) => {
    const targetText = selectedText || text
    if (!targetText.trim()) return
    if (selectedText) setText(selectedText)
    setStage('reading')
  }

  const getFireScreenRect = (): DOMRect | null => {
    const container = videoContainerRef.current?.getBoundingClientRect()
    if (!container) return null
    const left = container.left + (fireRect.leftPct - fireRect.widthPct / 2) / 100 * container.width
    const top = container.top + (fireRect.topPct - fireRect.heightPct / 2) / 100 * container.height
    const width = (fireRect.widthPct / 100) * container.width
    const height = (fireRect.heightPct / 100) * container.height
    return new DOMRect(left, top, width, height)
  }

  const isPointInRect = (x: number, y: number, rect: DOMRect) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

  const handleDrag = (_e: unknown, info: PanInfo) => {
    const rect = getFireScreenRect()
    if (!rect) return
    setIsOverFire(isPointInRect(info.point.x, info.point.y, rect))
  }

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const rect = getFireScreenRect()
    if (!rect) return
    const dropped = isPointInRect(info.point.x, info.point.y, rect)
    if (dropped) {
      playSfx('FIRE_BURN', sfxOpts)
      setSparks(Array.from({ length: 24 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 180,
        dy: -80 - Math.random() * 120,
        duration: 0.9 + Math.random() * 0.6,
      })))
      
      const randomAffirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]
      setSelectedAffirmation(randomAffirmation)
      
      setStage('burning')
      
      if (burnTimerRef.current) clearTimeout(burnTimerRef.current)
      burnTimerRef.current = setTimeout(() => {
        triggerCompletion()
        setStage('done')
      }, 2000)
    }
    setIsOverFire(false)
  }

  const handleClaimReward = () => {
    playSfx('SPARKLE_CHIME', sfxOpts)
    triggerCompletion()
    onClose()
  }

  return (
    <div className="incinerator-frame">
      <div className="incinerator-frame__ambient-bg" />
      <button onClick={requestClose} title="ปิด" className="incinerator-frame__close"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>

      <AnimatePresence mode="wait">
        {stage === 'ask' && (
          <motion.div
            key="ask"
            className="incinerator-frame__ask-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="incinerator-frame__icon-lg">🔥</div>
            <h2 className="incinerator-frame__title">วันนี้มีเรื่องอะไรหนักใจไหม?</h2>
            <p className="incinerator-frame__desc">หยิบมันออกมาจากหัว แล้วสลักลงบนแผ่นหินเพื่อนำไปเผาทำลายทิ้งกัน</p>
            <div className="incinerator-frame__btn-row">
              <button className="incinerator-action-btn incinerator-action-btn--ghost" onClick={requestClose}>
                ยังไม่มี
              </button>
              <button className="incinerator-action-btn incinerator-action-btn--primary" onClick={() => setStage('write')}>
                ปลดปล่อยความคิด
              </button>
            </div>
          </motion.div>
        )}

        {(['write', 'reading', 'crumpling', 'drag', 'burning'].includes(stage)) && (
          <motion.div key="game" className="incinerator-frame__game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div ref={videoContainerRef} className="incinerator-video-container">
              <video key={activeConfig.src} className="incinerator-video-container__video" autoPlay loop muted playsInline>
                <source src={activeConfig.src} type="video/mp4" />
              </video>

              <div
                className={[
                  'incinerator-frame__fire-glow',
                  isOverFire && 'incinerator-frame__fire-glow--hot',
                  stage === 'burning' && 'incinerator-frame__fire-glow--burning',
                ].filter(Boolean).join(' ')}
                style={{ left: `${fireRect.leftPct}%`, top: `${fireRect.topPct}%`, width: `${fireRect.widthPct}%`, height: `${fireRect.heightPct}%` }}
              />

              {stage === 'burning' && sparks.map((s) => (
                <motion.span
                  key={s.id}
                  className="incinerator-frame__spark"
                  style={{ left: `${fireRect.leftPct}%`, top: `${fireRect.topPct}%` }}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 0, x: s.dx, y: s.dy, scale: 0.2 }}
                  transition={{ duration: s.duration, ease: 'easeOut' }}
                />
              ))}

              <div
                className="incinerator-frame__drop-hint"
                style={{
                  left: `${fireRect.leftPct}%`, top: `${fireRect.topPct}%`,
                  width: `${fireRect.widthPct}%`, height: `${fireRect.heightPct}%`,
                  opacity: stage === 'drag' ? 1 : 0,
                }}
              />

              {stage === 'burning' && (
                <motion.div className="incinerator-frame__affirmation-banner" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="incinerator-frame__affirmation-title">🔥 สลายความคิดลบสำเร็จ</p>
                  <p className="incinerator-frame__affirmation-sub">{selectedAffirmation}</p>
                </motion.div>
              )}

              {(stage === 'reading' || stage === 'crumpling') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, width: 260, height: 320, borderRadius: 16, x: '-50%', y: '-50%' }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    width: stage === 'crumpling' ? 68 : 260, 
                    height: stage === 'crumpling' ? 68 : 320, 
                    borderRadius: stage === 'crumpling' ? 34 : 16, 
                    rotate: stage === 'crumpling' ? 720 : 0, 
                    x: '-50%', 
                    y: '-50%' 
                  }}
                  transition={{
                    duration: stage === 'crumpling' ? 0.8 : 0.5,
                    ease: "easeInOut"
                  }}
                  onAnimationComplete={() => {
                    if (stage === 'crumpling') setStage('drag')
                  }}
                  className="incinerator-frame__thought-stone"
                >
                  <motion.p
                    initial={{ opacity: 1 }}
                    animate={{ opacity: stage === 'crumpling' ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="incinerator-frame__thought-text"
                  >
                    "{text}"
                  </motion.p>
                </motion.div>
              )}

              {stage === 'drag' && (
                <motion.div
                  className="incinerator-frame__paper"
                  drag
                  dragConstraints={videoContainerRef}
                  dragElastic={0.4}
                  dragSnapToOrigin
                  whileDrag={{ scale: 1.2, rotate: 12, zIndex: 30 }}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
                  animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                >
                  🪨
                </motion.div>
              )}
            </div>

            {stage === 'write' && (
              <motion.div className="incinerator-frame__input-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="incinerator-chips-group">
                  <span className="incinerator-chips-label">💡 คำพูดติดในหัวของคุณบ่อยๆ:</span>
                  <div className="incinerator-chips-list">
                    {PRESET_THOUGHTS.map((chipText) => (
                      <button key={chipText} className="incinerator-chip" onClick={() => handleCrumple(chipText)}>
                        {chipText}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="incinerator-frame__input-bar">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="หรือพิมพ์เรื่องที่อยากดึงออกจากหัว..."
                    className="incinerator-frame__input"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCrumple() }}
                  />
                  <button className="incinerator-action-btn incinerator-action-btn--input" onClick={() => handleCrumple()} disabled={!text.trim()}>
                    🪨 เปลี่ยนเป็นหิน
                  </button>
                </div>
              </motion.div>
            )}
            
            {stage === 'reading' && <p className="incinerator-frame__hint-below">กำลังมองความคิดนี้จากมุมมองภายนอก...</p>}
            {stage === 'crumpling' && <p className="incinerator-frame__hint-below">กำลังอัดแน่นขยะความคิดลงก้อนหิน...</p>}
            {stage === 'drag' && <p className="incinerator-frame__hint-below">👆 ลากก้อนหินความคิดลงกองไฟเพื่อทำลายทิ้ง</p>}
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" className="incinerator-frame__ask-panel" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="incinerator-frame__icon-md">✨</div>
            <h2 className="incinerator-frame__title">ทำลายขยะความคิดสำเร็จ!</h2>
            <p className="incinerator-frame__desc">{selectedAffirmation}</p>
            <button
              className="incinerator-action-btn incinerator-action-btn--primary incinerator-frame__claim-btn"
              onClick={handleClaimReward}
            >
              🌟 รับพลังใจ & ปล่อยวาง
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}