import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MBTI_TREE_THEME, type MbtiType } from '../types'
import { useAppContext } from '../context/AppContext'
import MiniTree from '../components/tree/MiniTree'
import SceneBackground from '../components/layout/SceneBackground'
import SoundToggleButton from '../components/layout/SoundToggleButton'
import { BADGE_ICONS } from '../config/iconAssets'

const MBTI_ORDER: MbtiType[] = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

/**
 * MBTISelect — หน้าเลือกบุคลิกภาพเพื่อกำหนดสายพันธุ์ต้นไม้ (route "/mbti")
 * พื้นหลัง SceneBackground (วิดีโอ + overlay ชุดเดียวกับหน้า Welcome/หน้า auth) + เลือกการ์ดแล้วเล่น
 * transition เด้ง/จางหายลื่นไหลก่อนค่อย navigate ไปหน้าถัดไปจริง (ไม่ตัดจบทันที)
 */
export default function MBTISelect() {
  const navigate = useNavigate()
  const { setMbtiType } = useAppContext()
  const [selected, setSelected] = useState<MbtiType | null>(null)

  const handleSelect = (mbti: MbtiType) => {
    if (selected) return // กันดับเบิลคลิกระหว่างที่ transition กำลังเล่นอยู่
    setSelected(mbti)
    setMbtiType(mbti)
    // [แก้ตามที่ระบุ] ไม่มีเอฟเฟกต์ในหน้านี้แล้ว → ไปหน้าถัดไปทันที
    // แล้วเล่นฉากรับต้นกล้าครั้งแรกที่หน้า Home (PlantIntro.tsx)
    try { sessionStorage.setItem('bloom.plantIntro', '1') } catch { /* ไม่มี storage ก็แค่ข้ามฉาก */ }
    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', padding: '48px 20px', overflow: 'hidden' }}>
      <SceneBackground />

      {/* ปุ่มลำโพงลอยมุมขวาบน */}
      <SoundToggleButton floating />

      {/* [แก้ตามที่ระบุ] ปุ่มกลับ มุมซ้ายบน — ย้อนกลับหน้าก่อนหน้า (ไม่มีประวัติ = กลับหน้าหลัก) */}
      <button
        type="button"
        className="mbti-select-back"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        aria-label="กลับ"
      >
        <img src={BADGE_ICONS.back} alt="" />
        <span>กลับ</span>
      </button>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h1 className="mbti-select-fade-in" style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--fixed-white)', textShadow: '0 4px 16px var(--glass-b-50)', marginBottom: 8 }}>
          คุณเป็นคนแบบไหน?
        </h1>
        <p className="mbti-select-fade-in" style={{ color: 'var(--fixed-white)', textShadow: '0 2px 8px var(--glass-b-50)', fontSize: 14, marginBottom: 32, animationDelay: '80ms' }}>
          เลือกบุคลิกภาพ (MBTI) ของคุณ เพื่อกำหนดสายพันธุ์และสีสันของต้นไม้ประจำตัว
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {MBTI_ORDER.map((mbti) => {
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
                  background: 'var(--glass-w-95)',
                  backdropFilter: 'blur(6px)',
                  border: `2px solid ${theme.accent}44`,
                  borderRadius: 10,
                  padding: '18px 12px',
                  cursor: selected ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 8px 24px var(--glass-b-25)',
                  '--card-accent': theme.accent,
                } as React.CSSProperties}
              >
                <MiniTree theme={theme} size={64} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: theme.accent }}>{mbti}</div>
                <div style={{ fontSize: 11, color: 'var(--n300)', fontWeight: 600, textAlign: 'center' }}>{theme.treeName}</div>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        /* [แก้ตามที่ระบุ] หน้าเลือก MBTI ไม่มีเอฟเฟกต์เคลื่อนไหวใดๆ (ไม่มีจางเข้า/ขยายตอนชี้/เด้งตอนเลือก) */
        .mbti-select-back {
          position: fixed; top: 16px; left: 16px; z-index: 5;
          display: inline-flex; align-items: center; gap: 6px;
          min-height: 44px; padding: 6px 14px 6px 8px; border-radius: 99px; cursor: pointer;
          border: 1.5px solid var(--glass-w-60); background: var(--glass-b-35);
          color: var(--fixed-white); font-family: var(--font-display); font-size: 15px;
        }
        .mbti-select-back img { width: 30px; height: 30px; object-fit: contain; }

        /* โหมดสว่างใช้หน้าตาเดิม — โหมดมืดเท่านั้นที่เป็นการ์ดสีเขียว (ไม่มีขอบเหลือง) */
        [data-theme="dark"] .mbti-select-card {
          background: linear-gradient(180deg, var(--g700) 0%, var(--g800) 100%) !important;
          border: 2px solid var(--g500) !important;
          border-radius: 14px !important;
          box-shadow: 0 4px 0 var(--g900), 0 10px 24px var(--glass-b-30) !important;
        }
        [data-theme="dark"] .mbti-select-card > div { color: var(--fixed-white) !important; }
        [data-theme="dark"] .mbti-select-card > div + div { color: color-mix(in srgb, var(--fixed-white) 78%, transparent) !important; }
      `}</style>
    </div>
  )
}