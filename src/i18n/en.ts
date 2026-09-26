import type { TranslationKey } from './th'

/*============================================================================*\
  en.ts — พจนานุกรมภาษาอังกฤษ
  ────────────────────────────────────────────────────────────────────────────
  Record<TranslationKey, string> = ต้องมีครบทุกคีย์ของ th.ts (ขาดคีย์ไหน typecheck ฟ้อง)
\*============================================================================*/

export const en: Record<TranslationKey, string> = {
  // ── Shared ──
  'common.soundOn': 'Turn sound on',
  'common.soundOff': 'Turn sound off',
  'common.languageMenu': 'Choose language',

  // ── Welcome page (route "/") ──
  'welcome.titleLead': 'Welcome to',
  'welcome.message1': 'Complete small quests every day and watch your tree grow right along with you 🌱',
  'welcome.message2': 'Learn something new each day and your trunk of knowledge grows strong',
  'welcome.message3': 'Move, drink water, rest well, and your roots and soil grow steadier',
  'welcome.message4': 'Care for your heart and your leaves and flowers will bloom every day',
  'welcome.getStarted': 'Get started',
  'welcome.alreadyMember': 'Already a member?',
  'welcome.logIn': 'Log in',

  // ── Page footer (AppFeaturesFooter — shared by Welcome + Login) ──
  'footer.knowledge': 'Knowledge',
  'footer.physical': 'Physical health',
  'footer.mental': 'Mental health',
  'footer.supports': 'Works on 📱 Phone · 💻 Computer · 📟 Tablet · ⌚ Smartwatch',
}
