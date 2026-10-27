import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { LEGACY_BACKGROUND_IDS } from '../config/homeBackgrounds'
import type { DecorationPositionMap, PostItData } from '../types'

/*============================================================================*\
  UIContext — [ไฟล์ใหม่ แยกออกจาก AppContext เดิม]
  ────────────────────────────────────────────────────────────────────────────
  รับผิดชอบ: state ที่เปลี่ยนบ่อยที่สุดและไม่ควรลากคนอื่น re-render ตาม
  (โมดัลเปิด/ปิด, ตั้งค่า, แผงย่อ/ขยาย, ตำแหน่งไอเทมที่ผู้ใช้ลากเอง)

  [เพิ่มรอบนี้] settings และ decorationPositions ถูกบันทึกลง localStorage แล้ว
  สองตัวนี้เป็น client state แท้ๆ (ไม่มี model รองรับใน backend และไม่ควรมี)
  เดิมรีเฟรชทีเดียวผู้ใช้ต้องตั้งค่าเสียง/โหมดมืด และจัดวางไอเทมใหม่ทุกครั้ง
\*============================================================================*/

export interface AppSettings {
  darkMode: boolean
  soundEnabled: boolean
  musicVolume: number
  sfxVolume: number
  /** [เพิ่มรอบนี้] โหมดเคร่งครัด — true = เควสจับเวลาทุกตัวต้องทำจนครบเวลาจริง (ไม่มีปุ่มข้าม)
   *  false (ค่าเริ่มต้น) = มีปุ่ม "ข้าม/เก็บครึ่งรางวัล" ให้เลือกระหว่างเล่น ดู GameShell.tsx */
  strictMode: boolean
  /** [เพิ่มรอบนี้ — ข้อ 5] เตือนทำเควสประจำวันตามเวลาที่ตั้ง — ตอนนี้เป็นแค่ toggle+เวลาที่บันทึก
   *  ไว้ฝั่ง client เท่านั้น ยังไม่ได้ต่อกับ push notification จริง (ต้องมี service worker +
   *  backend ส่ง push ตามเวลาจริงถึงจะแจ้งเตือนได้ตอนแอปไม่ได้เปิดอยู่ — ดูสรุปท้ายบทสนทนา) */
  dailyQuestReminderEnabled: boolean
  /** เวลาที่อยากให้เตือน รูปแบบ "HH:MM" (ค่าจาก <input type="time">) */
  dailyQuestReminderTime: string
  /** [เพิ่มรอบนี้ — ข้อ 5] แจ้งเตือนเมื่อมีเควสใหม่ปลดล็อก/ถูกล็อก (เช่นจากผลคัดกรองสุขภาพจิต) */
  questUnlockNotifyEnabled: boolean
  /** พื้นหลังหน้า Home ที่เลือก: 1-2 วิดีโอ (config/homeBackgrounds.ts) · 3-5 วาดด้วยโค้ด (config/homeScenes.ts) */
  homeBackground?: number
  /** แปลงเลขฉากจากลำดับเดิม (วิดีโอ 1-5 + โค้ด 6-8) เป็นลำดับใหม่ไปแล้ว */
  homeBackgroundOrderV2?: boolean
}

const SETTINGS_INITIAL: AppSettings = {
  darkMode: false,
  soundEnabled: true,
  musicVolume: 60,
  sfxVolume: 80,
  strictMode: false,
  dailyQuestReminderEnabled: false,
  dailyQuestReminderTime: '09:00',
  questUnlockNotifyEnabled: true,
}

/** [แก้ตามที่ระบุ] 'inventory' ย้ายเข้าไปเป็นโซนหนึ่งของหน้าโปรไฟล์แล้ว (ดู ProfilePage.tsx)
 * ไม่มีโมดัลแยกของตัวเองอีกต่อไป เปลี่ยนคีย์เป็น 'profile' แทน */
export type ModalKey =
  | 'settings' | 'profile' | 'leaderboard' | 'moodCheckin'
  | 'quests' | 'shop' | 'meditation' | 'brainDump' | 'story' | 'friends'

const MODALS_INITIAL: Record<ModalKey, boolean> = {
  settings: false, profile: false, leaderboard: false, moodCheckin: false,
  quests: false, shop: false, meditation: false, brainDump: false, story: false, friends: false,
}

interface UIContextValue {
  settings: AppSettings
  modals: Record<ModalKey, boolean>
  leaderboardCollapsed: boolean
  decorationPositions: DecorationPositionMap
  activePostIt: PostItData | null
  /** true ถ้ามีโมดัลใดเปิดอยู่ — ใช้หยุดวิดีโอพื้นหลังและงานหนักอื่นๆ */
  anyModalOpen: boolean

  updateSettings: (partial: Partial<AppSettings>) => void
  openModal: (key: ModalKey) => void
  closeModal: (key: ModalKey) => void
  closeAllModals: () => void
  setLeaderboardCollapsed: (updater: (collapsed: boolean) => boolean) => void
  /** [แก้ตามที่ระบุ — ปรับขนาดไอเทมตกแต่งได้อิสระ] scale เป็น parameter ที่ 4 แบบ optional —
   *  จุดเรียกเดิม (ลากปรับตำแหน่ง x/y) ไม่ต้องแก้อะไร ยังไม่ส่ง scale มาก็ได้ (คงค่าเดิมไว้)
   *  จุดเรียกใหม่ (ลากปรับขนาดที่ handle) ส่ง scale เข้ามาคู่กับ x/y ปัจจุบันของไอเทมนั้น */
  updateDecorationPosition: (itemId: string, xPct: number, yPct: number, scale?: number) => void
}

const UICtx = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [settingsRaw, setSettings] = usePersistentState<AppSettings>('settings', SETTINGS_INITIAL)
  // [เพิ่มรอบนี้] usePersistentState แทนที่ค่าทั้งก้อนตรงๆ ไม่ merge กับ default — ผู้ใช้เดิมที่
  // เคย persist settings ไว้ก่อนมี dailyQuestReminderEnabled/dailyQuestReminderTime/
  // questUnlockNotifyEnabled จะไม่มี 3 คีย์นี้เลยใน localStorage (undefined จริงตอน runtime
  // ถึง type จะบอกว่าไม่ใช่ก็ตาม) เติม fallback จาก SETTINGS_INITIAL ตรงนี้จุดเดียว
  const settings = useMemo(() => ({ ...SETTINGS_INITIAL, ...settingsRaw }), [settingsRaw])
  // [แก้ตามที่ระบุ 2026-10-27] ลำดับฉากใหม่: แปลงค่าที่เลือกไว้เดิมครั้งเดียว (3→2, 6→3, 7→4, 8→5 · 2/4/5 ที่ถูกลบ → 1)
  useEffect(() => {
    if (settingsRaw.homeBackgroundOrderV2) return
    setSettings((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ทิ้งคีย์ของระบบเดิม (ตั้งฉาก 6 ให้ทุกคน)
      const { homeSceneDefaultApplied, ...rest } = s as AppSettings & { homeSceneDefaultApplied?: boolean }
      const old = s.homeBackground
      return { ...rest, homeBackground: old === undefined ? undefined : (LEGACY_BACKGROUND_IDS[old] ?? 1), homeBackgroundOrderV2: true }
    })
  }, [settingsRaw.homeBackgroundOrderV2, setSettings])
  const [decorationPositions, setDecorationPositions] =
    usePersistentState<DecorationPositionMap>('decoration-positions', {})

  const [modals, setModals] = useState<Record<ModalKey, boolean>>(MODALS_INITIAL)
  // [แก้ตามที่ระบุ] บนโทรศัพท์เริ่มแบบปิด (เห็นแค่ปุ่ม กดแล้วตารางค่อยออกมา) · จอคอมเปิดไว้เหมือนเดิม
  const [leaderboardCollapsed, setLeaderboardCollapsedState] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )
  const [activePostIt] = useState<PostItData | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')
  }, [settings.darkMode])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...partial }))
  }, [setSettings])

  const openModal = useCallback((key: ModalKey) => setModals((m) => ({ ...m, [key]: true })), [])
  const closeModal = useCallback((key: ModalKey) => setModals((m) => ({ ...m, [key]: false })), [])
  const closeAllModals = useCallback(() => setModals(MODALS_INITIAL), [])

  const setLeaderboardCollapsed = useCallback((updater: (collapsed: boolean) => boolean) => {
    setLeaderboardCollapsedState(updater)
  }, [])

  const updateDecorationPosition = useCallback((itemId: string, xPct: number, yPct: number, scale?: number) => {
    setDecorationPositions((prev) => ({
      ...prev,
      [itemId]: { xPct, yPct, scale: scale ?? prev[itemId]?.scale },
    }))
  }, [setDecorationPositions])

  const anyModalOpen = useMemo(() => Object.values(modals).some(Boolean), [modals])

  const value = useMemo<UIContextValue>(() => ({
    settings, modals, leaderboardCollapsed, decorationPositions, activePostIt, anyModalOpen,
    updateSettings, openModal, closeModal, closeAllModals,
    setLeaderboardCollapsed, updateDecorationPosition,
  }), [
    settings, modals, leaderboardCollapsed, decorationPositions, activePostIt, anyModalOpen,
    updateSettings, openModal, closeModal, closeAllModals,
    setLeaderboardCollapsed, updateDecorationPosition,
  ])

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function useUI(): UIContextValue {
  const ctx = useContext(UICtx)
  if (!ctx) throw new Error('useUI ต้องถูกเรียกใช้ภายใน <UIProvider> เท่านั้น')
  return ctx
}