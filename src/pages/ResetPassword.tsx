import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SoundToggleButton from '../components/layout/SoundToggleButton'
import PasswordInput from '../components/ui/PasswordInput'
import { ApiError } from '../services/http'
import { validatePasswordStrength } from '../utils/mockAuth'

/*============================================================================*\
  ResetPassword — [ไฟล์ใหม่ — ข้อ 2d/2e] หน้าตั้งรหัสผ่านใหม่จากลิงก์กู้รหัสผ่าน
  (route "/reset-password?token=...")
  ────────────────────────────────────────────────────────────────────────────
  token มาจาก query string (ของจริงจะมาจากลิงก์ในอีเมล) — ตรวจกับ mockDb.passwordResetTokens
  ผ่าน userApi.resetPassword() ถ้าไม่ถูกต้อง/หมดอายุจะได้ ApiError กลับมา (ดู user.api.ts)
  รีเซ็ตสำเร็จแล้ว token ถูก invalidate ทันทีฝั่ง mock กันใช้ลิงก์เดิมซ้ำ
\*============================================================================*/

const TEXT_3 = '#1a2e22'
const fieldStyle: CSSProperties = {
  width: '100%', marginTop: 6, padding: '13px 16px', borderRadius: 16,
  border: '2px solid var(--glass-w-50)', fontSize: 14, fontFamily: 'Nunito',
  outline: 'none', background: 'var(--glass-w-85)', color: TEXT_3,
  transition: 'all .3s ease',
}
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--fixed-white)', textShadow: '0 1px 4px var(--glass-b-40)' }

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

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
      <SoundToggleButton floating />

      <video autoPlay loop muted playsInline style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0 }}>
        <source src="/assets/hero-waterfall.mp4" type="video/mp4" />
      </video>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(10,30,25,.45) 0%, rgba(10,30,25,.25) 45%, rgba(10,30,25,.55) 100%)', backdropFilter: 'blur(2px)' }} />

      <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48 }}>🔑</div>
          <h1 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: 'var(--fixed-white)', margin: '4px 0', textShadow: '0 4px 16px var(--glass-b-50)' }}>ตั้งรหัสผ่านใหม่</h1>
        </div>

        <div style={{
          background: 'var(--glass-w-16)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24, padding: '32px 28px', boxShadow: '0 20px 50px var(--glass-b-25), inset 0 1px 0 var(--glass-w-30)',
          border: '2px solid var(--glass-w-60)',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 36 }}>✅</div>
              <p style={{ color: 'var(--fixed-white)', fontSize: 14 }}>ตั้งรหัสผ่านใหม่สำเร็จแล้ว</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  padding: '13px 24px', border: 'none', borderRadius: 999,
                  background: 'linear-gradient(135deg, var(--g400) 0%, var(--g700) 100%)',
                  color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 16, cursor: 'pointer',
                }}
              >
                🔑 ไปเข้าสู่ระบบ
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                รหัสผ่านใหม่
                <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="อย่างน้อย 8 ตัวอักษร มีตัวอักษรและตัวเลข" required style={fieldStyle} />
              </label>
              <label style={labelStyle}>
                ยืนยันรหัสผ่านใหม่
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" required style={fieldStyle} />
              </label>

              {errorMessage && (
                <div style={{ background: 'rgba(220,60,60,.18)', border: '1.5px solid rgba(220,60,60,.55)', borderRadius: 12, padding: '10px 14px', color: 'var(--fixed-white)', fontSize: 13, fontWeight: 700 }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '15px 24px', border: 'none', borderRadius: 999,
                  background: 'linear-gradient(135deg, var(--g400) 0%, var(--g700) 100%)',
                  color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 17,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1, marginTop: 4,
                }}
              >
                {isSubmitting ? 'กำลังบันทึก...' : '✅ ตั้งรหัสผ่านใหม่'}
              </button>
            </form>
          )}

          {!done && (
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--glass-w-85)', marginTop: 16 }}>
              <Link to="/login" style={{ color: 'var(--fixed-white)', fontWeight: 800, textDecoration: 'underline' }}>← กลับไปเข้าสู่ระบบ</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
