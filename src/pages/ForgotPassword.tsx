import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import AuthLayout from '../components/auth/AuthLayout'
import {
  AUTH_FIELD_TEXT, authCardStyle, authFieldStyle, authLabelStyle, authLinkStyle, authMutedTextStyle,
  authPrimaryButtonHandlers, authPrimaryButtonStyle, handleAuthFieldBlur, handleAuthFieldFocus,
} from '../components/auth/authStyles'

/*============================================================================*\
  ForgotPassword — [ไฟล์ใหม่ — ข้อ 2] หน้ากรอกอีเมลเพื่อขอลิงก์กู้รหัสผ่าน (route "/forgot-password")
  ────────────────────────────────────────────────────────────────────────────
  ใช้ AuthLayout + authStyles ชุดเดียวกับ Login.tsx (วิดีโอพื้นหลัง + การ์ด glassmorphic)
  เพื่อให้ flow อยู่ในโทนเดียวกันตลอด — โปรเจกต์นี้ยังไม่มีระบบส่งอีเมลจริง จึงจำลองด้วยแผง "นี่คือลิงก์ที่ระบบจะส่ง
  ในอีเมลจริง" ให้กดทดสอบได้เลย (ดูคำเตือนในแผงนั้นและใน user.api.ts — ต้องลบออกทันทีที่ต่อ
  ระบบส่งอีเมลจริงแล้ว)
\*============================================================================*/

export default function ForgotPassword() {
  const { requestPasswordReset } = useAppContext()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  /** [เฉพาะ dev/เดโม] token จริงถ้าอีเมลนี้มีอยู่ในระบบ — ดูคำเตือนใน user.api.ts */
  const [devToken, setDevToken] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await requestPasswordReset(email)
      setDevToken(result.devToken)
      // [ตามที่ระบุ — ข้อ 2b] ข้อความนี้ต้องเหมือนกันเป๊ะไม่ว่าจะเจออีเมลในระบบหรือไม่ — มาตรฐาน
      // ความปลอดภัยจริงเพื่อไม่เปิดเผยว่าอีเมลไหน "มีอยู่" ในระบบผ่านการตอบสนองที่ต่างกัน
      // (ฝั่ง backend จริงต้องคืน 200 เดียวกันเสมอในทั้ง 2 กรณีเช่นกัน)
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="ลืมรหัสผ่าน" subtitle="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์กู้รหัสผ่านให้" logoFallback="🔓">
      <div style={authCardStyle}>
        {!submitted ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={authLabelStyle}>
              อีเมล
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                onFocus={handleAuthFieldFocus} onBlur={handleAuthFieldBlur} style={authFieldStyle}
              />
            </label>
            <button type="submit" disabled={isSubmitting} {...authPrimaryButtonHandlers} style={authPrimaryButtonStyle(isSubmitting)}>
              {isSubmitting ? 'กำลังส่ง...' : 'ส่งลิงก์กู้รหัสผ่าน'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 36 }}>📬</div>
            <p style={{ color: 'var(--fixed-white)', fontSize: 14, lineHeight: 1.6 }}>
              ถ้าอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์กู้รหัสผ่านไปให้แล้ว<br />กรุณาตรวจสอบกล่องจดหมายของคุณ
            </p>

            {/* [เฉพาะ dev/เดโม — ต้องลบทันทีที่ต่อระบบส่งอีเมลจริง] จำลองอีเมลที่ระบบจะส่งออกไป
                เพราะโปรเจกต์นี้ยังไม่มีระบบส่งอีเมลจริงให้ทดสอบ flow ต่อได้ */}
            {devToken && (
              <div style={{
                marginTop: 8, padding: 14, borderRadius: 14, background: 'color-mix(in srgb, var(--exp) 16%, transparent)',
                border: '1.5px dashed color-mix(in srgb, var(--exp) 70%, transparent)', textAlign: 'left',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--fixed-white)', marginBottom: 6, opacity: 0.85 }}>
                  🧪 สำหรับเทสระหว่างพัฒนาเท่านั้น (ยังไม่มีระบบส่งอีเมลจริง)
                </div>
                <div style={{ fontSize: 12, color: 'var(--glass-w-90)', marginBottom: 10 }}>
                  นี่คือลิงก์ที่ระบบจะส่งในอีเมลจริง — คลิกเพื่อทดสอบตั้งรหัสผ่านใหม่
                </div>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  style={{
                    display: 'inline-block', padding: '8px 16px', borderRadius: 999,
                    background: 'var(--fixed-white)', color: AUTH_FIELD_TEXT, fontWeight: 800, fontSize: 12, textDecoration: 'none',
                  }}
                >
                  ไปหน้าตั้งรหัสผ่านใหม่ →
                </Link>
              </div>
            )}
          </div>
        )}

        <div style={{ ...authMutedTextStyle, marginTop: 16 }}>
          นึกออกแล้ว? <Link to="/login" style={authLinkStyle}>เข้าสู่ระบบ</Link>
        </div>
      </div>
    </AuthLayout>
  )
}
