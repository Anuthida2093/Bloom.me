import { useState, type FormEvent, type CSSProperties } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SoundToggleButton from '../components/layout/SoundToggleButton'

/**
 * Register — หน้าสมัครสมาชิก (route "/register")
 * ────────────────────────────────────────────────
 * [ข้อกำหนดข้อ 1] เข้าถึงจากปุ่ม "สมัครสมาชิก" ใน WelcomeModal.tsx
 * กรอก email, username, password, birthDate, height, weight ครบแล้วกด "สมัครสมาชิก"
 * → บันทึกลง userData ผ่าน AppContext.registerUser (ตรงชื่อ field ของ backend อยู่แล้ว
 * ดู UserData ใน types.ts: email/username/birthDate/height/weight) → navigate('/mbti')
 * เพราะสมาชิกใหม่ยังไม่มี MBTI ต้องเลือกก่อนถึงจะสร้างต้นไม้ได้
 */

const fieldStyle: CSSProperties = {
  width: '100%', marginTop: 6, padding: '12px 14px', borderRadius: 14,
  border: '2px solid var(--n100)', fontSize: 14, fontFamily: 'Nunito', outline: 'none',
}
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--n700)' }

export default function Register() {
  const navigate = useNavigate()
  const { registerUser } = useAppContext()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    registerUser({
      email,
      username,
      birthDate,
      height: Number(height),
      weight: Number(weight),
    })
    navigate('/mbti')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'linear-gradient(160deg, var(--g800) 0%, var(--g600) 100%)',
      }}
    >
      {/* [ใหม่] ปุ่มลำโพงลอยมุมขวาบน — หน้านี้ยังไม่มี NavBar ให้ใช้ */}
      <SoundToggleButton floating />

      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, filter: 'drop-shadow(0 6px 16px var(--glass-b-35))' }}>🌱</div>
          <h1 style={{ fontFamily: 'Fredoka One', fontSize: 30, color: 'var(--fixed-white)', margin: '4px 0' }}>สมัครสมาชิก</h1>
          <p style={{ color: 'var(--glass-w-85)', fontSize: 13 }}>สร้างบัญชีเพื่อเริ่มปลูกต้นไม้ของคุณ</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--fixed-white)',
            borderRadius: 28,
            padding: '32px 28px',
            boxShadow: '0 16px 50px var(--glass-b-30)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <label style={labelStyle}>
            อีเมล
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            ชื่อผู้ใช้
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ชื่อที่ใช้แสดงในแอป" required style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            รหัสผ่าน
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            วันเกิด
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required style={fieldStyle} />
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              ส่วนสูง (ซม.)
              <input type="number" min={50} max={250} value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" required style={fieldStyle} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              น้ำหนัก (กก.)
              <input type="number" min={20} max={300} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="60" required style={fieldStyle} />
            </label>
          </div>

          <button
            type="submit"
            style={{
              padding: '14px 24px', border: 'none', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, var(--g700), var(--g600))',
              color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 17, cursor: 'pointer',
              boxShadow: 'var(--sh-btn)', marginTop: 4,
            }}
          >
            🌱 สมัครสมาชิก
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--n500)' }}>
            มีบัญชีอยู่แล้ว? <Link to="/login" style={{ color: 'var(--g700)', fontWeight: 700 }}>เข้าสู่ระบบ</Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: 12, color: 'var(--n300)' }}>← กลับหน้าหลัก</Link>
          </div>
        </form>
      </div>
    </div>
  )
}