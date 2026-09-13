import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MBTI_TREE_THEME, type MbtiType } from '../types'
import { useAppContext } from '../context/AppContext'
import MiniTree from '../components/tree/MiniTree'
import CinematicBackground from '../components/layout/CinematicBackground'
import SoundToggleButton from '../components/layout/SoundToggleButton'

const C_1 = 'rgba(10,30,25,.55)'
const C_2 = 'rgba(10,30,25,.35)'
const C_3 = 'rgba(10,30,25,.7)'
const C_4 = 'rgba(255,255,255,.94)'

const BG_1 = C_1
const BG_2 = C_2
const BG_3 = C_3
const BG_4 = C_4

const MBTI_ORDER: MbtiType[] = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

/**
 * MBTISelect — หน้าเลือกบุคลิกภาพเพื่อกำหนดสายพันธุ์ต้นไม้ (route "/mbti")
 * [ข้อกำหนดข้อ 5] พื้นหลังวิดีโอ hero-waterfall.mp4 เหมือนหน้า Dashboard (ผ่าน
 * CinematicBackground ตัวเดียวกับที่ WelcomeModal/Login ใช้) + เลือกการ์ดแล้วเล่น
 * transition เด้ง/จางหายลื่นไหลก่อนค่อย navigate ไปหน้าถัดไปจริง (ไม่ตัดจบทันที)
 */
export default function MBTISelect() {
  const navigate = useNavigate()
  const { setMbtiType, settings } = useAppContext()
  const [selected, setSelected] = useState<MbtiType | null>(null)

  const handleSelect = (mbti: MbtiType) => {
    if (selected) return // กันดับเบิลคลิกระหว่างที่ transition กำลังเล่นอยู่
    setSelected(mbti)
    setMbtiType(mbti)
    // รอ exit animation ของการ์ดเล่นจบก่อน (ดู .mbti-select-card--chosen ใน <style> ท้ายไฟล์)
    setTimeout(() => navigate('/dashboard'), 480)
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', padding: '48px 20px', overflow: 'hidden' }}>
      <CinematicBackground musicVolume={settings.musicVolume} soundEnabled={settings.soundEnabled} />

      {/* [ใหม่] ปุ่มลำโพงลอยมุมขวาบน — หน้านี้ยังไม่มี NavBar ให้ใช้ */}
      <SoundToggleButton floating />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1,
          background: `linear-gradient(180deg, ${BG_1} 0%, ${BG_2} 40%, ${BG_3} 100%)`,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h1 className="mbti-select-fade-in" style={{ fontFamily: 'Fredoka One', fontSize: 32, color: 'var(--fixed-white)', textShadow: '0 4px 16px var(--glass-b-50)', marginBottom: 8 }}>
          🌳 คุณเป็นคนแบบไหน?
        </h1>
        <p className="mbti-select-fade-in" style={{ color: 'var(--fixed-white)', textShadow: '0 2px 8px var(--glass-b-50)', fontSize: 14, marginBottom: 32, animationDelay: '80ms' }}>
          เลือกบุคลิกภาพ (MBTI) ของคุณ เพื่อกำหนดสายพันธุ์และสีสันของต้นไม้ประจำตัว
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {MBTI_ORDER.map((mbti, i) => {
            const theme = MBTI_TREE_THEME[mbti]
            const isChosen = selected === mbti
            const isFadingOut = selected !== null && selected !== mbti
            return (
              <button
                key={mbti}
                type="button"
                onClick={() => handleSelect(mbti)}
                disabled={!!selected}
                className={`mbti-select-card mbti-select-fade-in ${isChosen ? 'mbti-select-card--chosen' : ''} ${isFadingOut ? 'mbti-select-card--fading' : ''}`}
                style={{
                  background: BG_4,
                  backdropFilter: 'blur(6px)',
                  border: `2px solid ${theme.accent}44`,
                  borderRadius: 20,
                  padding: '18px 12px',
                  cursor: selected ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px var(--glass-b-25)',
                  animationDelay: `${120 + i * 35}ms`,
                  '--card-accent': theme.accent,
                } as React.CSSProperties}
              >
                <MiniTree theme={theme} size={64} />
                <div style={{ fontFamily: 'Fredoka One', fontSize: 16, color: theme.accent }}>{mbti}</div>
                <div style={{ fontSize: 11, color: 'var(--n300)', fontWeight: 600, textAlign: 'center' }}>{theme.treeName}</div>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes mbtiSelectFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mbti-select-fade-in { animation: mbtiSelectFadeIn .5s cubic-bezier(.22,1,.36,1) both; }

        .mbti-select-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .mbti-select-card:not(:disabled):hover {
          transform: translateY(-6px) scale(1.04);
          box-shadow: 0 16px 34px var(--glass-b-32), 0 0 0 3px var(--card-accent);
        }

        @keyframes mbtiSelectChosenPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.18); box-shadow: 0 20px 44px var(--glass-b-40), 0 0 0 4px var(--card-accent); }
          100% { transform: scale(1.1); opacity: 0; }
        }
        .mbti-select-card--chosen { animation: mbtiSelectChosenPop .48s cubic-bezier(.22,1,.36,1) both; z-index: 2; }

        @keyframes mbtiSelectFadeOut { to { opacity: 0; transform: scale(.92); } }
        .mbti-select-card--fading { animation: mbtiSelectFadeOut .35s ease both; }

        @media (prefers-reduced-motion: reduce) {
          .mbti-select-fade-in, .mbti-select-card, .mbti-select-card--chosen, .mbti-select-card--fading {
            animation: none; transition: none;
          }
        }
      `}</style>
    </div>
  )
}