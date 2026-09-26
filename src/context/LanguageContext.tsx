import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { th, type TranslationKey } from '../i18n/th'
import { en } from '../i18n/en'

/*============================================================================*\
  LanguageContext — [ไฟล์ใหม่] ภาษาของ UI ทั้งแอป (ไทย ⇄ อังกฤษ)
  ────────────────────────────────────────────────────────────────────────────
  ไม่ได้เพิ่ม dependency (react-i18next ฯลฯ) — แอปมีแค่ 2 ภาษา ไม่ต้องการ plural/ICU
  context + พจนานุกรมธรรมดาพอ และตรงกับแพทเทิร์น context อื่นในโปรเจกต์
  (UIContext/ProgressContext)

  ค่าเริ่มต้น 'th' — ผู้ใช้ที่ไม่เคยแตะปุ่มภาษาได้ประสบการณ์เดิมทุกอย่าง
  ภาษาที่เลือกเก็บด้วย usePersistentState (localStorage key "bloom:language")

  ใช้งาน:
      const { t, language, setLanguage } = useLanguage()
      <button>{t('welcome.getStarted')}</button>
\*============================================================================*/

export type Language = 'th' | 'en'

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { th, en }

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  /** แปลคีย์เป็นข้อความตามภาษาปัจจุบัน — ไม่เจอคำแปลจะตกไปใช้ภาษาไทย → fallback → ตัวคีย์เอง */
  t: (key: TranslationKey, fallback?: string) => string
}

const LanguageCtx = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setLanguage] = usePersistentState<Language>('language', 'th')
  // กันค่าเสียใน localStorage (แก้มือ/เวอร์ชันเก่า) — ไม่ใช่ 'en' ถือเป็นไทยทั้งหมด
  const language: Language = stored === 'en' ? 'en' : 'th'

  // ให้ <html lang> ตรงกับภาษาจริง — screen reader อ่านออกเสียงถูกภาษา + เบราว์เซอร์ตัดคำถูก
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useCallback(
    (key: TranslationKey, fallback?: string) => DICTIONARIES[language][key] ?? th[key] ?? fallback ?? key,
    [language],
  )

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageCtx)
  if (!ctx) throw new Error('useLanguage ต้องใช้ภายใน <LanguageProvider> เท่านั้น')
  return ctx
}
