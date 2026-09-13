import { useState, type FormEvent, type CSSProperties, type FocusEvent, type MouseEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SoundToggleButton from '../components/layout/SoundToggleButton'

const C_1 = 'rgba(116,198,157,.35)'
const C_2 = 'rgba(116,198,157,.55)'
const TEXT_3 = '#1a2e22'
const BORDER_4 = 'rgba(116,198,157,.9)'
const SHADOW_5 = 'rgba(45,106,79,.55)'
const SHADOW_6 = 'rgba(116,198,157,.5)'
const SHADOW_7 = 'rgba(45,106,79,.4)'
const BG_8 = 'rgba(10,30,25,.45)'
const BG_9 = 'rgba(10,30,25,.25)'
const BG_10 = 'rgba(10,30,25,.55)'
const SHADOW_11 = 'rgba(45,106,79,.4)'

/**
 * Login — หน้ากรอกเข้าสู่ระบบ (route "/login")
 * ────────────────────────────────────────────
 * [ข้อกำหนดข้อ 1] เข้าถึงจากปุ่ม "เข้าสู่ระบบ" ใน WelcomeModal.tsx
 * กรอกแค่ username + password แล้วกด "เข้าสู่ระบบ" ได้เลย (ไม่มี backend จริงในโปรเจกต์นี้
 * จึงไม่ตรวจรหัสผ่านจริงจัง — สมมติว่ามีบัญชีอยู่แล้วเสมอ) แล้วไปหน้า dashboard ตรงๆ
 * (ต่างจาก Register ที่ต้องไปเลือก MBTI ก่อน เพราะ Login คือผู้ใช้เดิมที่มีต้นไม้อยู่แล้ว)
 *
 * [ข้อกำหนดข้อ 3] พื้นหลังวิดีโอ hero-waterfall.mp4 เต็มจอ + overlay โปร่งแสง glassmorphic
 * [ข้อกำหนดข้อ 4] การ์ดฟอร์ม/ช่องกรอก/ปุ่ม ปรับสไตล์อนิเมะ-เกม (glow ตอน focus, micro-animation ปุ่ม)
 */

// glow สีเขียวสไตล์เกม/อนิเมะตอน focus ช่องกรอก — ใช้ inline handler แทน CSS :focus
// เพราะทั้งไฟล์นี้เขียนสไตล์แบบ inline object ตามแบบเดิมของโปรเจกต์ ไม่ใช้ CSS class แยก
const FOCUS_GLOW= `0 0 0 4px ${C_1}, 0 0 18px ${C_2}`
const BLUR_SHADOW = 'none'

// [แก้บั๊ก — ตามที่ระบุ] เดิม color: var(--n900, ...) — --n900 ถูกนิยามให้ "สลับกลับด้าน"
// ตอน dark mode (เกือบดำ → เกือบขาว ดู [data-theme="dark"] ใน index.css) แต่ background
// ของฟิลด์นี้เป็น --glass-w-85/96 (rgba(255,255,255,X) ตายตัว ไม่มีเวอร์ชัน dark mode เลย
// ยังคงเป็นพื้นขาวเสมอทั้งสองโหมด) พอสลับ dark mode ตัวอักษรเลยกลายเป็นขาวบนพื้นขาว มองไม่เห็น
// เลย — ล็อก color เป็นสีเข้มคงที่ (TEXT_3) ไม่ผูกกับตัวแปรธีมอีกต่อไป เพื่อให้อ่านออกทั้ง
// 2 โหมดเสมอ (background ของฟอร์มนี้ไม่เปลี่ยนตามธีมอยู่แล้ว จึงไม่จำเป็นต้องให้ตัวอักษรเปลี่ยนตาม)
const fieldStyle: CSSProperties = {
  width: '100%', marginTop: 6, padding: '13px 16px', borderRadius: 16,
  border: '2px solid var(--glass-w-50)', fontSize: 14, fontFamily: 'Nunito',
  outline: 'none', background: 'var(--glass-w-85)', color: TEXT_3,
  boxShadow: BLUR_SHADOW, transition: 'all .3s ease',
}
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--fixed-white)', textShadow: '0 1px 4px var(--glass-b-40)' }

function handleFieldFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.style.boxShadow = FOCUS_GLOW
  e.target.style.borderColor = BORDER_4
  e.target.style.background = 'var(--glass-w-96)'
}
function handleFieldBlur(e: FocusEvent<HTMLInputElement>) {
  e.target.style.boxShadow = BLUR_SHADOW
  e.target.style.borderColor = 'var(--glass-w-50)'
  e.target.style.background = 'var(--glass-w-85)'
}

export default function Login() {
  const navigate = useNavigate()
  const { loginWithUsername } = useAppContext()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    loginWithUsername(username)
    navigate('/dashboard')
  }

  // ปุ่มหลัก "เข้าสู่ระบบ" — pill-shaped, gradient สไตล์ธรรมชาติ/อนิเมะ, hover ขยาย+เรืองแสง,
  // active ย่อตัวลงเล็กน้อยให้รู้สึกกดจริง (tactile feedback)
  const handlePrimaryBtnEnter = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
    e.currentTarget.style.boxShadow= `0 10px 30px ${SHADOW_5}, 0 0 22px ${SHADOW_6}`
  }
  const handlePrimaryBtnLeave = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'none'
    e.currentTarget.style.boxShadow= `0 8px 24px ${SHADOW_7}`
  }
  const handlePrimaryBtnDown = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(1px) scale(0.98)'
  }
  const handlePrimaryBtnUp = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        overflow: 'hidden',
      }}
    >
      {/* [ใหม่] ปุ่มลำโพงลอยมุมขวาบน — หน้านี้ยังไม่มี NavBar ให้ใช้ */}
      <SoundToggleButton floating />

      {/* [ข้อกำหนดข้อ 3] วิดีโอพื้นหลัง hero-waterfall.mp4 เต็มจอ */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'fixed', inset: 0, width: '100vw', height: '100vh',
          objectFit: 'cover', zIndex: 0,
        }}
      >
        <source src="/assets/hero-waterfall.mp4" type="video/mp4" />
      </video>

      {/* Overlay โปร่งแสง glassmorphic ทับวิดีโอ ให้ตัวหนังสือ/การ์ดอ่านง่ายขึ้น */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1,
          background: `linear-gradient(180deg, ${BG_8} 0%, ${BG_9} 45%, ${BG_10} 100%)`,
          backdropFilter: 'blur(2px)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, filter: 'drop-shadow(0 6px 16px var(--glass-b-50))' }}>🔑</div>
          <h1 style={{ fontFamily: 'Fredoka One', fontSize: 32, color: 'var(--fixed-white)', margin: '4px 0', textShadow: '0 4px 16px var(--glass-b-50)' }}>
            เข้าสู่ระบบ
          </h1>
          <p style={{ color: 'var(--glass-w-90)', fontSize: 13, textShadow: '0 2px 6px var(--glass-b-50)' }}>ยินดีต้อนรับกลับมา 🌱</p>
        </div>

        {/* [ข้อกำหนดข้อ 4] การ์ดฟอร์ม glassmorphic คุณภาพสูง ขอบมน + ขอบเรืองแสงนุ่มนวล */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--glass-w-16)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 24,
            padding: '32px 28px',
            boxShadow: '0 20px 50px var(--glass-b-25), inset 0 1px 0 var(--glass-w-30)',
            border: '2px solid var(--glass-w-60)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <label style={labelStyle}>
            ชื่อผู้ใช้
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              placeholder="ชื่อผู้ใช้ของคุณ"
              required
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            รหัสผ่าน
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
              placeholder="••••••••"
              required
              style={fieldStyle}
            />
          </label>

          <button
            type="submit"
            onMouseEnter={handlePrimaryBtnEnter}
            onMouseLeave={handlePrimaryBtnLeave}
            onMouseDown={handlePrimaryBtnDown}
            onMouseUp={handlePrimaryBtnUp}
            style={{
              padding: '15px 24px', border: 'none', borderRadius: 999,
              background: 'linear-gradient(135deg, var(--g400) 0%, var(--g700, var(--g700)) 100%)',
              color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 18, cursor: 'pointer',
              boxShadow: `0 8px 24px ${SHADOW_11}`, marginTop: 6,
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
          >
            🔑 เข้าสู่ระบบ
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--glass-w-85)' }}>
            ยังไม่มีบัญชี? <Link to="/register" style={{ color: 'var(--fixed-white)', fontWeight: 800, textDecoration: 'underline' }}>สมัครสมาชิก</Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: 12, color: 'var(--glass-w-65)' }}>← กลับหน้าหลัก</Link>
          </div>
        </form>
      </div>
    </div>
  )
}