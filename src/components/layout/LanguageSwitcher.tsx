import { useEffect, useRef, useState } from 'react'
import { useLanguage, type Language } from '../../context/LanguageContext'

// ชื่อภาษาเขียนด้วยภาษานั้นเองเสมอ (ไม่แปล) — ผู้ใช้ต้องหาภาษาของตัวเองเจอแม้ UI จะเป็นอีกภาษา
const OPTIONS: { code: Language; label: string; short: string; flag: string }[] = [
  { code: 'th', label: 'ไทย', short: 'ไทย', flag: '🇹🇭' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
]

/**
 * LanguageSwitcher — ปุ่มเลือกภาษาแบบแคปซูลลอยมุมขวาบน (ซ้ายของ SoundToggleButton floating)
 * กดแล้วเปิดเมนู 2 ภาษา มีเครื่องหมาย ✓ ที่ภาษาปัจจุบัน — ปิดเมนูเมื่อเลือก/คลิกข้างนอก/กด Esc
 */
export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const current = OPTIONS.find((o) => o.code === language) ?? OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    // right: 16 (ขอบจอ) + 44 (ปุ่มลำโพง) + 10 (ช่องไฟ)
    <div ref={rootRef} style={{ position: 'fixed', top: 16, right: 70, zIndex: 50 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('common.languageMenu')}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 44, padding: '0 14px', borderRadius: 99,
          border: '1.5px solid var(--glass-w-50)', background: 'var(--glass-b-35)', backdropFilter: 'blur(8px)',
          color: 'var(--fixed-white)', boxShadow: '0 6px 16px var(--glass-b-30)',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          transition: 'transform .15s ease, background .15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'var(--glass-b-50)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--glass-b-35)' }}
      >
        <span aria-hidden="true" style={{ fontSize: 16 }}>🌐</span>
        {current.short}
        <span aria-hidden="true" style={{ fontSize: 16 }}>{current.flag}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('common.languageMenu')}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 160, padding: 6,
            borderRadius: 16, border: '1.5px solid var(--glass-w-30)', background: 'var(--glass-b-60)',
            backdropFilter: 'blur(12px)', boxShadow: '0 12px 32px var(--glass-b-40)',
          }}
        >
          {OPTIONS.map((o) => {
            const active = o.code === language
            return (
              <button
                key={o.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={o.code}
                onClick={() => { setLanguage(o.code); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: active ? 'var(--glass-w-20)' : 'transparent',
                  color: 'var(--fixed-white)', fontSize: 15, fontWeight: active ? 800 : 600,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--glass-w-10)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span aria-hidden="true" style={{ fontSize: 18 }}>{o.flag}</span>
                <span style={{ flex: 1 }}>{o.label}</span>
                <span aria-hidden="true" style={{ width: 16, visibility: active ? 'visible' : 'hidden' }}>✓</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
