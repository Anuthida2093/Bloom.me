import CinematicBackground from './CinematicBackground'
import { useAppContext } from '../../context/AppContext'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const C_1 = 'rgba(10,30,25,.35)'
const C_2 = 'rgba(10,30,25,.15)'
const C_3 = 'rgba(10,30,25,.45)'

const BG_1 = C_1
const BG_2 = C_2
const BG_3 = C_3

const VIDEO_LANDSCAPE = '/assets/videos/intro/Reframer-Journal_1920x1080.mp4'
const VIDEO_PORTRAIT = '/assets/videos/intro/Reframer-Journal_1080x1920.mp4'

interface SceneBackgroundProps {
  /** ใช้วิดีโอไฟล์นี้ไฟล์เดียวทุกแนวจอ แทนคู่ไฟล์แนวนอน/แนวตั้งค่าเริ่มต้น (เช่น หน้า Login/Register มีวิดีโอของตัวเอง) */
  videoSrc?: string
}

/**
 * SceneBackground — พื้นหลังชุดเดียวของหน้า Welcome + หน้า auth ทั้งหมด (Login/Register/ลืม/ตั้งรหัสผ่านใหม่)
 * ────────────────────────────────────────────────────────────────────────────
 * วิดีโอเต็มจอสลับไฟล์ตามการวางจอ (แนวนอน 1920x1080 / แนวตั้ง 1080x1920) ผ่าน CinematicBackground
 * — หรือไฟล์เดียวที่ส่งมาทาง prop videoSrc (Login/Register มีวิดีโอเฉพาะหน้า)
 * (fallback เป็นฉาก canvas อัตโนมัติถ้าโหลดวิดีโอไม่ได้ + เสียงผูกกับ settings) และ overlay ไล่สีทับ
 * ให้ข้อความอ่านง่าย — รวมไว้ที่เดียว ทุกหน้าจึงได้สูตร overlay เดียวกันเสมอ ไม่ drift แยกกัน
 */
export default function SceneBackground({ videoSrc }: SceneBackgroundProps) {
  const { settings } = useAppContext()
  const isLandscape = useMediaQuery('(orientation: landscape)')

  return (
    <>
      <CinematicBackground
        videoSrc={videoSrc ?? (isLandscape ? VIDEO_LANDSCAPE : VIDEO_PORTRAIT)}
        videoSrcWebm=""
        musicVolume={settings.musicVolume}
        soundEnabled={settings.soundEnabled}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: `linear-gradient(180deg, ${BG_1} 0%, ${BG_2} 35%, ${BG_3} 100%)`,
        }}
      />
    </>
  )
}
