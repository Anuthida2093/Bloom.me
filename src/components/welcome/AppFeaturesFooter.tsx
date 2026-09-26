import { useLanguage } from '../../context/LanguageContext'
import { BADGE_ICONS } from '../../config/iconAssets'
import ImageWithFallback from '../ui/ImageWithFallback'
import type { TranslationKey } from '../../i18n/th'

// ไอคอนหมวดเควส (ไฟล์ชุดเดียวกับแท็บเควส) + emoji สำรองถ้าโหลดรูปไม่ได้
const CATEGORIES: { icon: string; fallback: string; label: TranslationKey }[] = [
  { icon: BADGE_ICONS.learningTab, fallback: '📚', label: 'footer.knowledge' },
  { icon: BADGE_ICONS.physicalTab, fallback: '🍃', label: 'footer.physical' },
  { icon: BADGE_ICONS.mentalTab, fallback: '🌸', label: 'footer.mental' },
]

/**
 * AppFeaturesFooter — บล็อกท้ายหน้า: 3 ด้านของแอป (ไอคอนหมวดเควส + ชื่อด้าน 1 บรรทัด) + อุปกรณ์ที่รองรับ
 * ใช้ร่วมกันระหว่างหน้า Welcome และหน้า Login — แก้ที่นี่ที่เดียว ทั้งสองหน้าตรงกันเสมอ
 * วางเป็น element สุดท้ายของหน้า บนพื้นวิดีโอ (ข้อความขาว + เงาตัวอักษร ไม่มีกล่องรอง)
 */
export default function AppFeaturesFooter() {
  const { t } = useLanguage()

  return (
    <footer
      style={{
        width: '100%',
        textAlign: 'center',
        color: 'var(--fixed-white)',
        textShadow: '0 1px 3px var(--glass-b-60), 0 2px 12px var(--glass-b-45)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(.5rem, 2vw, .75rem)' }}>
        {CATEGORIES.map((c) => (
          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ filter: 'drop-shadow(0 2px 6px var(--glass-b-45))' }}>
              <ImageWithFallback src={c.icon} fallback={c.fallback} size="clamp(1.6rem, 6vw, 1.9rem)" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(.85rem, 3.2vw, 1rem)', fontWeight: 600, lineHeight: 1.25 }}>
              {t(c.label)}
            </span>
          </div>
        ))}
      </div>
      <p style={{ margin: '.75rem 0 0', fontSize: 12, opacity: .9 }}>{t('footer.supports')}</p>
    </footer>
  )
}
