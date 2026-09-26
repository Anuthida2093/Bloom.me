import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import AuthLayout from '../components/auth/AuthLayout'
import {
  authCardStyle, authErrorBoxStyle, authFieldStyle, authLabelStyle, authLinkStyle, authMutedTextStyle,
  authPrimaryButtonHandlers, authPrimaryButtonStyle, handleAuthFieldBlur, handleAuthFieldFocus,
} from '../components/auth/authStyles'
import PasswordInput from '../components/ui/PasswordInput'
import { ApiError } from '../services/http'
import { validatePasswordStrength } from '../utils/mockAuth'
import { BADGE_ICONS } from '../config/iconAssets'

/*============================================================================*\
  ResetPassword — [ไฟล์ใหม่ — ข้อ 2d/2e] หน้าตั้งรหัสผ่านใหม่จากลิงก์กู้รหัสผ่าน
  (route "/reset-password?token=...")
  ────────────────────────────────────────────────────────────────────────────
  token มาจาก query string (ของจริงจะมาจากลิงก์ในอีเมล) — ตรวจกับ mockDb.passwordResetTokens
  ผ่าน userApi.resetPassword() ถ้าไม่ถูกต้อง/หมดอายุจะได้ ApiError กลับมา (ดู user.api.ts)
  รีเซ็ตสำเร็จแล้ว token ถูก invalidate ทันทีฝั่ง mock กันใช้ลิงก์เดิมซ้ำ
\*============================================================================*/

export default function ResetPassword() {
  const navigate = useNavigate()
  const { resetPassword } = useAppContext()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!token) { setErrorMessage('ลิงก์นี้ไม่ถูกต้อง — ไม่พบโทเคนกู้รหัสผ่าน'); return }
    const strengthIssue = validatePasswordStrength(newPassword)
    if (strengthIssue) { setErrorMessage(strengthIssue); return }
    if (newPassword !== confirmPassword) { setErrorMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return }

    setIsSubmitting(true)
    try {
      await resetPassword({ token, newPassword })
      setDone(true)
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.userMessage : 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ ลองอีกครั้ง')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldProps = { onFocus: handleAuthFieldFocus, onBlur: handleAuthFieldBlur, style: authFieldStyle }

  return (
    <AuthLayout title="ตั้งรหัสผ่านใหม่" logoFallback="🔑">
      <div style={authCardStyle}>
        {done ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <p style={{ color: 'var(--fixed-white)', fontSize: 14 }}>ตั้งรหัสผ่านใหม่สำเร็จแล้ว</p>
            <button type="button" onClick={() => navigate('/login')} {...authPrimaryButtonHandlers} style={authPrimaryButtonStyle()}>
              ไปเข้าสู่ระบบ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={authLabelStyle}>
              รหัสผ่านใหม่
              <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="อย่างน้อย 8 ตัวอักษร มีตัวอักษรและตัวเลข" required {...fieldProps} />
            </label>
            <label style={authLabelStyle}>
              ยืนยันรหัสผ่านใหม่
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" required {...fieldProps} />
            </label>

            {errorMessage && <div style={authErrorBoxStyle}>⚠️ {errorMessage}</div>}

            <button type="submit" disabled={isSubmitting} {...authPrimaryButtonHandlers} style={authPrimaryButtonStyle(isSubmitting)}>
              {isSubmitting ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
            </button>
          </form>
        )}

        {!done && (
          <div style={{ ...authMutedTextStyle, marginTop: 16 }}>
            <Link to="/login" style={authLinkStyle}><img src={BADGE_ICONS.back} className="icon-img" alt="" /> กลับไปเข้าสู่ระบบ</Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
