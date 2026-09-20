import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAppContext } from './AppContext'
import { setUiSoundsMuted } from '../utils/uiSounds'

export type GameSoundType = 'tree-grow' | 'reward-claim' | 'owl-walk'

/**
 * [ตามที่ระบุ] ชื่อไฟล์ที่ต้องวางไว้ที่ public/assets/sounds/ ห้ามเปลี่ยนชื่อ:
 *   bgm-relaxing-forest.mp3  — เพลงพื้นหลังวน loop ตลอด
 *   tree-grow.mp3            — เล่นตอนต้นไม้โตขึ้นระดับ/ได้ growth pulse
 *   reward-claim.mp3         — เล่นตอนรับรางวัล/streak/ซื้อของ
 *   owl-walk .mp3            — เล่นตอนนกฮูก avatar เดินไป node เควสถัดไป (ชื่อไฟล์จริงมีเว้นวรรคก่อนนามสกุล)
 */
const GAME_SOUND_FILES: Record<GameSoundType, string> = {
  'tree-grow': 'tree-grow.mp3',
  'reward-claim': 'reward-claim.mp3',
  'owl-walk': 'owl-walk .mp3',
}
const BGM_PATH = '/assets/sounds/bgm-relaxing-forest.mp3'
const SOUND_BASE_PATH = '/assets/sounds/'

interface AudioContextValue {
  isMuted: boolean
  toggleMute: () => void
  /** [Method 2: ไฟล์เสียงจริง] เล่นเสียงประกอบเหตุการณ์ในเกม — ดูชื่อไฟล์ที่ต้องเตรียมด้านบน */
  playGameSound: (type: GameSoundType) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

/**
 * AudioProvider — [ตามที่ขอ] Global Audio Context ของทั้งแอป
 *
 * [การตัดสินใจสำคัญ] ไม่ได้สร้าง mute state แยกใหม่ต่างหาก — ผูกกับ `settings.soundEnabled`
 * ที่มีอยู่แล้วใน AppContext.tsx (ตัวเดียวกับที่ SettingsModal ใช้ปรับ) เพราะถ้าสร้าง mute
 * state คู่ขนานอีกชุด จะกลายเป็น "แหล่งความจริง" 2 ที่ขัดกันเอง (ปิดเสียงใน SettingsModal
 * แต่ AudioContext ไม่รู้ด้วย) — ทุกอย่างยังทำงานตรงตาม spec ที่ขอ (isMuted, toggleMute,
 * playGameSound) แค่ "อ่าน/เขียน" ผ่าน settings.soundEnabled แทนที่จะเก็บ state ใหม่เอง
 *
 * ต้องอยู่ "ข้างใน" <AppProvider> เท่านั้น (ใช้ useAppContext ข้างใน) — ดูการต่อสายจริงที่ App.tsx
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useAppContext()
  const isMuted = !settings.soundEnabled

  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const gameSoundCache = useRef<Map<string, HTMLAudioElement>>(new Map())
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  // ซิงค์ mute state ให้ uiSounds.ts (Method 1 — เสียงสังเคราะห์) รู้ด้วยทุกครั้งที่เปลี่ยน
  useEffect(() => {
    setUiSoundsMuted(isMuted)
  }, [isMuted])

  // ปรับ volume ของ BGM ตาม settings.musicVolume ทุกครั้งที่เปลี่ยน + pause ทันทีถ้าโดน mute
  useEffect(() => {
    const bgm = bgmRef.current
    if (!bgm) return
    bgm.volume = Math.min(1, Math.max(0, settings.musicVolume / 100))
    if (isMuted) {
      bgm.pause()
    } else if (bgm.paused && !autoplayBlocked) {
      bgm.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.musicVolume, isMuted])

  // [ตามที่ขอ] พยายามเล่น BGM ทันทีตอนโหลดแอป — ถ้าเบราว์เซอร์บล็อก autoplay (นโยบาย
  // มาตรฐานของเบราว์เซอร์สมัยใหม่ที่ต้องมี user gesture ก่อน) ให้ตั้ง listener ฟัง
  // click/touch ครั้งแรกที่ไหนก็ได้ในเอกสาร แล้วค่อยเล่นตอนนั้นแทน
  useEffect(() => {
    const bgm = bgmRef.current
    if (!bgm || isMuted) return
    bgm.play().catch(() => setAutoplayBlocked(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!autoplayBlocked || isMuted) return

    const tryStartOnInteraction = () => {
      bgmRef.current?.play().then(() => {
        setAutoplayBlocked(false)
        document.removeEventListener('click', tryStartOnInteraction)
        document.removeEventListener('touchstart', tryStartOnInteraction)
      }).catch(() => {})
    }

    document.addEventListener('click', tryStartOnInteraction)
    document.addEventListener('touchstart', tryStartOnInteraction)
    return () => {
      document.removeEventListener('click', tryStartOnInteraction)
      document.removeEventListener('touchstart', tryStartOnInteraction)
    }
  }, [autoplayBlocked, isMuted])

  const toggleMute = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled })
  }

  const playGameSound = (type: GameSoundType) => {
    if (isMuted) return
    const fileName = GAME_SOUND_FILES[type]
    try {
      let audio = gameSoundCache.current.get(fileName)
      if (!audio) {
        audio = new Audio(SOUND_BASE_PATH + fileName)
        gameSoundCache.current.set(fileName, audio)
      }
      audio.currentTime = 0
      audio.volume = Math.min(1, Math.max(0, settings.sfxVolume / 100))
      audio.play().catch(() => {
        if (import.meta.env.DEV) {
          console.warn(`[AudioContext] เล่นเสียง "${fileName}" ไม่ได้ — เช็คว่าวางไฟล์ไว้ที่ public/assets/sounds/${fileName} แล้วหรือยัง`)
        }
      })
    } catch {
      // no-op
    }
  }

  return (
    <AudioCtx.Provider value={{ isMuted, toggleMute, playGameSound }}>
      {/* [ตามที่ขอ] BGM element เดียวของทั้งแอป วน loop ตลอด — ไม่ต้อง render ซ้ำที่ไหนอีก */}
      <audio ref={bgmRef} src={BGM_PATH} loop />
      {children}
    </AudioCtx.Provider>
  )
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) {
    throw new Error('useAudio ต้องถูกเรียกใช้ภายใน <AudioProvider> เท่านั้น (ต้องอยู่ข้างใน <AppProvider> ด้วย)')
  }
  return ctx
}