import { useNavigate } from 'react-router-dom'
import CinematicBackground from '../layout/CinematicBackground'
import { useAppContext } from '../../context/AppContext'
import SoundToggleButton from '../layout/SoundToggleButton'
import { BADGE_ICONS } from '../../config/iconAssets'

const C_1 = 'rgba(10,30,25,.35)'
const C_2 = 'rgba(10,30,25,.15)'
const C_3 = 'rgba(10,30,25,.45)'
const C_4 = 'rgba(45,106,79,.45)'
const C_5 = 'rgba(116,198,157,.12)'
const C_6 = 'rgba(116,198,157,.22)'
const C_7 = 'rgba(116,198,157,.12)'

const BG_1 = C_1
const BG_2 = C_2
const BG_3 = C_3
const SHADOW_4 = C_4
const BG_5 = C_5
const BG_6 = C_6
const BG_7 = C_7

/**
 * WelcomeModal — หน้าหลัก (Main / Landing Page, route "/")
 * ----------------------------------------------
 * [ข้อกำหนดข้อ 6] พื้นหลังเปลี่ยนจากภาพนิ่ง + Ken Burns มาเป็นวิดีโออนิเมชันจริง
 * (CinematicBackground — วิดีโอ hero-waterfall.mp4 เป็น source หลัก, เสียงผูกกับ
 * soundEnabled/musicVolume จาก SettingsModal เหมือนที่ใช้ในหน้า Login/Register)
 * และ "ลบตัวต้นไม้ออก" ตามที่ขอ — ไม่มี TreeOfLife ในหน้านี้แล้ว
 *
 * [ข้อกำหนดข้อ 1] แยกปุ่มเป็น 2 ปุ่มชัดเจน:
 *  - "เข้าสู่ระบบ"   → /login    (กรอกแค่ username + password)
 *  - "สมัครสมาชิก"   → /register (กรอก email/username/password/birthDate/height/weight)
 */
export default function WelcomeModal() {
  const navigate = useNavigate()
  const { settings } = useAppContext()

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* ── พื้นหลังวิดีโออนิเมชันเต็มจอ (แทนภาพนิ่งเดิม) ── */}
      <CinematicBackground musicVolume={settings.musicVolume} soundEnabled={settings.soundEnabled} />

      {/* [ใหม่] ปุ่มลำโพงลอยมุมขวาบน — หน้าแรกสุดของแอป ยังไม่มี NavBar ให้ใช้ */}
      <SoundToggleButton floating />

      {/* ไล่สีทับเบาๆ ให้ข้อความ/การ์ดด้านบนอ่านง่ายขึ้นโดยยังเห็นวิดีโอชัด */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: `linear-gradient(180deg, ${BG_1} 0%, ${BG_2} 35%, ${BG_3} 100%)`,
        }}
      />

      {/* ── UI ทั้งหมด overlay อยู่บนสุด ── */}
      <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: 480, width: '100%' }}>
        {/* Logo */}
        <div style={{ fontSize: 72, marginBottom: 8, filter: 'drop-shadow(0 8px 24px var(--glass-b-45))' }}>🌱</div>
        <h1
          style={{
            fontFamily: 'Fredoka One',
            fontSize: 48,
            color: 'var(--fixed-white)',
            textShadow: '0 4px 18px var(--glass-b-55)',
            marginBottom: 4,
          }}
        >
          ARBOR HORIZON
        </h1>
        <p style={{ fontSize: 16, color: 'var(--fixed-white)', textShadow: '0 2px 10px var(--glass-b-55)', marginBottom: 36 }}>
          ปลูกต้นไม้แห่งตัวเอง พัฒนาทุกด้านของชีวิต
        </p>

        {/* Main card */}
        <div
          style={{
            background: 'var(--glass-w-90)',
            backdropFilter: 'blur(16px)',
            borderRadius: 28,
            padding: '36px 32px',
            boxShadow: '0 16px 60px var(--glass-b-35)',
            border: '1.5px solid var(--glass-w-80)',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>🌳</div>
          <h2 style={{ fontFamily: 'Fredoka One', fontSize: 24, color: 'var(--g800)', marginBottom: 8 }}>
            คุณมีต้นไม้ประจำตัวแล้วหรือยัง?
          </h2>
          {/* [แก้บั๊ก — พบจากรีวิวโค้ด] เดิม --n500 กลับด้านเป็นสีอ่อนตอน dark mode (#7EAD8C บน
              การ์ดพื้นขาว --glass-w-90 ที่ไม่เปลี่ยนตามธีมเลย) คอนทราสต์ต่ำกว่ามาตรฐาน อ่านยาก
              ในโหมดมืด — เปลี่ยนไปใช้ --g800 แทน (สีเดียวกับหัวข้อด้านบนในการ์ดนี้เอง ไม่กลับด้าน
              ตามธีม อ่านออกชัดทั้ง 2 โหมดเสมอ) */}
          <p style={{ fontSize: 14, color: 'var(--g800)', lineHeight: 1.65, marginBottom: 28, opacity: .8 }}>
            ต้นไม้ของคุณจะเติบโตไปตามพฤติกรรมของคุณ<br />ทำเควสทุกวัน พัฒนาตัวเองใน 3 ด้าน
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '16px 24px',
                border: 'none',
                borderRadius: 'var(--r-md)',
                background: 'linear-gradient(135deg, var(--g700), var(--g600))',
                color: 'var(--fixed-white)',
                fontFamily: 'Fredoka One',
                fontSize: 18,
                boxShadow: 'var(--sh-btn)',
                cursor: 'pointer',
                transition: 'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow= `0 8px 24px ${SHADOW_4}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'var(--sh-btn)'
              }}
            >
              🔑 เข้าสู่ระบบ
            </button>

            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '16px 24px',
                border: '2px solid var(--g400)',
                borderRadius: 'var(--r-md)',
                background: BG_5,
                color: 'var(--g700)',
                fontFamily: 'Fredoka One',
                fontSize: 18,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = BG_6 }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BG_7 }}
            >
              <img src={BADGE_ICONS.seed} className="icon-img" alt="" /> สมัครสมาชิก
            </button>
          </div>

          {/* Features mini grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginTop: 28,
              paddingTop: 24,
              borderTop: '1.5px solid var(--border)',
            }}
          >
            {[
              { icon: '📚', label: 'ลำต้น', sub: 'ความรู้' },
              { icon: '🍃', label: 'ใบไม้', sub: 'สุขภาพกาย' },
              { icon: '🌸', label: 'ดอกไม้', sub: 'สุขภาพจิต' },
            ].map((f) => (
              <div key={f.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26 }}>{f.icon}</div>
                <div style={{ fontFamily: 'Fredoka One', fontSize: 14, color: 'var(--g700)', marginTop: 2 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--n300)', fontWeight: 600 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--fixed-white)', textShadow: '0 2px 8px var(--glass-b-55)' }}>
          รองรับ 📱 มือถือ · 💻 คอมพิวเตอร์ · 📟 แท็บเล็ต · ⌚ Smartwatch
        </p>
      </div>
    </div>
  )
}