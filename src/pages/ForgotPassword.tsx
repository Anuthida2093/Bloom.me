import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import SoundToggleButton from '../components/layout/SoundToggleButton'

/*============================================================================*\
  ForgotPassword — [ไฟล์ใหม่ — ข้อ 2] หน้ากรอกอีเมลเพื่อขอลิงก์กู้รหัสผ่าน (route "/forgot-password")
  ────────────────────────────────────────────────────────────────────────────
  สไตล์เดียวกับ Login.tsx (วิดีโอพื้นหลัง + การ์ด glassmorphic) เพื่อให้ flow อยู่ในโทน
  เดียวกันตลอด — โปรเจกต์นี้ยังไม่มีระบบส่งอีเมลจริง จึงจำลองด้วยแผง "นี่คือลิงก์ที่ระบบจะส่ง
  ในอีเมลจริง" ให้กดทดสอบได้เลย (ดูคำเตือนในแผงนั้นและใน user.api.ts — ต้องลบออกทันทีที่ต่อ
  ระบบส่งอีเมลจริงแล้ว)
\*============================================================================*/

const TEXT_3 = '#1a2e22'
const fieldStyle: CSSProperties = {
  width: '100%', marginTop: 6, padding: '13px 16px', borderRadius: 16,
  border: '2px solid var(--glass-w-50)', fontSize: 14, fontFamily: 'Nunito',
  outline: 'none', background: 'var(--glass-w-85)', color: TEXT_3,
  transition: 'all .3s ease',
}
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--fixed-white)', textShadow: '0 1px 4px var(--glass-b-40)' }

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
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
      <SoundToggleButton floating />

      <video autoPlay loop muted playsInline style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0 }}>
        <source src="/assets/hero-waterfall.mp4" type="video/mp4" />
      </video>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(10,30,25,.45) 0%, rgba(10,30,25,.25) 45%, rgba(10,30,25,.55) 100%)', backdropFilter: 'blur(2px)' }} />

      <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48 }}>🔓</div>
          <h1 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: 'var(--fixed-white)', margin: '4px 0', textShadow: '0 4px 16px var(--glass-b-50)' }}>ลืมรหัสผ่าน</h1>
          <p style={{ color: 'var(--glass-w-90)', fontSize: 13 }}>กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์กู้รหัสผ่านให้</p>
        </div>

        <div style={{
          background: 'var(--glass-w-16)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24, padding: '32px 28px', boxShadow: '0 20px 50px var(--glass-b-25), inset 0 1px 0 var(--glass-w-30)',
          border: '2px solid var(--glass-w-60)',
        }}>
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                อีเมล
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={fieldStyle} />
              </label>
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
                {isSubmitting ? 'กำลังส่ง...' : '📧 ส่งลิงก์กู้รหัสผ่าน'}
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
                  marginTop: 8, padding: 14, borderRadius: 14, background: 'rgba(255,210,90,.16)',
                  border: '1.5px dashed rgba(255,210,90,.7)', textAlign: 'left',
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
                      background: 'var(--fixed-white)', color: TEXT_3, fontWeight: 800, fontSize: 12, textDecoration: 'none',
                    }}
                  >
                    ไปหน้าตั้งรหัสผ่านใหม่ →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--glass-w-85)', marginTop: 16 }}>
            นึกออกแล้ว? <Link to="/login" style={{ color: 'var(--fixed-white)', fontWeight: 800, textDecoration: 'underline' }}>เข้าสู่ระบบ</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
