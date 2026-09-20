import { useState, type FormEvent, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SoundToggleButton from '../components/layout/SoundToggleButton'
import PasswordInput from '../components/ui/PasswordInput'
import { BADGE_ICONS } from '../config/iconAssets'
import { ApiError } from '../services/http'
import { validatePasswordStrength } from '../utils/mockAuth'
import type { Gender } from '../types'

/**
 * Register — หน้าสมัครสมาชิก (route "/register")
 * ────────────────────────────────────────────────
 * [ข้อกำหนดข้อ 1] เข้าถึงจากปุ่ม "สมัครสมาชิก" ใน WelcomeModal.tsx
 * กรอก email, username, password, birthDate, height, weight ครบแล้วกด "สมัครสมาชิก"
 * → บันทึกลง userData ผ่าน AppContext.registerUser (ตรงชื่อ field ของ backend อยู่แล้ว
 * ดู UserData ใน types.ts: email/username/birthDate/height/weight) → navigate('/mbti')
 * เพราะสมาชิกใหม่ยังไม่มี MBTI ต้องเลือกก่อนถึงจะสร้างต้นไม้ได้
 */

// [แก้บั๊ก — พบจากรีวิวโค้ด เหมือนกับที่แก้ใน Login.tsx] การ์ดฟอร์มนี้เป็น var(--fixed-white)
// ตายตัว (ไม่เปลี่ยนตามธีมเลย) แต่ label/ลิงก์ด้านล่างเดิมใช้ --n700/--n500/--n300 ซึ่งกลับด้าน
// เป็นสีอ่อนตอน dark mode ([data-theme="dark"] ใน index.css) ทำให้อ่านยาก/มองไม่เห็นบนพื้น
// ขาวตายตัวนี้ — ล็อกเป็นสีเข้มคงที่แทนทั้งชุด (input เองก็ไม่เคยตั้ง color มาก่อน เดิมรับสีมา
// จาก label ที่ห่ออยู่ผ่านการ inherit เฉยๆ จึงติดปัญหาเดียวกันไปด้วย — ใส่ background/color
// ให้ input ตรงๆ ไม่ต้องพึ่ง inherit อีกต่อไป)
const FIELD_TEXT = '#1a2e22'
const fieldStyle: CSSProperties = {
  width: '100%', marginTop: 6, padding: '12px 14px', borderRadius: 14,
  border: '2px solid var(--n100)', fontSize: 14, fontFamily: 'Nunito', outline: 'none',
  background: 'var(--fixed-white)', color: FIELD_TEXT,
}
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: FIELD_TEXT }

export default function Register() {
  const navigate = useNavigate()
  const { registerUser } = useAppContext()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  /** [ใหม่] เพศ — ต้องเลือกตั้งแต่สมัคร (บังคับกรอก ดู <select required> ด้านล่าง) ใช้คำนวณ
   *  ชุดภาพ "รูปร่างของคุณ" ตั้งแต่เข้าเกมครั้งแรก ไม่ต้องรอไปตั้งทีหลังในหน้าตั้งค่าโปรไฟล์
   *  (ดู getBodyTypeImagePath ใน bodyTypeAssets.ts) — ค่าเริ่มต้นเป็นสตริงว่าง (ไม่ใช่ Gender
   *  ที่ถูกต้อง) ตั้งใจให้ browser validation บล็อกการ submit จนกว่าจะเลือกจริง ไม่ปล่อยผ่าน
   *  ด้วยค่า default เงียบๆ แบบที่ทำในหน้าตั้งค่าโปรไฟล์ (ที่นั่น fallback ได้เพราะเป็น user
   *  เดิมที่มีบัญชีอยู่แล้ว แต่ตรงนี้คือจุดตั้งค่าครั้งแรก) */
  const [gender, setGender] = useState<'' | Gender>('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [emailError, setEmailError] = useState<ReactNode>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gender) return // กันไว้อีกชั้น เผื่อ required ของ <select> ถูกข้ามด้วยวิธีใดก็ตาม
    setEmailError(null)
    setPasswordError(null)

    const passwordIssue = validatePasswordStrength(password)
    if (passwordIssue) { setPasswordError(passwordIssue); return }

    setIsSubmitting(true)
    try {
      await registerUser({
        email,
        username,
        password,
        birthDate,
        gender,
        height: Number(height),
        weight: Number(weight),
      })
      navigate('/mbti')
    } catch (err) {
      // [ตามที่ระบุ — ข้อ 1] อีเมลซ้ำ (409) โชว์ error ใต้ช่องอีเมลทันที พร้อมลิงก์ไปหน้า
      // Login/ลืมรหัสผ่านในข้อความเลย ไม่ใช้ alert()
      if (err instanceof ApiError && err.status === 409) {
        setEmailError(
          <>
            อีเมลนี้มีผู้ใช้งานแล้ว ลอง<Link to="/login" style={{ color: 'var(--g700)', fontWeight: 800 }}>เข้าสู่ระบบ</Link>
            {' '}หรือ<Link to="/forgot-password" style={{ color: 'var(--g700)', fontWeight: 800 }}>กู้รหัสผ่าน</Link>แทน
          </>,
        )
      } else {
        setEmailError(err instanceof ApiError ? err.userMessage : 'สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง')
      }
    } finally {
      setIsSubmitting(false)
    }
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
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
              placeholder="you@example.com" required style={fieldStyle}
            />
          </label>
          {emailError && (
            <div style={{ marginTop: -10, fontSize: 13, color: '#c0392b', fontWeight: 700 }}>⚠️ {emailError}</div>
          )}

          <label style={labelStyle}>
            ชื่อผู้ใช้
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ชื่อที่ใช้แสดงในแอป" required style={fieldStyle} />
          </label>

          <label style={labelStyle}>
            รหัสผ่าน
            <PasswordInput
              value={password}
              onChange={(v) => { setPassword(v); setPasswordError(null) }}
              placeholder="อย่างน้อย 8 ตัวอักษร มีตัวอักษรและตัวเลข"
              required
              style={fieldStyle}
            />
          </label>
          {passwordError && (
            <div style={{ marginTop: -10, fontSize: 13, color: '#c0392b', fontWeight: 700 }}>⚠️ {passwordError}</div>
          )}

          <label style={labelStyle}>
            วันเกิด
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required style={fieldStyle} />
          </label>

          {/* [ใหม่] เพศ — บังคับเลือกก่อนสมัครสำเร็จ ใช้คำนวณชุดภาพ "รูปร่างของคุณ" คู่กับ
              ส่วนสูง/น้ำหนักด้านล่าง จึงวางไว้ติดกัน */}
          <label style={labelStyle}>
            เพศ
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as '' | Gender)}
              required
              style={fieldStyle}
            >
              <option value="" disabled>เลือกเพศ</option>
              <option value="FEMALE">หญิง</option>
              <option value="MALE">ชาย</option>
            </select>
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
            disabled={isSubmitting}
            style={{
              padding: '14px 24px', border: 'none', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, var(--g700), var(--g600))',
              color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 17,
              cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1,
              boxShadow: 'var(--sh-btn)', marginTop: 4,
            }}
          >
            {isSubmitting ? 'กำลังสมัครสมาชิก...' : <><img src={BADGE_ICONS.seed} className="icon-img" alt="" /> สมัครสมาชิก</>}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: FIELD_TEXT }}>
            มีบัญชีอยู่แล้ว? <Link to="/login" style={{ color: 'var(--g700)', fontWeight: 700 }}>เข้าสู่ระบบ</Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: 12, color: FIELD_TEXT }}>← กลับหน้าหลัก</Link>
          </div>
        </form>
      </div>
    </div>
  )
}