import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import SceneBackground from '../layout/SceneBackground'
import SoundToggleButton from '../layout/SoundToggleButton'
import LanguageSwitcher from '../layout/LanguageSwitcher'
import ImageWithFallback from '../ui/ImageWithFallback'
import { BADGE_ICONS } from '../../config/iconAssets'
import type { TranslationKey } from '../../i18n/th'
import WelcomeMessageCycler from './WelcomeMessageCycler'
import AppFeaturesFooter from './AppFeaturesFooter'

const SHADOW_HOVER = 'color-mix(in srgb, var(--g700) 45%, transparent)'

// ไม่มีการ์ดพื้นขาวรองแล้ว — ข้อความทุกตัววางบนวิดีโอตรงๆ ความชัดมาจาก overlay ไล่สีของ SceneBackground + เงาตัวอักษรนี้
const TEXT_SHADOW = '0 1px 3px var(--glass-b-60), 0 2px 12px var(--glass-b-45)'

const LOGO_SRC = '/assets/images/logo/Logo.png'

// ประโยคแนะนำแอป — ประโยคที่พูดถึงหมวดเควสจะต่อท้ายด้วยรูปไอคอนหมวดนั้น (แทน emoji เดิม)
const MESSAGES: { key: TranslationKey; icon?: { src: string; fallback: string } }[] = [
  { key: 'welcome.message1' },
  { key: 'welcome.message2', icon: { src: BADGE_ICONS.learningTab, fallback: '📚' } },
  { key: 'welcome.message3', icon: { src: BADGE_ICONS.physicalTab, fallback: '💪' } },
  { key: 'welcome.message4', icon: { src: BADGE_ICONS.mentalTab, fallback: '🌸' } },
]

/**
 * WelcomeModal — หน้าหลัก (Main / Landing Page, route "/")
 * ----------------------------------------------
 * พื้นหลัง: SceneBackground (วิดีโอสลับตามการวางจอ + overlay) — ชุดเดียวกับหน้า auth ทั้งหมด
 *
 * เลย์เอาต์: กลุ่มบน (โลโก้ + หัวข้อ + ข้อความวนสลับ) / กลุ่มล่าง (ปุ่ม) ดันลงล่างจอด้วย marginTop: auto
 * แล้วปิดท้ายด้วย AppFeaturesFooter (ตัวเดียวกับหน้า Login) — ไม่มีการ์ดพื้นขาวครอบ ทุกอย่างวางบนวิดีโอตรงๆ
 *
 * ปุ่ม:
 *  - "เริ่มต้นใช้งาน"                    → /register
 *  - "เป็นสมาชิกอยู่แล้ว? เข้าสู่ระบบ"   → /login
 *
 * ข้อความทุกตัวผ่าน t() ของ LanguageContext — หน้าต้นแบบของระบบแปลภาษา (ไทย ⇄ อังกฤษ)
 */
export default function WelcomeModal() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const messages = useMemo<ReactNode[]>(
    () => MESSAGES.map(({ key, icon }) => (
      <>
        {t(key)}
        {icon && (
          <>
            {' '}
            {/* 1.4em ≈ สูงเท่าตัวอักษร ไม่ดัน line-height (1.6) ให้บรรทัดสูงขึ้น */}
            <ImageWithFallback src={icon.src} fallback={icon.fallback} size="1.4em" inline />
          </>
        )}
      </>
    )),
    [t],
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // เว้นด้านบนให้พ้นแถบปุ่มภาษา/ลำโพงที่ลอยอยู่ (top 16 + สูง 44)
        padding: 'clamp(4.5rem, 10vh, 5.5rem) clamp(1rem, 4vw, 1.5rem) clamp(1.25rem, 4vh, 2rem)',
      }}
    >
      <SceneBackground />

      {/* มุมขวาบน: ปุ่มเลือกภาษา + ปุ่มลำโพง */}
      <LanguageSwitcher />
      <SoundToggleButton floating />

      {/* ── UI ทั้งหมด overlay อยู่บนสุด ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'center',
          maxWidth: '36rem',
          width: '100%',
          color: 'var(--fixed-white)',
          textShadow: TEXT_SHADOW,
        }}
      >
        {/* ── กลุ่มบน: โลโก้ + หัวข้อ + ข้อความแนะนำแอป ── */}
        <div style={{ paddingTop: 'clamp(0rem, 3vh, 3rem)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 'clamp(.25rem, 1.5vh, .75rem)',
              filter: 'drop-shadow(0 8px 24px var(--glass-b-45))',
            }}
          >
            <ImageWithFallback src={LOGO_SRC} fallback="🌱" size="clamp(4rem, min(26vw, 15vh), 9rem)" alt="ARBOR HORIZON" />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--fixed-white)',
              textShadow: '0 2px 4px var(--glass-b-45), 0 6px 24px var(--glass-b-55)',
              lineHeight: 1.1,
              margin: '0 0 clamp(1rem, 3vh, 1.75rem)',
            }}
          >
            <span style={{ display: 'block', fontSize: 'clamp(1.05rem, 3.5vw, 1.35rem)', letterSpacing: '.02em', opacity: .95, marginBottom: '.3rem' }}>
              {t('welcome.titleLead')}
            </span>
            <span style={{ display: 'block', fontSize: 'clamp(1.75rem, 8.5vw, 3.3rem)', letterSpacing: '.03em', overflowWrap: 'anywhere' }}>
              ARBOR HORIZON
            </span>
          </h1>

          <WelcomeMessageCycler messages={messages} style={{ fontWeight: 600, maxWidth: '30rem', marginInline: 'auto' }} />
        </div>

        {/* ── กลุ่มล่าง: ปุ่ม — marginTop auto ดันลงล่างจอ, paddingTop เป็นระยะหายใจขั้นต่ำ ── */}
        <div style={{ marginTop: 'auto', paddingTop: 'clamp(2rem, 8vh, 6rem)', width: '100%', maxWidth: '30rem', marginInline: 'auto' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              width: '100%',
              padding: 'clamp(.85rem, 2.5vh, 1rem) 1.5rem',
              border: 'none',
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--g700), var(--g600))',
              color: 'var(--fixed-white)',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.05rem, 3.8vw, 1.2rem)',
              textShadow: 'none',
              boxShadow: `var(--sh-btn), 0 8px 24px var(--glass-b-30)`,
              cursor: 'pointer',
              transition: 'transform .15s, box-shadow .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 8px 24px ${SHADOW_HOVER}`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'var(--sh-btn), 0 8px 24px var(--glass-b-30)'
            }}
          >
            {t('welcome.getStarted')}
          </button>

          <p style={{ margin: '.9rem 0 0', fontSize: 'clamp(.9rem, 3vw, 1rem)' }}>
            <span style={{ opacity: .85 }}>{t('welcome.alreadyMember')} </span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                border: 'none',
                background: 'none',
                padding: '.25rem .1rem',
                color: 'var(--fixed-white)',
                textShadow: 'inherit',
                fontWeight: 800,
                fontSize: 'inherit',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
              }}
            >
              {t('welcome.logIn')}
            </button>
          </p>
        </div>

        {/* ── ท้ายหน้า: 3 ด้านของแอป + อุปกรณ์ที่รองรับ (ใช้ร่วมกับหน้า Login) ── */}
        <div style={{ marginTop: 'clamp(1.5rem, 5vh, 3rem)' }}>
          <AppFeaturesFooter />
        </div>
      </div>
    </div>
  )
}
