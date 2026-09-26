import type { ReactNode } from 'react'
import SceneBackground from '../layout/SceneBackground'
import SoundToggleButton from '../layout/SoundToggleButton'
import ImageWithFallback from '../ui/ImageWithFallback'

const LOGO_SRC = '/assets/images/logo/Logo.png'

interface AuthLayoutProps {
  title: string
  subtitle?: ReactNode
  /** emoji ที่แสดงแทนโลโก้ถ้าโหลด Logo.png ไม่ได้ (ไอคอนเดิมของแต่ละหน้า) */
  logoFallback: string
  /** ความกว้างสูงสุดของคอลัมน์ฟอร์ม (px) */
  maxWidth?: number
  /** วิดีโอพื้นหลังเฉพาะหน้านี้ — ไม่ส่ง = ใช้วิดีโอค่าเริ่มต้นของ SceneBackground (สลับตามแนวจอ) */
  videoSrc?: string
  /** บล็อกท้ายหน้า (เช่น AppFeaturesFooter) — วางเป็น element สุดท้ายชิดล่างจอ */
  footer?: ReactNode
  children: ReactNode
}

/**
 * AuthLayout — โครงหน้าร่วมของ Login / Register / ForgotPassword / ResetPassword
 * ────────────────────────────────────────────────────────────────────────────
 * พื้นหลังวิดีโอ + overlay ชุดเดียวกับหน้า Welcome (SceneBackground), ปุ่มลำโพงลอยมุมขวาบน,
 * โลโก้ Logo.png + หัวข้อ + คำอธิบาย แล้วตามด้วยฟอร์ม (children) กึ่งกลางจอ และ footer ชิดล่าง
 */
export default function AuthLayout({ title, subtitle, logoFallback, maxWidth = 420, videoSrc, footer, children }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // เว้นด้านบนให้พ้นปุ่มลำโพงที่ลอยอยู่ (top 16 + สูง 44)
        padding: 'clamp(4.5rem, 9vh, 5rem) clamp(1rem, 4vw, 1.5rem) clamp(1.25rem, 4vh, 2rem)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <SceneBackground videoSrc={videoSrc} />
      <SoundToggleButton floating />

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          flex: 1,
          width: '100%',
          maxWidth,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 6px 16px var(--glass-b-50))' }}>
            <ImageWithFallback src={LOGO_SRC} fallback={logoFallback} size="clamp(3.5rem, min(20vw, 12vh), 5.5rem)" alt="ARBOR HORIZON" />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 7vw, 2rem)',
              color: 'var(--fixed-white)',
              margin: '4px 0',
              textShadow: '0 4px 16px var(--glass-b-50)',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: 'var(--glass-w-90)', fontSize: 13, textShadow: '0 2px 6px var(--glass-b-50)', margin: 0 }}>{subtitle}</p>
          )}
        </div>

        {children}
      </div>

      {footer && (
        <div style={{ position: 'relative', zIndex: 3, width: '100%', maxWidth: '30rem', marginTop: 'clamp(1.5rem, 5vh, 3rem)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}
