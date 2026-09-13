import { useAudio } from '../../context/AudioContext'

const C_1 = 'rgba(244,196,48,.4)'
const C_2 = 'rgba(244,196,48,.4)'

const BORDER_1 = C_1
const SHADOW_2 = C_2

interface SoundToggleButtonProps {
  /** true = ลอยอยู่มุมขวาบนของจอ (สำหรับหน้า Login/Register/WelcomeModal/MBTISelect ที่ยัง
   *  ไม่มี NavBar) — false = ปุ่มธรรมดาฝังในแถบเมนู (ใช้ใน NavBar.tsx) */
  floating?: boolean
}

/**
 * SoundToggleButton — [ข้อกำหนดข้อ 3-4] ปุ่มลำโพงเปิด/ปิดเสียงกลาง ใช้ซ้ำได้ทุกหน้า
 * อ่าน/สลับ mute ผ่าน useAudio() (ซึ่งผูกกับ settings.soundEnabled ของ AppContext อยู่แล้ว)
 */
export default function SoundToggleButton({ floating = false }: SoundToggleButtonProps) {
  const { isMuted, toggleMute } = useAudio()

  if (floating) {
    return (
      <button
        onClick={toggleMute}
        title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          width: 44, height: 44, borderRadius: 99, border: '1.5px solid var(--glass-w-50)',
          background: 'var(--glass-b-35)', backdropFilter: 'blur(8px)', color: 'var(--fixed-white)',
          fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 16px var(--glass-b-30)', transition: 'transform .15s ease, background .15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'var(--glass-b-50)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--glass-b-35)' }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    )
  }

  return (
    <button
      onClick={toggleMute}
      title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
      style={{
        width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${BORDER_1}`,
        background: 'var(--glass-w-10)', fontSize: 15, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s, box-shadow .15s', flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-w-22)'; e.currentTarget.style.boxShadow= `0 0 10px ${SHADOW_2}` }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass-w-10)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  )
}