import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import PasswordInput from '../components/ui/PasswordInput'
import AuthLayout from '../components/auth/AuthLayout'
import BirthDatePicker from '../components/auth/BirthDatePicker'
import {
  authCardStyle, authErrorBoxStyle, authFieldStyle, authLabelStyle, authLinkStyle, authMutedTextStyle,
  authPrimaryButtonHandlers, authPrimaryButtonStyle, handleAuthFieldBlur, handleAuthFieldFocus,
} from '../components/auth/authStyles'
import { ApiError } from '../services/http'
import { validatePasswordStrength } from '../utils/mockAuth'
import type { Gender } from '../types'
import { BADGE_ICONS } from '../config/iconAssets'

/**
 * Register — หน้าสมัครสมาชิก (route "/register")
 * ────────────────────────────────────────────────
 * [ข้อกำหนดข้อ 1] เข้าถึงจากปุ่ม "สมัครสมาชิก" ใน WelcomeModal.tsx
 * กรอก email, username, password, birthDate, height, weight ครบแล้วกด "สมัครสมาชิก"
 * → บันทึกลง userData ผ่าน AppContext.registerUser (ตรงชื่อ field ของ backend อยู่แล้ว
 * ดู UserData ใน types.ts: email/username/birthDate/height/weight) → navigate('/mbti')
 * เพราะสมาชิกใหม่ยังไม่มี MBTI ต้องเลือกก่อนถึงจะสร้างต้นไม้ได้
 *
 * [แก้รอบนี้] เดิมเป็นการ์ดขาวทึบบนพื้นไล่สีเขียว (ไม่มีวิดีโอ) ต่างจากหน้า auth อื่น — ย้ายมาใช้
 * AuthLayout + authStyles ชุดเดียวกัน (พื้นหลังวิดีโอ + การ์ดกระจก) ให้ทั้ง flow หน้าตาเหมือนกัน
 */

/** วิดีโอพื้นหลังเฉพาะหน้า Register (หน้า Login ใช้ Reframer-Journal0) */
const VIDEO_SRC = '/assets/videos/intro/Reframer-Journal1.mp4'

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
            อีเมลนี้มีผู้ใช้งานแล้ว ลอง<Link to="/login" style={authLinkStyle}>เข้าสู่ระบบ</Link>
            {' '}หรือ<Link to="/forgot-password" style={authLinkStyle}>กู้รหัสผ่าน</Link>แทน
          </>,
        )
      } else {
        setEmailError(err instanceof ApiError ? err.userMessage : 'สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldProps = { onFocus: handleAuthFieldFocus, onBlur: handleAuthFieldBlur, style: authFieldStyle }

  return (
    <AuthLayout title="สมัครสมาชิก" subtitle="สร้างบัญชีเพื่อเริ่มปลูกต้นไม้ของคุณ" logoFallback="🌱" maxWidth={440} videoSrc={VIDEO_SRC}>
      <form onSubmit={handleSubmit} style={{ ...authCardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={authLabelStyle}>
          อีเมล
          <input
            type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
            placeholder="you@example.com" required {...fieldProps}
          />
        </label>
        {emailError && <div style={{ ...authErrorBoxStyle, marginTop: -6 }}>⚠️ {emailError}</div>}

        <label style={authLabelStyle}>
          ชื่อผู้ใช้
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ชื่อที่ใช้แสดงในแอป" required {...fieldProps} />
        </label>

        <label style={authLabelStyle}>
          รหัสผ่าน
          <PasswordInput
            value={password}
            onChange={(v) => { setPassword(v); setPasswordError(null) }}
            placeholder="อย่างน้อย 8 ตัวอักษร มีตัวอักษรและตัวเลข"
            required
            {...fieldProps}
          />
        </label>
        {passwordError && <div style={{ ...authErrorBoxStyle, marginTop: -6 }}>⚠️ {passwordError}</div>}

        {/* dropdown วัน/เดือน/ปี แทน <input type="date"> — ย้อนปีเกิดได้ทันทีไม่ต้องกดทีละปี (ค่ายังเป็น YYYY-MM-DD) */}
        <BirthDatePicker value={birthDate} onChange={setBirthDate} required />

        {/* [ใหม่] เพศ — บังคับเลือกก่อนสมัครสำเร็จ ใช้คำนวณชุดภาพ "รูปร่างของคุณ" คู่กับ
            ส่วนสูง/น้ำหนักด้านล่าง จึงวางไว้ติดกัน */}
        <label style={authLabelStyle}>
          เพศ
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as '' | Gender)}
            required
            {...fieldProps}
          >
            <option value="" disabled>เลือกเพศ</option>
            <option value="FEMALE">หญิง</option>
            <option value="MALE">ชาย</option>
          </select>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ ...authLabelStyle, flex: 1 }}>
            ส่วนสูง (ซม.)
            <input type="number" min={50} max={250} value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" required {...fieldProps} />
          </label>
          <label style={{ ...authLabelStyle, flex: 1 }}>
            น้ำหนัก (กก.)
            <input type="number" min={20} max={300} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="60" required {...fieldProps} />
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} {...authPrimaryButtonHandlers} style={authPrimaryButtonStyle(isSubmitting)}>
          {isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
        </button>

        <div style={authMutedTextStyle}>
          มีบัญชีอยู่แล้ว? <Link to="/login" style={authLinkStyle}>เข้าสู่ระบบ</Link>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--glass-w-65)' }}><img src={BADGE_ICONS.back} className="icon-img" alt="" /> กลับหน้าหลัก</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
