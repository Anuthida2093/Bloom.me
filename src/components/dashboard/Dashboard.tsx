import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useLanguage } from '../../context/LanguageContext'
import { toBlob } from 'html-to-image'
import TreeOfLife from '../tree/TreeOfLife'
import LeaderboardPanel from '../leaderboard/LeaderboardPanel'
import PlayerTreeCard from '../leaderboard/PlayerTreeCard'
import TreeStatsPanel from '../tree/TreeStatsPanel'
import NotificationPanel from './NotificationPanel'
import WateringCanFx from './WateringCanFx'
import MedicalBoxAlert from './MedicalBoxAlert'
import RankUpModal from './RankUpModal'
import ActionMenuBar from '../layout/ActionMenuBar'
import type { NavKey } from '../layout/ActionMenuBar'
import ErrorBoundary from '../common/ErrorBoundary'
import GameAlert from '../ui/GameAlert'
import { useUser } from '../../context/UserContext'
import { useProgress } from '../../context/ProgressContext'
import { useUI } from '../../context/UIContext'
import { useMental } from '../../context/MentalContext'
import { useAudio } from '../../context/AudioContext'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { useNotifications } from '../../hooks/useNotifications'
import { usePersistentState } from '../../hooks/usePersistentState'
import { sceneEnter } from '../../config/motion'
import { EXP_PER_LEVEL, STACK_PER_VISUAL_LEVEL, type MbtiType, type QuestCategory, type PostItData } from '../../types'
import type { LeaderboardPlayer } from '../../config/leaderboardData'
import type { QuestTabId } from '../../config/questCatalog'
import { BADGE_ICONS } from '../../config/iconAssets'
import './Dashboard.css'
import '../leaderboard/leaderboardRow.css'

// โมดัลหนัก — โหลดเฉพาะตอนผู้ใช้เปิดจริง (คงไว้ตาม V2 ทุกจุด)
const loadQuestSection = () => import('../quest/QuestSection')
const loadShopSection = () => import('../shop/ShopSection')
const loadProfilePage = () => import('../profile/ProfilePage')
const loadMoodCheckIn = () => import('../mood/MoodCheckIn')
const QuestSection = lazy(loadQuestSection)
const ShopSection = lazy(loadShopSection)
// [แก้ตามที่ระบุ] InventoryModal เดิมถูกยุบเข้าไปเป็นโซนหนึ่งของหน้าโปรไฟล์แล้ว (ดู ProfilePage.tsx)
const ProfilePage = lazy(loadProfilePage)
const SettingsModal = lazy(() => import('../settings/SettingsModal'))
const Leaderboard = lazy(() => import('../leaderboard/Leaderboard'))
const MoodCheckIn = lazy(loadMoodCheckIn)
const MeditationModal = lazy(() => import('../mood/MeditationModal'))
const BrainDumpModal = lazy(() => import('../mood/BrainDumpModal'))
const StreakCelebration = lazy(() => import('../modals/StreakCelebration'))
const PostItModal = lazy(() => import('../modals/PostItModal'))
import PostItLayer from './PostItLayer'
import HomeAmbience from './HomeAmbience'
import OverCalorieNotice from './OverCalorieNotice'
import PlantIntro from './PlantIntro'
import { computeCalorieTarget, getOverCalorieStreak, MEALS_CHANGED_EVENT, OVER_CALORIE_STREAK_DAYS } from '../../utils/nutrition'
const TreeSummaryModal = lazy(() => import('../tree/TreeSummaryModal'))
// [ใหม่ — ฟีเจอร์สตอรี่] เดิมปุ่มนี้ชื่อ "โพสต์" (📝) เป็น placeholder ล้วนๆ (setInfoAlert
// เฉยๆ) ตอนนี้เปลี่ยนเป็น "สตอรี่" เปิดหน้า Feed/Search/Activity/Profile ภายในตัวเองจริง
const StoryOverlay = lazy(() => import('../story/StoryOverlay'))
// [ใหม่ — ข้อ B] หน้า "เพื่อน" แบบง่ายที่สุด เปิดจากปุ่มมุมขวาล่าง 👥 (คนละหน้ากับ
// FriendsListPanel.tsx ที่อยู่ใน sidebar ของ StoryOverlay)
const FriendsPage = lazy(() => import('../friends/FriendsPage'))

const DAY_MS = 1000 * 60 * 60 * 24
const ALL_MODAL_KEYS = ['quests', 'shop', 'profile', 'settings', 'leaderboard', 'moodCheckin', 'meditation', 'brainDump', 'story', 'friends'] as const

/** วิดีโอพื้นหลังเลื่อนตามฉากต้นไม้กี่เท่า (0 = นิ่ง, 1 = เท่าฉาก) */
const BG_PARALLAX = 0.25

export default function Dashboard() {
  const {
    userData, treeStats, inventoryData, placedItems,
    isLoggedIn, isGuest, setLoggedIn,
    streakCelebrationDays, setStreakCelebrationDays,
    handleBuy, handleEquip, handleClaimStreakReward, updateProfile,
    changePassword, deleteAccount,
  } = useUser()

  const {
    questLogs, moodEntries, journalEntries, treeGrowthPulse, hasSoot, completedQuestCount,
    waterPulseKey, handleToggleQuest, markIncineratorFailed, triggerWateringEffect,
  } = useProgress()

  const { handleMoodSubmit, earnedBadges, postIts, movePostIt, archivePostIt } = useMental()
  const { isMuted, toggleMute } = useAudio()
  const { t } = useLanguage()

  const {
    settings, modals, leaderboardCollapsed, decorationPositions, activePostIt, anyModalOpen,
    updateSettings, openModal, closeModal, closeAllModals, setLeaderboardCollapsed, updateDecorationPosition,
  } = useUI()

  /* [แก้บั๊ก — ตามที่ระบุ] เข้าสู่ระบบ/สมัครสมาชิกแล้วต้องเข้าหน้า Home ก่อนเสมอ — สถานะป็อปอัพเก็บอยู่ใน
     UIContext (อยู่เหนือทุกหน้า) ออกจากระบบจากหน้าตั้งค่าแล้วค่า settings:true ค้างอยู่ เข้าระบบใหม่เลยเด้ง
     หน้าตั้งค่าขึ้นมาทันที → เข้าหน้า Home ทุกครั้งปิดป็อปอัพที่ค้างทั้งหมดก่อน */
  useEffect(() => { closeAllModals() }, [closeAllModals])

  const [viewingPlayer, setViewingPlayer] = useState<LeaderboardPlayer | null>(null)
  const [showTreeSummary, setShowTreeSummary] = useState(false)
  /** โพสอิทบนต้นไม้ที่กดเปิดอ่านอยู่ */
  const [openPostIt, setOpenPostIt] = useState<PostItData | null>(null)
  const [showTreeStats, setShowTreeStats] = useState(false)
  /** [แก้ตามที่ระบุ] การ์ดต้นไม้เพื่อนเปิด/ปิดได้ — เก็บ id เพื่อนที่ถูกปิดการ์ดไว้ (ดูคนใหม่ = เปิดการ์ดเองอีกครั้ง) */
  const [hiddenFriendCardId, setHiddenFriendCardId] = useState<string | null>(null)
  const friendCardOpen = !!viewingPlayer && hiddenFriendCardId !== viewingPlayer.id
  /* [แก้ตามที่ระบุ] การ์ดข้อมูลต้นไม้เพื่อนปิดเองเมื่อแตะที่อื่นบนหน้าจอ (ไม่ต้องกดกากบาท) —
     ยกเว้นแตะในการ์ดเอง หรือปุ่มต้นไม้ที่ใช้เปิด/ปิดการ์ด */
  useEffect(() => {
    if (!friendCardOpen || !viewingPlayer) return
    const playerId = viewingPlayer.id
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (target?.closest('.player-tree-card, .dashboard__friend-card-toggle')) return
      setHiddenFriendCardId(playerId)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [friendCardOpen, viewingPlayer])
  /** [เพิ่มตามที่ระบุ — ปุ่มแจ้งเตือนใหม่] แผงเดียวกับ showTreeStats แต่คนละปุ่ม — ปิดกันเอง
   *  เสมอ (เปิดอันนึงต้องปิดอีกอันเสมอ) กันแผงสองอันซ้อนกันแน่นในคอลัมน์ขวาแคบๆ */
  const [showNotifications, setShowNotifications] = useState(false)

  /* ความสูงจริงของแถบคะแนนด้านบน → --hud-h (จอเล็กใช้วางกระดานจัดอันดับ/ปุ่มขวาให้ต่ำกว่าแถบนี้
     ดู Dashboard.css) — วัดใหม่ทุกครั้งที่ขนาดเปลี่ยน เช่น ป้ายขึ้นบรรทัดใหม่บนจอแคบ */
  const hudRef = useRef<HTMLDivElement | null>(null)

  /* [แก้ตามที่ระบุ] ฉากรับต้นกล้าหลังเลือก MBTI — หน้า Home ซ่อนต้นไม้/ปุ่มไว้ก่อน แล้วค่อยปรากฏพร้อมกัน */
  const [introPhase, setIntroPhase] = useState<'play' | 'reveal' | null>(() => {
    try { return sessionStorage.getItem('bloom.plantIntro') === '1' ? 'play' : null } catch { return null }
  })
  const finishIntro = useCallback(() => {
    try { sessionStorage.removeItem('bloom.plantIntro') } catch { /* ไม่เป็นไร */ }
    setIntroPhase(null)
  }, [])

  /* [แก้ตามที่ระบุ] ทานเกินแคลอรี่ที่กำหนดติดต่อกันหลายวัน → ก้อนหินบนพื้นดิน + กรอบข้อความเตือน
     คำนวณจากมื้ออาหารที่บันทึกในเควส "แคลอรี่ตาม BMI" (utils/nutrition.ts) — อัปเดตทันทีที่บันทึกมื้อ */
  const calorieTarget = computeCalorieTarget(userData)
  const [overCalorieStreak, setOverCalorieStreak] = useState(() => getOverCalorieStreak(userData.id, calorieTarget))
  useEffect(() => {
    const refresh = () => setOverCalorieStreak(getOverCalorieStreak(userData.id, calorieTarget))
    refresh()
    window.addEventListener(MEALS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(MEALS_CHANGED_EVENT, refresh)
  }, [userData.id, calorieTarget])
  const showOverCalorie = overCalorieStreak >= OVER_CALORIE_STREAK_DAYS
  useEffect(() => {
    const el = hudRef.current
    if (!el) return
    const root = document.documentElement
    const apply = () => root.style.setProperty('--hud-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => { observer.disconnect(); root.style.removeProperty('--hud-h') }
    // แถบคะแนนแสดงเฉพาะบางสถานะ (ไม่แสดงตอนดูต้นไม้เพื่อน/ยังไม่ล็อกอิน) — วัดใหม่เมื่อมันโผล่กลับมา
  }, [viewingPlayer, isLoggedIn, isGuest])

  /* [แก้ตามที่ระบุ — เปิดเควสไม่ลื่น] โหลดโค้ดของแผงหลัก (เควส/ร้านค้า/โปรไฟล์/เช็คอินอารมณ์)
     ล่วงหน้าตอนหน้า Home ว่าง — กดเปิดครั้งแรกจะขึ้นทันทีพร้อมกันทั้งหน้า ไม่มีช่วงจอว่าง
     (Suspense fallback) ระหว่างรอดาวน์โหลดโค้ดแล้วค่อยเด้งเนื้อหาตามมาทีหลัง */
  useEffect(() => {
    const warm = () => { void loadQuestSection(); void loadMoodCheckIn(); void loadShopSection(); void loadProfilePage() }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm)
      return () => w.cancelIdleCallback?.(id)
    }
    const id = window.setTimeout(warm, 1200)
    return () => window.clearTimeout(id)
  }, [])

  /* [แก้ตามที่ระบุ] แตะตรงไหนก็ได้นอกแผงขวา (เช่น กดต้นไม้แล้วข้อมูล MBTI เด้งขึ้นมา) → ปิดแผง
     ข้อมูลต้นไม้/แจ้งเตือนอัตโนมัติ — ยกเว้นแตะในคอลัมน์ขวาเอง (ปุ่ม/ตัวแผง) และในแผงแบบเต็มจอ */
  useEffect(() => {
    if (!showTreeStats && !showNotifications) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (target?.closest('.dashboard__right-cluster, .tree-of-life__tooltip-screen')) return
      setShowTreeStats(false)
      setShowNotifications(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showTreeStats, showNotifications])
  const { items: notificationItems, unreadCount: unreadNotifCount, markAllSeen: markNotificationsSeen, markRead: markNotificationRead } = useNotifications()
  /** พาไปเปิดโพสต์ที่เกี่ยวข้องใน Story ตอนกดแจ้งเตือนไลค์/คอมเมนต์/แชร์ — ส่งต่อเป็น
   *  initialPostId ของ StoryOverlay (ดู handleOpenNotificationPost ด้านล่าง) */
  const [storyInitialPostId, setStoryInitialPostId] = useState<string | null>(null)
  const [questsInitialTab, setQuestsInitialTab] = useState<QuestTabId>('knowledge')
  /** เควสที่ต้องเปิดหน้าเล่นทันทีตอนเปิดหน้าเควส (มาจากแจ้งเตือน) — เปิดทางอื่นจะล้างทิ้ง */
  const [questsInitialQuest, setQuestsInitialQuest] = useState<{ code: string; key: number } | null>(null)
  /** [ใหม่ — ฟีเจอร์สตอรี่ ข้อ 5] ให้ปุ่ม "แก้ไขโปรไฟล์" ในหน้าโปรไฟล์ Story เปิด SettingsModal
   *  ตรงไปที่หน้าย่อย "ตั้งค่าโปรไฟล์" เลย — reset กลับเป็น null ทุกครั้งที่เปิด Settings
   *  จากทางอื่น (ปุ่มเฟืองปกติ) กันค้างจากรอบก่อนแล้วเด้งผิดหน้าโดยไม่ได้ตั้งใจ */
  const [settingsInitialSubModal, setSettingsInitialSubModal] = useState<'profile' | null>(null)
  /** ข้อความแจ้งผลปุ่มแชร์ (เช่น copy link fallback ตอนเบราว์เซอร์ไม่รองรับ navigator.share) */
  const [infoAlert, setInfoAlert] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  /* ลากฉากต้นไม้ซ้าย-ขวา → วิดีโอพื้นหลังเลื่อนตามช้ากว่า (BG_PARALLAX เท่า) ให้รู้สึกว่าฉากหลังอยู่ไกล
     วิดีโอกว้างขึ้นเท่าระยะที่ต้องเลื่อน (ไม่เห็นขอบว่าง) — ใส่ style ตรงที่ DOM ไม่ re-render ทั้งหน้า */
  const handleTreePan = useCallback((pan: number, range: number) => {
    const v = videoRef.current
    if (!v) return
    const extra = range * BG_PARALLAX
    v.style.left = `${-extra / 2}px`
    v.style.width = `calc(100% + ${extra}px)`
    v.style.transform = `translate3d(${(pan + range / 2) * BG_PARALLAX}px, 0, 0)`
  }, [])
  /** [ใหม่ — ข้อ C] ครอบเฉพาะ "ต้นไม้ของตัวเอง" (ไม่รวม HUD/ปุ่ม) — ให้แชร์เป็นรูปได้เฉพาะ
   *  ต้นไม้จริงๆ ไม่ใช่ทั้งหน้าจอ ดู handleShare ด้านล่าง */
  const treeCaptureRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  // [หมายเหตุ react-hooks/purity] Date.now() ในนี้จำเป็นต้องอ่าน "เวลาปัจจุบันจริง" เทียบกับ
  // เวลาที่สุ่มไพ่ล่าสุด ไม่ใช่ค่าคงที่ที่ derive จาก questLogs ได้เพียวๆ — ยังตรึงด้วย useMemo
  // ตาม questLogs เหมือนเดิม เพื่อไม่ให้คำนวณซ้ำทุก render
  const daysSinceLastOracle = useMemo(() => {
    let latest = 0
    for (const log of questLogs) {
      if (log.quest?.code !== 'ment-oracle-activation') continue
      if (log.status !== 'COMPLETED' || !log.completedAt) continue
      const t = new Date(log.completedAt).getTime()
      if (t > latest) latest = t
    }
    // eslint-disable-next-line react-hooks/purity
    return latest === 0 ? null : Math.floor((Date.now() - latest) / DAY_MS)
  }, [questLogs])

  /* [ใหม่ — ตามที่ระบุรอบนี้] "state overlay" (healthy/wilting/dying) ของต้นไม้ต้องใช้จำนวน
     วันที่ไม่ได้ทำเควสสำเร็จ "ต่อหมวด" — ระบบนี้ไม่เคยมีมาก่อน (ตรวจโค้ดจริงแล้ว มีแค่
     daysSinceLastOracle ด้านบนซึ่งผูกกับเควสเดียวเจาะจง) จึง generalize เป็นฟังก์ชันเดียว
     ใช้ pattern เดียวกับ daysSinceLastOracle เป๊ะ แต่หาต่อ "หมวดเควส" แทน "quest code เดียว" */
  const daysSinceLastQuestByCategory = useMemo(() => {
    const latestByCategory: Partial<Record<QuestCategory, number>> = {}
    for (const log of questLogs) {
      const category = log.quest?.category
      if (!category || log.status !== 'COMPLETED' || !log.completedAt) continue
      const t = new Date(log.completedAt).getTime()
      if (!latestByCategory[category] || t > latestByCategory[category]!) latestByCategory[category] = t
    }
    const toDays = (t: number | undefined) => (t === undefined ? null : Math.floor((now - t) / DAY_MS))
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    return {
      EMOTION: toDays(latestByCategory.EMOTION),
      HEALTH: toDays(latestByCategory.HEALTH),
    }
  }, [questLogs])

  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 8] ป๊อปอัพแจ้งเลื่อนอันดับ — เก็บ "อันดับก่อนหน้า" ไว้ใน
     localStorage (client state ล้วนๆ ไม่ใช่ข้อมูล backend — ตรงตาม convention ของ
     usePersistentState) เทียบกับอันดับปัจจุบันที่ LeaderboardPanel คำนวณจริงแล้วส่งขึ้นมา
     ผ่าน onMyRankChange ทุกครั้งที่ leaderboard คำนวณใหม่ (ดู handleMyRankChange ด้านล่าง) */
  const [lastKnownRank, setLastKnownRank] = usePersistentState<number | null>('last-known-rank', null)
  const [rankUpInfo, setRankUpInfo] = useState<{ from: number; to: number } | null>(null)

  const handleMyRankChange = (rank: number) => {
    // อันดับดีขึ้น (เลขน้อยลง) เทียบกับครั้งก่อน และไม่ใช่ครั้งแรกที่ยังไม่เคยมีข้อมูลเก่า
    // (lastKnownRank === null) → เปิด popup แจ้ง
    if (lastKnownRank !== null && rank < lastKnownRank) {
      setRankUpInfo({ from: lastKnownRank, to: rank })
    }
    if (rank !== lastKnownRank) {
      setLastKnownRank(rank)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => {
      const shouldPause = anyModalOpen || document.hidden || reducedMotion
      if (shouldPause) video.pause()
      else video.play().catch(() => {})
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [anyModalOpen, reducedMotion])

  useEffect(() => {
    const days = userData.streak
    if (days !== 7 && days !== 30) return
    const rewardItem = days === 7 ? 'golden-crown' : 'glowing-butterfly'
    if (!inventoryData.some((i) => i.shopItemId === rewardItem)) {
      setStreakCelebrationDays(days)
    }
  }, [userData.streak, inventoryData, setStreakCelebrationDays])

  /** [แก้บั๊ก] ปุ่มหลักของ ActionMenuBar (เควส/ร้านค้า/ไอเทม/ตั้งค่า) ต้องเปิดทีละแผงเดียว
   *  เดิม openModal() แค่ตั้ง flag ของ key นั้นเป็น true เฉยๆ ไม่ได้ปิด flag อื่นที่ค้างอยู่
   *  เช่น เปิดร้านค้าอยู่แล้วกด "เควส" จะได้ shop:true และ quests:true พร้อมกัน ทำให้เห็น
   *  เนื้อหาเก่า (ร้านค้า) ค้างอยู่หลังเมนูลอย — ฟังก์ชันนี้ปิด "แผงหลัก" อื่นทั้งหมดก่อนเปิด
   *  แผงใหม่เสมอ (ไม่แตะ moodCheckin/meditation/brainDump/leaderboard เพราะพวกนั้นตั้งใจ
   *  ให้เด้งซ้อนทับแผงหลักได้ เช่น เช็คอินอารมณ์ที่เด้งจากกลางหน้าเควส) */
  const MAIN_PANEL_KEYS = ['quests', 'shop', 'profile', 'settings', 'story', 'friends'] as const
  const openMainPanel = (key: typeof MAIN_PANEL_KEYS[number]) => {
    MAIN_PANEL_KEYS.forEach((k) => { if (k !== key) closeModal(k) })
    openModal(key)
    setQuestsInitialQuest(null)
  }

  const handleOpenOracleFromTooltip = () => {
    setQuestsInitialTab('mental')
    openMainPanel('quests')
  }

  const handleOpenQuestCategory = (tab: QuestTabId) => {
    setQuestsInitialTab(tab)
    openMainPanel('quests')
  }

  /** [เพิ่มตามที่ระบุ] กดแจ้งเตือนเควส (ปลดล็อกใหม่/ทำสำเร็จวันนี้) → เปิดหมวดที่เกี่ยวข้อง
   *  reuse handleOpenQuestCategory ตัวเดียวกับที่ oracle-nudge ใช้อยู่แล้ว */
  const handleOpenNotificationQuest = (tab: QuestTabId, questCode?: string) => {
    setShowNotifications(false)
    handleOpenQuestCategory(tab)
    // [แก้ตามที่ระบุ] แจ้งเตือนของเควสไหน → เปิดหน้าเล่นเควสนั้นเลย
    if (questCode) setQuestsInitialQuest({ code: questCode, key: Date.now() })
  }

  /** [เพิ่มตามที่ระบุ] กดแจ้งเตือนไลค์/คอมเมนต์/แชร์ → เปิด Story ไปที่โพสต์นั้นตรงๆ */
  const handleOpenNotificationPost = (postId: string) => {
    setShowNotifications(false)
    setStoryInitialPostId(postId)
    openMainPanel('story')
  }

  /** ปุ่ม "หน้าแรก" ใน Liquid Nav — ปิดทุกโมดัลที่เปิดอยู่ กลับมาที่ต้นไม้เต็มจอ */
  const handleGoHome = () => {
    ALL_MODAL_KEYS.forEach((key) => closeModal(key))
    setShowTreeStats(false)
    setShowNotifications(false)
    setStoryInitialPostId(null)
    setViewingPlayer(null)
  }

  /** [ใหม่ — ฟีเจอร์สตอรี่ ข้อ 15] ปุ่ม "ดูต้นไม้" ในหน้าโปรไฟล์ Story (ทั้งของตัวเองและคนอื่น)
   *  — reuse viewingPlayer pattern เดิมของหน้าจัดอันดับเป๊ะ ปิด Story overlay ก่อนเสมอเพราะ
   *  ต้นไม้อยู่ชั้นล่างสุด (z-index 500 ของ Story ครอบทับอยู่) ไม่งั้นเห็นแต่ Story ค้างอยู่
   *  player = null หมายถึง "ต้นไม้ตัวเอง" (ค่าเริ่มต้นของ Dashboard เมื่อ viewingPlayer ว่าง) */
  const handleViewTreeFromStory = (player: LeaderboardPlayer | null) => {
    closeModal('story')
    setViewingPlayer(player)
  }

  /** [ใหม่ — ข้อ B] คลิกแถวในหน้า "เพื่อน" (มุมขวาล่าง) — reuse viewingPlayer pattern เป๊ะ
   *  เดียวกับ handleViewTreeFromStory ด้านบน แค่ปิด modal 'friends' แทน 'story' */
  const handleViewFriendFromPage = (player: LeaderboardPlayer) => {
    closeModal('friends')
    setViewingPlayer(player)
  }

  /** [ใหม่ — ฟีเจอร์สตอรี่ ข้อ 5] เปิด SettingsModal ตรงไปที่หน้าย่อยโปรไฟล์ จากปุ่ม
   *  "แก้ไขโปรไฟล์" ในหน้าโปรไฟล์ Story — ใช้ openMainPanel เหมือนแผงหลักอื่นๆ ทุกจุด (ปิด
   *  Story ก่อนเปิด Settings) เพราะทั้งสองแผงใช้ z-index ชั้นเดียวกัน (.dashboard__modal-layer)
   *  ถ้าเปิดซ้อนกันโดยไม่ปิดอันเดิม จะวางซ้อนกันตามลำดับ DOM แทนที่จะมีอันใดลอยทับอันไหนจริง */
  const handleOpenProfileSettingsFromStory = () => {
    setSettingsInitialSubModal('profile')
    openMainPanel('settings')
  }

  /** [แก้ข้อ C] ปุ่มแชร์มุมขวาล่าง — แชร์เฉพาะ "รูปต้นไม้" (TreeOfLife) ไม่ใช่ทั้งแดชบอร์ด
   *  ทั้งกระดาน ต้นไม้เป็น DOM ล้วน (ภาพ <img> ซ้อนกันหลายชั้น ไม่ใช่ canvas/WebGL — ดู
   *  TreeOfLife.tsx) จึงต้องใช้ html-to-image (เบาที่สุดในบรรดา DOM→image ที่มี ไลบรารีเดียว
   *  ไม่มี dependency ย่อยเพิ่ม) แปลง treeCaptureRef เป็น PNG blob ก่อน แล้วค่อยส่งต่อ
   *
   *  navigator.share({ files }) ใช้ได้จริงเฉพาะเบราว์เซอร์/อุปกรณ์ที่รองรับ "แชร์ไฟล์"
   *  (ส่วนใหญ่คือมือถือ — desktop Chrome/Firefox/Safari ส่วนมากยังไม่รองรับ) เช็คด้วย
   *  navigator.canShare({ files }) ก่อนเสมอ ถ้าไม่รองรับ fallback เป็น "ดาวน์โหลดไฟล์รูป"
   *  แทน (เลือกดาวน์โหลดแทนการ copy รูปเข้าคลิปบอร์ด เพราะ Clipboard API ฝั่งรูปภาพต้องขอ
   *  permission เพิ่มและรองรับไม่ทั่วถึงเท่าการดาวน์โหลดไฟล์ธรรมดา ผู้ใช้ desktop ที่ดาวน์โหลด
   *  ได้ไฟล์ .png ไปแนบเข้าแอปแชร์อะไรก็ได้เองทันที ไม่ต้องพึ่ง API เฉพาะทางของเบราว์เซอร์) */
  const handleShare = async () => {
    const node = treeCaptureRef.current
    if (!node) return

    // [แก้บั๊กร้ายแรงที่พบจากการทดสอบจริง] html-to-image (toBlob) ต้องอ่านสไตล์ชีตทั้งหน้าเพื่อ
    // คำนวณ CSS ที่ใช้จริง — ถ้ามีสไตล์ชีตนอกโดเมน (เช่น Google Fonts ใน index.css) และเครือข่าย
    // ตอนนั้นเข้าถึงโดเมนนั้นไม่ได้ (ไฟร์วอลล์/adblock/บล็อกโดยนโยบายองค์กร/แซนด์บ็อกซ์ทดสอบ)
    // การ fetch จะค้างไม่ resolve ไม่ reject เลยแม้จะใส่ skipFonts แล้วก็ตาม (ทดสอบจริงยืนยันว่า
    // ค้างนานเกิน 8 วินาทีไม่มีทีท่าจะจบ) — ห่อด้วย timeout กันพังแบบไม่มีขอบเขต ผู้ใช้จะได้เห็น
    // ข้อความ "ลองใหม่อีกครั้ง" แทนการค้างปุ่มแชร์ไปตลอดกาลโดยไม่มีอะไรเกิดขึ้นเลย
    const TREE_CAPTURE_TIMEOUT_MS = 8000
    const captureWithTimeout = Promise.race([
      toBlob(node, { pixelRatio: 2, cacheBust: true, skipFonts: true }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TREE_CAPTURE_TIMEOUT_MS)),
    ])
    const blob = await captureWithTimeout.catch(() => null)
    if (!blob) {
      setInfoAlert('สร้างรูปต้นไม้ไม่สำเร็จ ลองใหม่อีกครั้งนะ')
      return
    }

    const file = new File([blob], 'arbor-horizon-tree.png', { type: 'image/png' })
    const shareData = {
      files: [file],
      title: 'ARBOR HORIZON',
      text: 'ต้นไม้แห่งชีวิตของฉันใน ARBOR HORIZON 🌱',
    }

    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData)
      } catch {
        // ผู้ใช้กดยกเลิก share sheet เอง — ไม่ใช่ error ที่ต้องแจ้งอะไรต่อ
      }
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'arbor-horizon-tree.png'
    a.click()
    URL.revokeObjectURL(url)
    setInfoAlert('ดาวน์โหลดรูปต้นไม้แล้ว! เอาไปแชร์ต่อได้เลย 🌳')
  }

  /** [ใหม่] แปลงคะแนนสะสม 3 หมวดของ "คนอื่น" เป็น level ต้นไม้ — สูตรเดียวกับที่
   *  UserContext ใช้แปลงของเราเอง (STACK_PER_VISUAL_LEVEL = 50 คะแนนต่อ 1 level) */
  const viewingTreeStats = viewingPlayer ? {
    trunkBranchLevel: Math.max(1, Math.floor(viewingPlayer.knowledgeStack / STACK_PER_VISUAL_LEVEL) + 1),
    leafFlowerLevel: Math.max(1, Math.floor(viewingPlayer.emotionStack / STACK_PER_VISUAL_LEVEL) + 1),
    grassSoilLevel: Math.max(1, Math.floor(viewingPlayer.healthStack / STACK_PER_VISUAL_LEVEL) + 1),
  } : null

  const expIntoLevel = userData.exp % EXP_PER_LEVEL

  /** [แก้ตามที่ระบุ] ไอคอนที่ไฮไลต์ใน ActionMenuBar ต้องอิงจาก modal ที่เปิดอยู่จริงเสมอ —
   *  ไม่ว่าจะถูกเปิดจากปุ่มไหนก็ตาม (กันปัญหาไอคอนค้าง/ไม่ตรงกับหน้าจอที่เห็นจริง)
   *  [แก้ตามที่ระบุ] ตัดกิ่ง 'settings' ออก — ตั้งค่าไม่ได้อยู่ใน ActionMenuBar (4 ปุ่ม) อีกต่อไป
   *  เปิดจากปุ่มตั้งค่าในคลัสเตอร์ปุ่มลอยขวา (ใต้ปุ่มสถานะต้นไม้) แทน ไม่มีไอคอนในแถบล่างให้ไฮไลต์
   *  (ตกไปที่ 'home' ตามค่าเริ่มต้น) */
  const activeNavKey: NavKey = modals.quests
    ? 'quests'
    : modals.shop
      ? 'shop'
      : modals.profile
        ? 'profile'
        : modals.story
          ? 'story'
          : 'home'

  return (
    <div className={`dashboard${introPhase === 'play' ? ' dashboard--intro' : introPhase === 'reveal' ? ' dashboard--intro-reveal' : ''}`}>
      {introPhase && (
        <PlantIntro
          mbtiType={userData.mbtiType as MbtiType}
          trunkBranchLevel={treeStats.trunkBranchLevel}
          leafFlowerLevel={treeStats.leafFlowerLevel}
          onReveal={() => setIntroPhase('reveal')}
          onDone={() => { window.setTimeout(finishIntro, 1200) }}
        />
      )}
      {/* [แก้ตามที่ระบุ — พื้นหลังหายบนจอเล็ก/มือถือ] เดิมจอ ≤640px ถูกนับเป็น "โหมดประหยัดพลังงาน"
          (useIsLowPowerMode) แล้วไม่แสดงวิดีโอพื้นหลังเลย เหลือแค่พื้นไล่สี (.dashboard__bg-still) และไฟล์
          poster/webm ที่อ้างไว้ก็ไม่มีอยู่จริง — ตอนนี้แสดงวิดีโอทุกขนาดจอ (พื้นไล่สีอยู่ใต้ไว้ระหว่างโหลด)
          ผู้ใช้ที่ขอลดการเคลื่อนไหว: วิดีโอหยุดนิ่งที่เฟรมแรก (#t=0.1) ยังเห็นภาพพื้นหลังเหมือนเดิม */}
      <div className="dashboard__bg-still" aria-hidden="true" />
      <video
        ref={videoRef}
        className="dashboard__bg-video"
        loop muted playsInline preload="auto"
        aria-hidden="true"
      >
        <source src="/assets/videos/intro/hero-waterfall.mp4#t=0.1" type="video/mp4" />
      </video>

      {/* ═══ HUD แคปซูลกลางจอ ชิดขอบบน (แบบ V1) ═══ */}
      {!viewingPlayer && (isLoggedIn || isGuest) && (
        <div className="game-top-hud" ref={hudRef}>
          <div className="hud-pill">
            <img src={BADGE_ICONS.seed} className="icon-img hud-icon" alt="" />
            <span>{userData.mbtiType} Lv.{userData.level}</span>
          </div>
          <div className="hud-pill">
            <img src={BADGE_ICONS.exp} className="icon-img hud-icon" alt="" />
            <div className="hud-bar-container">
              <div className="hud-bar-bg">
                <div className="hud-bar-fill" style={{ width: `${(expIntoLevel / EXP_PER_LEVEL) * 100}%` }} />
              </div>
              <span className="hud-bar-text">{expIntoLevel}/{EXP_PER_LEVEL}</span>
            </div>
          </div>
          <div className="hud-pill">
            <img src={BADGE_ICONS.coins} className="icon-img hud-icon" alt="" />
            <span>{userData.coins.toLocaleString()}</span>
          </div>
          <div className="hud-pill">
            <img src={BADGE_ICONS.streak} className="icon-img hud-icon" alt="" />
            <span>{userData.streak}d</span>
          </div>
        </div>
      )}

      {/* ═══ ต้นไม้เต็มจอ ═══ */}
      {/* [แก้ตามที่ระบุ] แสงแดด (ธีมสว่าง) / ฉากกลางคืน (ธีมมืด) / ฝนตกตามสภาพอากาศจริง */}
      <HomeAmbience hidden={anyModalOpen} />

      {!viewingPlayer && showOverCalorie && <OverCalorieNotice streakDays={overCalorieStreak} />}

      <div className="dashboard__tree-layer">
        {viewingPlayer && viewingTreeStats ? (
          <>
            {/* [แก้ตามที่ระบุ] ปุ่มกลับบ้านใช้รูป Return + ป้ายชื่อแบบป้ายกระดานจัดอันดับ */}
            <button className="dashboard__back-btn lb-banner" onClick={() => setViewingPlayer(null)}>
              <img src={BADGE_ICONS.back} className="icon-img" alt="" /> กลับบ้าน
            </button>
            <div className="dashboard__viewing-name-pill lb-banner">ต้นไม้ของ {viewingPlayer.username}</div>
            <ErrorBoundary scope="ต้นไม้">
              <TreeOfLife
                mbtiType={viewingPlayer.mbtiType as MbtiType}
                onTreeClick={() => { setHiddenFriendCardId(viewingPlayer.id); setShowTreeSummary(true) }}
                groundRocks={(viewingPlayer.overCalorieDays ?? 0) >= OVER_CALORIE_STREAK_DAYS ? Math.min(6, viewingPlayer.overCalorieDays ?? 0) : 0}
                trunkBranchLevel={viewingTreeStats.trunkBranchLevel}
                leafFlowerLevel={viewingTreeStats.leafFlowerLevel}
                grassSoilLevel={viewingTreeStats.grassSoilLevel}
                pannable
                onPanChange={handleTreePan}
                riskLevel="LOW"
                placedItems={[]}
                decorationPositions={{}}
                onDecorationMove={() => {}}
              />
            </ErrorBoundary>
          </>
        ) : (
          <div ref={treeCaptureRef} className="dashboard__tree-capture-target">
            <ErrorBoundary scope="ต้นไม้">
              <TreeOfLife
                mbtiType={userData.mbtiType as MbtiType}
                trunkBranchLevel={treeStats.trunkBranchLevel}
                leafFlowerLevel={treeStats.leafFlowerLevel}
                grassSoilLevel={treeStats.grassSoilLevel}
                pannable
                onPanChange={handleTreePan}
                riskLevel={userData.currentRiskLevel}
                placedItems={placedItems}
                decorationPositions={decorationPositions}
                onDecorationMove={updateDecorationPosition}
                onTreeClick={() => { setShowTreeStats(false); setShowNotifications(false); setShowTreeSummary(true) }}
                groundRocks={showOverCalorie ? Math.min(6, overCalorieStreak) : 0}
                growthPulse={anyModalOpen ? null : treeGrowthPulse}
                hasSoot={hasSoot}
                daysSinceLastOracle={daysSinceLastOracle}
                daysSinceLastMentalQuest={daysSinceLastQuestByCategory.EMOTION}
                daysSinceLastPhysicalQuest={daysSinceLastQuestByCategory.HEALTH}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* [เพิ่มรอบนี้ — เควส "แคลอรี่ตาม BMI"] แอนิเมชันบัวรดน้ำ — เล่นเองตอนกลับมาที่นี่
            หลังปิดเควสสำเร็จ (เช็ค treeGrowthPulse.questCode ในตัวคอมโพเนนต์เอง) ไม่โชว์ตอน
            กำลังดูต้นไม้ของคนอื่น (viewingPlayer) เพราะ pulse เป็นของบัญชีเราเองเสมอ */}
        {!viewingPlayer && <WateringCanFx pulse={anyModalOpen ? null : treeGrowthPulse} waterPulseKey={waterPulseKey} />}

        {/* [แก้ตามที่ระบุ] โพสอิทลอยบนจอ — ขึ้นกลางต้นไม้ ลากไปวางตรงไหนก็ได้ (ดู PostItLayer.tsx) */}
        {!viewingPlayer && <PostItLayer postIts={postIts} onOpen={setOpenPostIt} onMove={movePostIt} />}

        {!viewingPlayer && daysSinceLastOracle !== null && daysSinceLastOracle >= 2 && (
          <button className="dashboard__oracle-nudge" onClick={handleOpenOracleFromTooltip}>
            ไม่ได้สุ่มไพ่ทิพย์มา {daysSinceLastOracle} วันแล้ว
          </button>
        )}
      </div>

      {/* ═══ ปุ่มลอยซ้าย: Leaderboard (คงของ V2 เดิม) ═══ */}
      {!viewingPlayer && (
        <div className="dashboard__panel dashboard__panel--left">
          <LeaderboardPanel
            collapsed={leaderboardCollapsed}
            onToggle={() => setLeaderboardCollapsed((c) => !c)}
            myMbti={userData.mbtiType as MbtiType}
            myName={userData.username}
            myLevel={userData.level}
            myKnowledgeStack={userData.knowledgeStack}
            myHealthStack={userData.healthStack}
            myEmotionStack={userData.emotionStack}
            onMyRankChange={handleMyRankChange}
            onPlayerClick={setViewingPlayer}
          />
        </div>
      )}

      {/* ═══ ปุ่มลอยขวา: Tree Stats / Mood / Sound (แบบ V1) — หรือการ์ดข้อมูลต้นไม้เพื่อนตอนดูคนอื่น ═══ */}
      <div className="dashboard__right-cluster">
        {viewingPlayer ? (
          <>
            {hiddenFriendCardId !== viewingPlayer.id && (
              <PlayerTreeCard player={viewingPlayer} onClose={() => setHiddenFriendCardId(viewingPlayer.id)} />
            )}
            <div className="right-action-buttons">
              <button
                className="game-icon-btn tree-info-btn dashboard__friend-card-toggle"
                onClick={() => setHiddenFriendCardId((id) => (id === viewingPlayer.id ? null : viewingPlayer.id))}
                title={`ข้อมูลต้นไม้ของ ${viewingPlayer.username}`}
                aria-label={`ข้อมูลต้นไม้ของ ${viewingPlayer.username}`}
              >
                <img src={BADGE_ICONS.tree} className="icon-img" alt="" />
              </button>
            </div>
          </>
        ) : (
          <>
            {showTreeStats && (
              <div className="dashboard__panel dashboard__panel--right">
                <TreeStatsPanel
                  userData={userData}
                  treeStats={treeStats}
                  onOpenMoodCheckin={() => { setShowTreeStats(false); openModal('moodCheckin') }}
                  daysSinceLastMentalQuest={daysSinceLastQuestByCategory.EMOTION}
                  daysSinceLastPhysicalQuest={daysSinceLastQuestByCategory.HEALTH}
                  onClose={() => setShowTreeStats(false)}
                />
              </div>
            )}
            {/* [เพิ่มตามที่ระบุ] แผงแจ้งเตือน — ใช้ .dashboard__panel--right ตัวเดียวกับ
                TreeStatsPanel (ปิดกันเองเสมอ ดู handleToggleNotifications) */}
            {showNotifications && (
              <div className="dashboard__panel dashboard__panel--right">
                <NotificationPanel
                  items={notificationItems}
                  onRead={markNotificationRead}
                  onOpenQuest={handleOpenNotificationQuest}
                  onOpenPost={handleOpenNotificationPost}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
            )}
            <div className="right-action-buttons">
              {/* ปุ่มตั้งค่า — จุดเข้าหน้าตั้งค่าจุดเดียวของหน้า Home (แทน NavBar ที่ลบไปแล้ว) ไม่มีปุ่ม
                  ลัดโปรไฟล์แยก เพราะหน้าตั้งค่ามีแถว "ตั้งค่าโปรไฟล์" ให้เข้าได้อยู่แล้ว */}
              {(isLoggedIn || isGuest) && (
                <button
                  className="game-icon-btn"
                  onClick={() => { setSettingsInitialSubModal(null); openMainPanel('settings') }}
                  title={t('home.settings')}
                  aria-label={t('home.settings')}
                >
                  <img src={BADGE_ICONS.settings} className="icon-img" alt="" />
                </button>
              )}
              {/* [ย้ายตามที่ระบุ] ปุ่มข้อมูลต้นไม้ — อยู่ก่อนปุ่มเช็คอินอารมณ์รายวัน (เดิมเปิดข้อมูลต้นไม้
                  จากการกดโคนต้นไม้ ตอนนี้เปิดจากปุ่มนี้แทน รวมกับสถานะต้นไม้ในแผงเดียว) */}
              <button className="game-icon-btn tree-info-btn" onClick={() => { setShowTreeStats((v) => !v); setShowNotifications(false) }} title={t('home.treeInfo')} aria-label={t('home.treeInfo')}>
                <img src={BADGE_ICONS.tree} className="icon-img" alt="" />
              </button>
              <button className="game-icon-btn mood-btn" onClick={() => openModal('moodCheckin')} title={t('home.moodCheckin')}>
                <img src={BADGE_ICONS.checkin} className="icon-img" alt="" />
              </button>
              {/* [เพิ่มตามที่ระบุ — ปุ่มแจ้งเตือนใหม่] แทรกระหว่างเช็คอินรายวันกับปิดเสียง
                  เปิด panel แล้ว mark ว่าอ่านแล้วทันที (เคลียร์ badge) — pattern เดียวกับที่
                  Story ทำตอนเปิดหน้ากิจกรรม */}
              <button
                className="game-icon-btn notif-btn"
                style={{ position: 'relative' }}
                onClick={() => {
                  setShowNotifications((v) => {
                    const next = !v
                    if (next) { setShowTreeStats(false); markNotificationsSeen() }
                    return next
                  })
                }}
                title={t('home.notifications')}
              >
                <img src={BADGE_ICONS.notification} className="icon-img" alt="" />
                {unreadNotifCount > 0 && <span className="nav-badge">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}
              </button>
              <button className="game-icon-btn sound-btn" onClick={toggleMute} title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
              {/* [ใหม่ — ตามที่ระบุ] กล่องพยาบาลลอย — โผล่เองเฉพาะตอนตรวจพบอารมณ์กลุ่มลบติดต่อกัน
                  ≥3 วัน (ดู MedicalBoxAlert.tsx) คืน null เงียบๆ ถ้ายังไม่เข้าเงื่อนไข */}
              <MedicalBoxAlert moodEntries={moodEntries} onOpenMentalQuests={() => handleOpenQuestCategory('mental')} />
            </div>
          </>
        )}
      </div>

      {/* ═══ ปุ่มลอยมุมขวาล่างจอ: แชร์ + เพื่อน ═══
          [แก้ข้อ B] ปุ่มเพื่อนเปิดหน้า FriendsPage จริงแล้ว (เดิมเป็นแค่ placeholder
          setInfoAlert "เร็วๆ นี้") */}
      {!viewingPlayer && (
        <div className="dashboard__corner-actions dashboard__corner-actions--right">
          <button className="game-icon-btn" onClick={handleShare} title="แชร์">
            <img src={BADGE_ICONS.share} className="icon-img" alt="" />
          </button>
          <button
            className="game-icon-btn"
            onClick={() => openMainPanel('friends')}
            title="เพื่อน"
          >
            <img src={BADGE_ICONS.friends} className="icon-img" alt="" />
          </button>
        </div>
      )}

      {/* [แก้ตามที่ระบุ] เปิดสตอรี่แล้วไม่ต้องมีแถบเมนูล่างทับ — หน้าสตอรี่มีปุ่มกากบาทปิดอยู่แล้ว */}
      {!viewingPlayer && !modals.story && (
      <ActionMenuBar
        active={activeNavKey}
        activeQuestCount={completedQuestCount}
        onOpenQuestCategory={handleOpenQuestCategory}
        onOpenShop={() => openMainPanel('shop')}
        onOpenProfile={() => openMainPanel('profile')}
        onOpenStory={() => { setStoryInitialPostId(null); openMainPanel('story') }}
        onQuestsMenuOpen={() => { MAIN_PANEL_KEYS.forEach((k) => { if (k !== 'quests') closeModal(k) }) }}
        onGoHome={handleGoHome}
      />
      )}

      {/* ═══ โมดัลทั้งหมด — คงของ V2 ทุกจุด (lazy + AnimatePresence) ═══
          [แก้บั๊กร้ายแรง — พบจากการทดสอบจริงทั้งใน dev และ production build] เดิม
          AnimatePresence ตัวเดียว mode="wait" ครอบ <Suspense> ตัวเดียวคุม 8 โมดัลที่ผูก
          กับคีย์คนละตัว (quests/shop/profile/settings/leaderboard/mood/meditation/
          brainDump) — ทดสอบจริงพบว่าเวลาปิดโมดัลใดก็ตาม (เช่น กด "หน้าแรก" หรือ submit
          เช็คอินอารมณ์) องค์ประกอบเก่าจะไม่ถูกถอดออกจาก DOM จริง ค้างอยู่ที่สไตล์ initial
          ของ sceneEnter (opacity:0; transform:scale(0.97)) แบบ "มองไม่เห็นแต่ยังกดโดน"
          (pointer-events ยังเป็น auto, z-index 500 เต็มจอ) กลายเป็นชั้นล่องหนบังคลิกทั้งแอป
          ไปเรื่อยๆ — ยืนยันด้วย console.log ว่า state ของ modals ถูกต้อง (เป็น false จริง)
          ทุกครั้ง แปลว่าไม่ใช่บั๊ก state แต่เป็นปัญหาการ track exit ของ AnimatePresence เอง
          เมื่อมีลูกที่ผูกกับคีย์ต่างกันหลายตัวใต้ mode="wait" ตัวเดียว
          แก้โดยแยกเป็น AnimatePresence + Suspense อิสระของตัวเอง "1 โมดัล 1 คู่" แทน
          (ไม่ต้องมี mode="wait" อีกเลยเพราะแต่ละคู่มีลูกได้แค่ตัวเดียวอยู่แล้วโดยธรรมชาติ) */}
      {modals.quests && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="quests" className="dashboard__modal-layer" {...sceneEnter}>
              <ErrorBoundary scope="ระบบเควส">
                <QuestSection
                  questLogs={questLogs}
                  userData={userData}
                  treeStats={treeStats}
                  placedItems={placedItems}
                  decorationPositions={decorationPositions}
                  onDecorationMove={updateDecorationPosition}
                  treeGrowthPulse={treeGrowthPulse}
                  moodEntries={moodEntries}
                  onRequestMoodCheckin={() => openModal('moodCheckin')}
                  onFailIncinerator={markIncineratorFailed}
                  onToggle={handleToggleQuest}
                  onClose={() => { closeModal('quests'); setQuestsInitialQuest(null) }}
                  initialTab={questsInitialTab}
                  initialQuest={questsInitialQuest}
                />
              </ErrorBoundary>
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.shop && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="shop" className="dashboard__modal-layer" {...sceneEnter}>
              <ShopSection coins={userData.coins} inventoryData={inventoryData} onBuy={handleBuy} onEquip={handleEquip} onClose={() => closeModal('shop')} />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.profile && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="profile" className="dashboard__modal-layer" {...sceneEnter}>
              <ProfilePage
                userData={userData}
                questLogs={questLogs}
                moodEntries={moodEntries}
                journalEntries={journalEntries}
                inventoryData={inventoryData}
                earnedBadges={earnedBadges}
                onPlace={handleEquip}
                onClose={() => closeModal('profile')}
              />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.settings && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="settings" className="dashboard__modal-layer" {...sceneEnter}>
              <SettingsModal
                settings={settings}
                mbtiType={userData.mbtiType as MbtiType}
                userData={userData}
                onUpdateSettings={updateSettings}
                onUpdateUser={updateProfile}
                onLogout={() => { closeAllModals(); setLoggedIn(false, false) }}
                onChangePassword={changePassword}
                onDeleteAccount={deleteAccount}
                onClose={() => closeModal('settings')}
                initialSubModal={settingsInitialSubModal}
              />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.leaderboard && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="leaderboard" className="dashboard__modal-layer" {...sceneEnter}>
              <Leaderboard onClose={() => closeModal('leaderboard')} myMbti={userData.mbtiType as MbtiType} myName={userData.username} onPlayerClick={setViewingPlayer} />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.moodCheckin && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="mood" className="dashboard__modal-layer" {...sceneEnter}>
              {/* [แก้ตามที่ระบุ] กด "รดน้ำต้นไม้" หลังเช็คอินเสร็จ → บัวรดน้ำขึ้นมารดน้ำต้นไม้ทันที */}
              <MoodCheckIn
                onSubmit={async (mood, subMood, text) => { await handleMoodSubmit(mood, subMood, text); triggerWateringEffect() }}
                onSkip={() => closeModal('moodCheckin')}
              />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.meditation && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="meditation" className="dashboard__modal-layer" {...sceneEnter}>
              <MeditationModal onClose={() => closeModal('meditation')} />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.brainDump && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="brainDump" className="dashboard__modal-layer" {...sceneEnter}>
              <BrainDumpModal onClose={() => closeModal('brainDump')} />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.story && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="story" className="dashboard__modal-layer" {...sceneEnter}>
              <StoryOverlay
                onClose={() => { closeModal('story'); setStoryInitialPostId(null) }}
                onViewTree={handleViewTreeFromStory}
                onEditProfile={handleOpenProfileSettingsFromStory}
                initialPostId={storyInitialPostId}
              />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      {modals.friends && (
        <Suspense fallback={null}>
          <AnimatePresence>
            <m.div key="friends" className="dashboard__modal-layer" {...sceneEnter}>
              <FriendsPage
                onBack={() => closeModal('friends')}
                onViewPlayer={handleViewFriendFromPage}
              />
            </m.div>
          </AnimatePresence>
        </Suspense>
      )}

      <Suspense fallback={null}>
        {showTreeSummary && (
          <TreeSummaryModal
            open={showTreeSummary}
            onClose={() => setShowTreeSummary(false)}
            // [แก้ตามที่ระบุ] ดูต้นไม้เพื่อนอยู่ → กดที่ต้นแล้วขึ้น MBTI/ต้นไม้ของเพื่อนคนนั้น
            mbtiType={(viewingPlayer ? viewingPlayer.mbtiType : userData.mbtiType) as MbtiType}
            username={viewingPlayer ? viewingPlayer.username : userData.username}
          />
        )}

        {streakCelebrationDays && (
          <StreakCelebration days={streakCelebrationDays} inventoryData={inventoryData} onClaim={handleClaimStreakReward} onClose={() => setStreakCelebrationDays(null)} />
        )}

        {activePostIt && <PostItModal postIt={activePostIt} onClose={() => {}} />}
        {/* [แก้ตามที่ระบุ] เปิดอ่านโพสอิท → เลือกเก็บเข้าประวัติ หรือติดไว้บนต้นไม้ต่อ */}
        {openPostIt && (
          <PostItModal
            postIt={openPostIt}
            onClose={() => setOpenPostIt(null)}
            onKeep={() => { archivePostIt(openPostIt.id); setOpenPostIt(null) }}
          />
        )}
      </Suspense>

      {/* แจ้งผลปุ่มแชร์ (copy link fallback ตอนเบราว์เซอร์ไม่รองรับ navigator.share) */}
      <GameAlert open={infoAlert !== null} message={infoAlert ?? ''} icon="✨" onClose={() => setInfoAlert(null)} />

      {/* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 8] ป๊อปอัพแจ้งเลื่อนอันดับ — ปิดแล้วเคลียร์ rankUpInfo
          (lastKnownRank เองอัปเดตไปแล้วตั้งแต่ตอน handleMyRankChange เห็นอันดับใหม่ ไม่ต้อง
          อัปเดตซ้ำตรงนี้ กันโชว์ popup ซ้ำจนกว่าจะเลื่อนอันดับขึ้นจริงอีกครั้ง) */}
      <RankUpModal
        open={rankUpInfo !== null}
        fromRank={rankUpInfo?.from ?? null}
        toRank={rankUpInfo?.to ?? 0}
        onClose={() => setRankUpInfo(null)}
      />
    </div>
  )
}
