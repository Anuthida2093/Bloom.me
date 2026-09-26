import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import PasswordInput from '../components/ui/PasswordInput'
import AuthLayout from '../components/auth/AuthLayout'
import AppFeaturesFooter from '../components/welcome/AppFeaturesFooter'
import {
  authCardStyle, authErrorBoxStyle, authFieldStyle, authLabelStyle, authLinkStyle, authMutedTextStyle,
  authPrimaryButtonHandlers, authPrimaryButtonStyle, handleAuthFieldBlur, handleAuthFieldFocus,
} from '../components/auth/authStyles'
import { ApiError } from '../services/http'
import { BADGE_ICONS } from '../config/iconAssets'

/**
 * Login — หน้ากรอกเข้าสู่ระบบ (route "/login")
 * ────────────────────────────────────────────
 * เข้าถึงจากลิงก์ "เป็นสมาชิกอยู่แล้ว? เข้าสู่ระบบ" ใน WelcomeModal.tsx
 * กรอก username + password แล้วกด "เข้าสู่ระบบ" → ไปหน้า dashboard
 * (ต่างจาก Register ที่ต้องไปเลือก MBTI ก่อน เพราะ Login คือผู้ใช้เดิมที่มีต้นไม้อยู่แล้ว)
 *
 * [แก้รอบนี้ — เตรียมความปลอดภัยฝั่ง frontend] เดิม password ที่ผู้ใช้กรอกถูกทิ้งไปเฉยๆ
 * (ส่ง password: '' ตายตัวเข้า mock login เสมอ ไม่เคยตรวจจริง) ตอนนี้ตรวจกับบัญชีที่สมัครไว้
 * จริงใน mockDb (ดู user.api.ts login()) — ผิดพลาดจะโชว์ error ใต้ฟอร์ม พร้อม rate-limit
 * เบื้องต้นฝั่ง client (ล็อกปุ่มชั่วคราวหลังกดผิดติดกัน 3 ครั้ง — ดูคอมเมนต์ที่ handleSubmit)
 *
 * พื้นหลัง/โลโก้/สไตล์ฟอร์มมาจาก AuthLayout + authStyles (ชุดเดียวกับหน้า auth อื่นและหน้า Welcome)
 * ท้ายหน้ามี AppFeaturesFooter ตัวเดียวกับหน้า Welcome
 */

/** [ใหม่ — ข้อ 4] rate-limit เบื้องต้นฝั่ง client เท่านั้น — "ชะลอ" การกดรัว ไม่ใช่การป้องกัน
 * brute-force จริง (ผู้โจมตีเรียก API ตรงๆ ผ่าน curl/script ได้โดยไม่ผ่านปุ่มนี้เลย) ระบบ
 * ป้องกันจริงต้องทำที่ backend (เช่น ล็อกบัญชีชั่วคราว/CAPTCHA/IP throttling หลังพยายามผิดครบจำนวน) */
/** วิดีโอพื้นหลังเฉพาะหน้า Login (หน้า Register ใช้ Reframer-Journal1) */
const VIDEO_SRC = '/assets/videos/intro/Reframer-Journal0.mp4'

const FAILED_ATTEMPTS_BEFORE_LOCK = 3
const LOCKOUT_MS = 3000

export default function Login() {
  const navigate = useNavigate()
  const { loginWithUsername } = useAppContext()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const failedAttempts = useRef(0)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLocked || isSubmitting) return
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await loginWithUsername(username, password)
      failedAttempts.current = 0
      navigate('/dashboard')
    } catch (err) {
      failedAttempts.current += 1
      setErrorMessage(err instanceof ApiError ? err.userMessage : 'เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง')
      if (failedAttempts.current >= FAILED_ATTEMPTS_BEFORE_LOCK) {
        setIsLocked(true)
        failedAttempts.current = 0
        window.setTimeout(() => setIsLocked(false), LOCKOUT_MS)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const disabled = isSubmitting || isLocked

  return (
    <AuthLayout title="เข้าสู่ระบบ" subtitle="ยินดีต้อนรับกลับมา 🌱" logoFallback="🔑" maxWidth={400} videoSrc={VIDEO_SRC} footer={<AppFeaturesFooter />}>
      <form onSubmit={handleSubmit} style={{ ...authCardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={authLabelStyle}>
          ชื่อผู้ใช้
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={handleAuthFieldFocus}
            onBlur={handleAuthFieldBlur}
            placeholder="ชื่อผู้ใช้ของคุณ"
            required
            style={authFieldStyle}
          />
        </label>

        <label style={authLabelStyle}>
          รหัสผ่าน
          <PasswordInput
            value={password}
            onChange={setPassword}
            onFocus={handleAuthFieldFocus}
            onBlur={handleAuthFieldBlur}
            placeholder="••••••••"
            required
            style={authFieldStyle}
          />
        </label>

        <div style={{ textAlign: 'right', marginTop: -8 }}>
          <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--glass-w-85)', fontWeight: 700 }}>ลืมรหัสผ่าน?</Link>
        </div>

        {errorMessage && <div style={authErrorBoxStyle}>⚠️ {errorMessage}</div>}

        <button type="submit" disabled={disabled} {...authPrimaryButtonHandlers} style={authPrimaryButtonStyle(disabled)}>
          {isLocked ? '⏳ ลองใหม่อีกครั้งในอีกสักครู่' : isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <div style={authMutedTextStyle}>
          ยังไม่มีบัญชี? <Link to="/register" style={authLinkStyle}>สมัครสมาชิก</Link>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--glass-w-65)' }}><img src={BADGE_ICONS.back} className="icon-img" alt="" /> กลับหน้าหลัก</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
