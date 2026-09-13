import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { toBlob } from 'html-to-image'
import NavBar from '../navbar/NavBar'
import TreeOfLife from '../tree/TreeOfLife'
import LeaderboardPanel from '../leaderboard/LeaderboardPanel'
import PlayerTreeCard from '../leaderboard/PlayerTreeCard'
import TreeStatsPanel from '../tree/TreeStatsPanel'
import ActionMenuBar from '../layout/ActionMenuBar'
import type { NavKey } from '../layout/ActionMenuBar'
import ErrorBoundary from '../common/ErrorBoundary'
import GameAlert from '../ui/GameAlert'
import { useUser } from '../../context/UserContext'
import { useProgress } from '../../context/ProgressContext'
import { useUI } from '../../context/UIContext'
import { useMental } from '../../context/MentalContext'
import { useAudio } from '../../context/AudioContext'
import { useIsLowPowerMode } from '../../hooks/useMediaQuery'
import { sceneEnter } from '../../config/motion'
import { EXP_PER_LEVEL, STACK_PER_VISUAL_LEVEL, type MbtiType } from '../../types'
import type { LeaderboardPlayer } from '../../config/leaderboardData'
import type { QuestTabId } from '../../config/questCatalog'
import './Dashboard.css'

// โมดัลหนัก — โหลดเฉพาะตอนผู้ใช้เปิดจริง (คงไว้ตาม V2 ทุกจุด)
const QuestSection = lazy(() => import('../quest/QuestSection'))
const ShopSection = lazy(() => import('../shop/ShopSection'))
// [แก้ตามที่ระบุ] InventoryModal เดิมถูกยุบเข้าไปเป็นโซนหนึ่งของหน้าโปรไฟล์แล้ว (ดู ProfilePage.tsx)
const ProfilePage = lazy(() => import('../profile/ProfilePage'))
const SettingsModal = lazy(() => import('../settings/SettingsModal'))
const Leaderboard = lazy(() => import('../leaderboard/Leaderboard'))
const MoodCheckIn = lazy(() => import('../mood/MoodCheckIn'))
const MeditationModal = lazy(() => import('../mood/MeditationModal'))
const BrainDumpModal = lazy(() => import('../mood/BrainDumpModal'))
const StreakCelebration = lazy(() => import('../modals/StreakCelebration'))
const PostItModal = lazy(() => import('../modals/PostItModal'))
const TreeSummaryModal = lazy(() => import('../tree/TreeSummaryModal'))
// [ใหม่ — ฟีเจอร์สตอรี่] เดิมปุ่มนี้ชื่อ "โพสต์" (📝) เป็น placeholder ล้วนๆ (setInfoAlert
// เฉยๆ) ตอนนี้เปลี่ยนเป็น "สตอรี่" เปิดหน้า Feed/Search/Activity/Profile ภายในตัวเองจริง
const StoryOverlay = lazy(() => import('../story/StoryOverlay'))
// [ใหม่ — ข้อ B] หน้า "เพื่อน" แบบง่ายที่สุด เปิดจากปุ่มมุมขวาล่าง 👥 (คนละหน้ากับ
// FriendsListPanel.tsx ที่อยู่ใน sidebar ของ StoryOverlay)
const FriendsPage = lazy(() => import('../friends/FriendsPage'))

const DAY_MS = 1000 * 60 * 60 * 24
const ALL_MODAL_KEYS = ['quests', 'shop', 'profile', 'settings', 'leaderboard', 'moodCheckin', 'meditation', 'brainDump', 'story', 'friends'] as const

export default function Dashboard() {
  const {
    userData, treeStats, inventoryData, placedItems,
    isLoggedIn, isGuest, setLoggedIn,
    streakCelebrationDays, setStreakCelebrationDays,
    handleBuy, handleEquip, handleClaimStreakReward, updateProfile,
  } = useUser()

  const {
    questLogs, moodEntries, journalEntries, treeGrowthPulse, hasSoot, completedQuestCount,
    handleToggleQuest, markIncineratorFailed,
  } = useProgress()

  const { handleMoodSubmit } = useMental()
  const { isMuted, toggleMute } = useAudio()

  const {
    settings, modals, leaderboardCollapsed, decorationPositions, activePostIt, anyModalOpen,
    updateSettings, openModal, closeModal, setLeaderboardCollapsed, updateDecorationPosition,
  } = useUI()

  const [viewingPlayer, setViewingPlayer] = useState<LeaderboardPlayer | null>(null)
  const [showTreeSummary, setShowTreeSummary] = useState(false)
  const [showTreeStats, setShowTreeStats] = useState(false)
  const [questsInitialTab, setQuestsInitialTab] = useState<QuestTabId>('knowledge')
  /** [ใหม่ — ฟีเจอร์สตอรี่ ข้อ 5] ให้ปุ่ม "แก้ไขโปรไฟล์" ในหน้าโปรไฟล์ Story เปิด SettingsModal
   *  ตรงไปที่หน้าย่อย "ตั้งค่าโปรไฟล์" เลย — reset กลับเป็น null ทุกครั้งที่เปิด Settings
   *  จากทางอื่น (ปุ่มเฟืองปกติ) กันค้างจากรอบก่อนแล้วเด้งผิดหน้าโดยไม่ได้ตั้งใจ */
  const [settingsInitialSubModal, setSettingsInitialSubModal] = useState<'profile' | null>(null)
  /** ข้อความแจ้งผลปุ่มแชร์ (เช่น copy link fallback ตอนเบราว์เซอร์ไม่รองรับ navigator.share) */
  const [infoAlert, setInfoAlert] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  /** [ใหม่ — ข้อ C] ครอบเฉพาะ "ต้นไม้ของตัวเอง" (ไม่รวม HUD/ปุ่ม) — ให้แชร์เป็นรูปได้เฉพาะ
   *  ต้นไม้จริงๆ ไม่ใช่ทั้งหน้าจอ ดู handleShare ด้านล่าง */
  const treeCaptureRef = useRef<HTMLDivElement>(null)
  const lowPower = useIsLowPowerMode()

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => {
      const shouldPause = anyModalOpen || document.hidden || lowPower
      if (shouldPause) video.pause()
      else video.play().catch(() => {})
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [anyModalOpen, lowPower])

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
  }

  const handleOpenOracleFromTooltip = () => {
    setQuestsInitialTab('mental')
    openMainPanel('quests')
  }

  const handleOpenQuestCategory = (tab: QuestTabId) => {
    setQuestsInitialTab(tab)
    openMainPanel('quests')
  }

  /** ปุ่ม "หน้าแรก" ใน Liquid Nav — ปิดทุกโมดัลที่เปิดอยู่ กลับมาที่ต้นไม้เต็มจอ */
  const handleGoHome = () => {
    ALL_MODAL_KEYS.forEach((key) => closeModal(key))
    setShowTreeStats(false)
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
   *  เปิดจากปุ่มวงกลมที่ NavBar แทน ไม่มีไอคอนในแถบล่างให้ไฮไลต์ (ตกไปที่ 'home' ตามค่าเริ่มต้น) */
  const activeNavKey: NavKey = modals.quests
    ? 'quests'
    : modals.shop
      ? 'shop'
      : modals.profile
        ? 'profile'
        : 'home'

  return (
    <div className="dashboard">
      {!lowPower && (
        <video
          ref={videoRef}
          className="dashboard__bg-video"
          loop muted playsInline preload="metadata"
          poster="/assets/images/ui/hero-waterfall-poster.webp"
          aria-hidden="true"
        >
          <source src="/assets/videos/hero-waterfall.webm" type="video/webm" />
          <source src="/assets/videos/hero-waterfall.mp4" type="video/mp4" />
        </video>
      )}
      {lowPower && <div className="dashboard__bg-still" aria-hidden="true" />}

      <NavBar
        userData={userData}
        isLoggedIn={isLoggedIn}
        isGuest={isGuest}
        onLogout={() => setLoggedIn(false, false)}
        onOpenSettings={() => { setSettingsInitialSubModal(null); openMainPanel('settings') }}
      />

      {/* ═══ HUD แคปซูลกลางจอ ใต้ Navbar (แบบ V1) ═══ */}
      {!viewingPlayer && (isLoggedIn || isGuest) && (
        <div className="game-top-hud">
          <div className="hud-pill">
            <span className="hud-icon">🌱</span>
            <span>{userData.mbtiType} Lv.{userData.level}</span>
          </div>
          <div className="hud-pill">
            <span className="hud-icon">⭐</span>
            <div className="hud-bar-container">
              <div className="hud-bar-bg">
                <div className="hud-bar-fill" style={{ width: `${(expIntoLevel / EXP_PER_LEVEL) * 100}%` }} />
              </div>
              <span className="hud-bar-text">{expIntoLevel}/{EXP_PER_LEVEL}</span>
            </div>
          </div>
          <div className="hud-pill">
            <span className="hud-icon">🪙</span>
            <span>{userData.coins.toLocaleString()}</span>
          </div>
          <div className="hud-pill">
            <span className="hud-icon">🔥</span>
            <span>{userData.streak}d</span>
          </div>
        </div>
      )}

      {/* ═══ ต้นไม้เต็มจอ ═══ */}
      <div className="dashboard__tree-layer">
        {viewingPlayer && viewingTreeStats ? (
          <>
            <button className="dashboard__back-btn" onClick={() => setViewingPlayer(null)}>◀ กลับบ้าน</button>
            <div className="dashboard__viewing-name-pill">ต้นไม้ของ {viewingPlayer.username}</div>
            <ErrorBoundary scope="ต้นไม้">
              <TreeOfLife
                mbtiType={viewingPlayer.mbtiType as MbtiType}
                trunkBranchLevel={viewingTreeStats.trunkBranchLevel}
                leafFlowerLevel={viewingTreeStats.leafFlowerLevel}
                grassSoilLevel={viewingTreeStats.grassSoilLevel}
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
                riskLevel={userData.currentRiskLevel}
                placedItems={placedItems}
                decorationPositions={decorationPositions}
                onDecorationMove={updateDecorationPosition}
                onTreeClick={() => setShowTreeSummary(true)}
                growthPulse={treeGrowthPulse}
                hasSoot={hasSoot}
                daysSinceLastOracle={daysSinceLastOracle}
              />
            </ErrorBoundary>
          </div>
        )}

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
            onPlayerClick={setViewingPlayer}
            glass
          />
        </div>
      )}

      {/* ═══ [แก้รอบสตอรี่] ปุ่มลอยมุมซ้ายล่างจอ: เดิมชื่อ "โพสต์" (placeholder) ตอนนี้เปลี่ยน
          เป็น "สตอรี่" เปิดหน้า Feed จริง (StoryOverlay) — ข้างๆ พื้นที่ปุ่มจัดอันดับด้านบน ═══ */}
      {!viewingPlayer && (
        <div className="dashboard__corner-actions dashboard__corner-actions--left">
          <button
            className="game-icon-btn"
            onClick={() => openMainPanel('story')}
            title="สตอรี่"
          >
            📖
          </button>
        </div>
      )}

      {/* ═══ ปุ่มลอยขวา: Tree Stats / Mood / Sound (แบบ V1) — หรือการ์ดข้อมูลต้นไม้เพื่อนตอนดูคนอื่น ═══ */}
      <div className="dashboard__right-cluster">
        {viewingPlayer ? (
          <PlayerTreeCard player={viewingPlayer} />
        ) : (
          <>
            {showTreeStats && (
              <div className="dashboard__panel dashboard__panel--right">
                <TreeStatsPanel
                  userData={userData}
                  treeStats={treeStats}
                  onOpenMoodCheckin={() => openModal('moodCheckin')}
                  glass
                />
              </div>
            )}
            <div className="right-action-buttons">
              <button className="game-icon-btn" onClick={() => setShowTreeStats((v) => !v)} title="สถานะต้นไม้">
                🌳
              </button>
          <button className="game-icon-btn mood-btn" onClick={() => openModal('moodCheckin')} title="เช็คอินอารมณ์">
                🌤️
              </button>
              <button className="game-icon-btn sound-btn" onClick={toggleMute} title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
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
            🔗
          </button>
          <button
            className="game-icon-btn"
            onClick={() => openMainPanel('friends')}
            title="เพื่อน"
          >
            👥
          </button>
        </div>
      )}

      {!viewingPlayer && (
      <ActionMenuBar
        active={activeNavKey}
        activeQuestCount={completedQuestCount}
        onOpenQuestCategory={handleOpenQuestCategory}
        onOpenShop={() => openMainPanel('shop')}
        onOpenProfile={() => openMainPanel('profile')}
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
                  onClose={() => closeModal('quests')}
                  initialTab={questsInitialTab}
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
                onLogout={() => setLoggedIn(false, false)}
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
              <MoodCheckIn onSubmit={handleMoodSubmit} onSkip={() => closeModal('moodCheckin')} />
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
                onClose={() => closeModal('story')}
                onViewTree={handleViewTreeFromStory}
                onEditProfile={handleOpenProfileSettingsFromStory}
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
            mbtiType={userData.mbtiType as MbtiType}
            username={userData.username}
            trunkBranchLevel={treeStats.trunkBranchLevel}
            leafFlowerLevel={treeStats.leafFlowerLevel}
            grassSoilLevel={treeStats.grassSoilLevel}
            riskLevel={userData.currentRiskLevel}
          />
        )}

        {streakCelebrationDays && (
          <StreakCelebration days={streakCelebrationDays} inventoryData={inventoryData} onClaim={handleClaimStreakReward} onClose={() => setStreakCelebrationDays(null)} />
        )}

        {activePostIt && <PostItModal postIt={activePostIt} onClose={() => {}} />}
      </Suspense>

      {/* แจ้งผลปุ่มแชร์ (copy link fallback ตอนเบราว์เซอร์ไม่รองรับ navigator.share) */}
      <GameAlert open={infoAlert !== null} message={infoAlert ?? ''} icon="✨" onClose={() => setInfoAlert(null)} />
    </div>
  )
}
