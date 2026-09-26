import { useState } from 'react'
import GameplayFrame from './GameplayFrame'
import type { QuestLogEntry, UserData, TreeStats, PlacedItem, DecorationPositionMap, MoodEntryData, QuestCategory } from '../../types'
import { DEFAULT_USER_DATA, DEFAULT_TREE_STATS } from '../../types'
import type { QuestPlayPayload } from '../../types.mental'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { QUEST_TABS, QUEST_CATALOG_BY_TAB, SPECIAL_QUEST_CODES, findQuestByCode, type QuestTabId, type QuestDef } from '../../config/questCatalog'
import { Z_INDEX } from '../../config/zIndex'
import { QUEST_TAB_ICONS } from '../../config/iconAssets'
import { useAppContext, DAILY_FOCUS_QUOTA_MINUTES } from '../../context/AppContext'
import QuestRewardCelebration, { type QuestCelebrationData } from './QuestRewardCelebration'
import QuestFeedbackPrompt, { type QuestFeedbackPromptData } from './QuestFeedbackPrompt'
import { playSfx } from '../../utils/audioPlayer'
import { BADGE_ICONS } from '../../config/iconAssets'

interface QuestSectionProps {
  questLogs?: QuestLogEntry[]
  userData?: UserData
  treeStats?: TreeStats
  placedItems?: PlacedItem[]
  decorationPositions?: DecorationPositionMap
  onDecorationMove?: (itemId: string, xPct: number, yPct: number, scale?: number) => void
  treeGrowthPulse?: { category: QuestCategory; key: number; questCode?: string } | null
  moodEntries?: MoodEntryData[]
  onRequestMoodCheckin?: () => void
  onFailIncinerator?: () => void
  /** [เปลี่ยนลายเซ็น] ส่ง payload ของการเล่นรอบนั้นขึ้นไปด้วย → quest_logs.payload */
  onToggle?: (questId: string, payload?: QuestPlayPayload) => void
  onClose?: () => void
  initialTab?: QuestTabId
}

const ZONE_TITLES: Record<QuestTabId, string> = {
  // [แก้ตามที่ระบุ] เปลี่ยนแค่ชื่อหัวข้อ ไม่แตะ layout แผนที่โหนดใน LearningQuestMap.tsx เลย
  knowledge: 'เควสด้านการเรียนรู้',
  physical: 'เควสสุขภาพ',
  mental: 'เควสสุขภาพจิต',
}


function getTodaysMoodEntry(entries: MoodEntryData[]): MoodEntryData | null {
  const todayStr = new Date().toDateString()
  for (let i = entries.length - 1; i >= 0; i--) {
    if (new Date(entries[i].createdAt).toDateString() === todayStr) return entries[i]
  }
  return null
}

/** true ถ้าเวลาปัจจุบันอยู่ในช่วง "ตัดจอก่อนนอน" ที่ผู้ใช้ตั้งไว้เอง (เควสฟื้นฟูหน้าดิน) */
function isInCurfew(curfew: { bedtime: string; curfewHours: number } | null): boolean {
  if (!curfew) return false
  const [h, m] = curfew.bedtime.split(':').map(Number)
  if (Number.isNaN(h)) return false
  const now = new Date()
  const bed = new Date(now)
  bed.setHours(h, m || 0, 0, 0)
  const start = new Date(bed.getTime() - curfew.curfewHours * 3600_000)
  // ช่วงตัดจอข้ามเที่ยงคืนได้ (เช่น เริ่ม 22:00 นอน 23:00) จึงเทียบเป็นช่วงเวลาเดียวกันของวันนี้
  if (start <= bed) return now >= start && now <= bed
  return now >= start || now <= bed
}

/**
 * QuestSection — "3-Pane Layout" (Navbar / Sidebar / GameplayFrame)
 *
 * [เพิ่มรอบนี้ — ระบบตอบสนองต่อผลคัดกรอง ตามเอกสาร "Moderate Risk Action"]
 *   1) ผลประเมินเป็น MODERATE/HIGH → ล็อกเควสที่ใช้พลังงานสูง (energyLevel: 'HIGH')
 *      แล้วดันเควสสายผ่อนคลาย (isCalming) ขึ้นมาเป็นตัวเลือกหลักแทน
 *   2) ทำโฟกัสครบโควตา 5 ชม./วัน (เควส Guardian of Rest) → ล็อกเควสเรียนหนักที่เหลือ
 *   3) อยู่ในช่วงเวลาตัดจอก่อนนอนที่ตั้งไว้เอง → ล็อกเควสเรียนหนักเช่นกัน
 *   ทุกกรณีมีแถบอธิบายเหตุผลอยู่หัว sidebar เสมอ ไม่ปล่อยให้ผู้ใช้งงว่าทำไมกดไม่ได้
 */
export default function QuestSection({
  questLogs = [], userData = DEFAULT_USER_DATA, treeStats = DEFAULT_TREE_STATS,
  placedItems = [], decorationPositions = {}, onDecorationMove = () => {}, treeGrowthPulse = null,
  moodEntries = [], onRequestMoodCheckin = () => {}, onFailIncinerator = () => {},
  onToggle = () => {}, onClose = () => {}, initialTab = 'knowledge',
}: QuestSectionProps) {
  useLockBodyScroll()

  const { focusMinutesToday, screenCurfew, consecutiveNegativeDays, settings, earnedBadges, submitQuestFeedback } = useAppContext()
  const sfxOpts = { volume: settings.sfxVolume, enabled: settings.soundEnabled }

  const [activeTab, setActiveTab] = useState<QuestTabId>(initialTab)
  const [confirmQuest, setConfirmQuest] = useState<QuestDef | null>(null)
  const [playingQuest, setPlayingQuest] = useState<QuestDef | null>(null)
  const [specialQuest, setSpecialQuest] = useState<QuestDef | null>(null)

  /** [ตัดรอบนี้ — เอาวิดีโอ "เดินเปลี่ยนฉาก" เต็มจอออก] เดิมมี isTransitioning/transitionQuestCode/
   *  transitionAnimDone ไว้ควบคุมช่วงเวลาที่ซ่อนนกฮูกระหว่างเล่นวิดีโอคั่น (TransitionOverlay.tsx)
   *  — ตอนนี้ตัดกลไกวิดีโอทั้งชุดทิ้งแล้ว (ดู LearningQuestMap.tsx สำหรับแอนิเมชัน "เดิน" ตัวใหม่ที่
   *  ทำงานบนแผนที่เดิมเลย ไม่ต้องมีโอเวอร์เลย์แยก) จึงไม่ต้องมี state ซ่อน/รอ sync พวกนี้อีกต่อไป —
   *  นกฮูกแสดงตำแหน่งจริงจาก questLogs เสมอโดยไม่มี state คั่นกลาง แก้บั๊ก "ไม่ sync" ที่ต้นตอที่สุด
   *  เท่าที่จะเป็นไปได้ (ไม่มีอะไรให้ไม่ sync เพราะไม่มี state ที่ต้องรอคอยกันแล้ว) */

  /** [เพิ่มรอบนี้ — ป้ายฉลองรางวัลกลาง] ครอบคลุมทุกเส้นทางทำเควสสำเร็จในแอป — ทั้ง
   *  handleCompletePlaying (เกมทุกตัวที่ผ่าน GameShell/registry) และ handleCompleteSpecial
   *  (5 หน้าเควสสุขภาพจิตแบบเต็มกรอบ) เรียกจุดเดียวนี้ทั้งคู่ ดู QuestRewardCelebration.tsx */
  const [celebration, setCelebration] = useState<QuestCelebrationData | null>(null)
  /** [เพิ่มตามที่ระบุ — กลไกใหม่แทน 'know-mirror-of-truth'] ป้ายขอ feedback ลอยคู่กับป้าย
   *  ฉลองรางวัล ยิงจากจุดเดียวกันเสมอ (ทุกเส้นทางทำเควสสำเร็จ) — หยุดถามอัตโนมัติเมื่อ badge
   *  "Mirror of Truth" ปลดล็อกแล้ว (ดู MentalContext.earnedBadges) กันแสดงป้ายรบกวนไปเรื่อยๆ
   *  ทั้งที่ไม่มีประโยชน์ต่อผู้ใช้อีกแล้ว */
  const [feedbackPrompt, setFeedbackPrompt] = useState<QuestFeedbackPromptData | null>(null)
  const triggerCelebration = (questCode: string, skipped: boolean) => {
    const questDef = findQuestByCode(questCode)
    if (!questDef) return
    // [เลือก TREE_GROW ไม่ใช่ REWARD_CLAIM] หลายเส้นทางเล่น REWARD_CLAIM ไปแล้วตอน "กดรับรางวัล"
    // ของตัวเอง (GameShell.claim / MindfulAnchorPage.handleClaim / IncineratorPage.handleClaimReward)
    // ถ้าป้ายนี้เล่นซ้ำเสียงเดียวกันจะกลายเป็นเสียงซ้อนกันสองรอบ — ใช้เสียง "ต้นไม้โต" แทน
    // ซึ่งตรงธีม "ได้รางวัล" แต่ชนกับเสียงเดิมของเส้นทางอื่นน้อยกว่ามาก
    playSfx('TREE_GROW', sfxOpts)
    setCelebration({ quest: questDef, skipped, key: Date.now() })
    if (!earnedBadges.includes('mirror-of-truth')) {
      setFeedbackPrompt({ questCode, completedAt: new Date().toISOString(), key: Date.now() })
    }
  }

  const handleQuestFeedback = (reaction: 'good' | 'neutral' | 'bad') => {
    if (!feedbackPrompt) return
    submitQuestFeedback(feedbackPrompt.questCode, feedbackPrompt.completedAt, reaction)
    setFeedbackPrompt(null)
  }

  /*──────────────────────────────────────────────────────────────────────────*\
    [ใหม่] เปลี่ยนแท็บ = เริ่มหน้าใหม่จริงๆ
    ────────────────────────────────────────────────────────────────────────
    ต้นตอของอาการ "หน้าเก่าซ้อนทับหน้าใหม่": เดิม onChangeTab เป็น setActiveTab
    ตรงๆ ทำให้เปลี่ยนแค่ตัวแปรเดียว ส่วน popup ที่เปิดค้างอยู่ (หน้ายืนยัน /
    หน้าเล่นเควส / หน้าเควสสุขภาพจิตแบบเต็มกรอบ) ยังถือ state เดิมไว้ครบ
    จึงยังคงลอยทับ default view ของหมวดใหม่

    ตัวนี้เคลียร์ทุกอย่างที่เป็น "หน้าจอชั่วคราว" ก่อนสลับแท็บ:
    หน้ายืนยัน / หน้าเล่น / หน้าเควสพิเศษ / อนิเมชันเปลี่ยนฉากของหมวดความรู้
    (GameplayFrame ยังมีด่านกรองซ้ำอีกชั้นเผื่อกรณีที่โค้ดอื่นเปิด popup ผิดจังหวะ)

    [แก้รอบนี้] NavbarQuest (แท็บสลับหมวดภายใน) ถูกลบออกแล้ว — การสลับหมวดตอนนี้ทำผ่าน
    เมนูลอย "เควส" ใน ActionMenuBar เท่านั้น ซึ่งส่ง initialTab ใหม่เข้ามาทาง prop
    ตัว effect ด้านล่างจึงทำหน้าที่ sync ให้ (เผื่อ QuestSection ยังเปิดค้างอยู่ ไม่ถูก
    unmount ระหว่างสลับหมวด)
  \*──────────────────────────────────────────────────────────────────────────*/
  const handleChangeTab = (nextTab: QuestTabId) => {
    if (nextTab === activeTab) return
    setConfirmQuest(null)
    setPlayingQuest(null)
    setSpecialQuest(null)
    setActiveTab(nextTab)
  }

  // [แก้] sync activeTab จาก initialTab prop "ระหว่าง render" แทนการ setState ใน effect
  // (react-hooks/set-state-in-effect) — ยิงเฉพาะตอน initialTab prop เปลี่ยนค่าจริงๆ เท่านั้น
  // (ไม่ใช่ทุกครั้งที่ initialTab ดันไม่ตรงกับ activeTab เช่นตอนผู้ใช้สลับแท็บเองผ่าน
  // handleOpenQuestByCode) จึงต้องมี prevInitialTab ไว้จับจังหวะ "prop เปลี่ยน" โดยเฉพาะ
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    handleChangeTab(initialTab)
  }

  const anyGameplayOpen = !!confirmQuest || !!playingQuest || !!specialQuest
  useEscapeKey(onClose, !anyGameplayOpen)

  const tab = QUEST_TABS.find((t) => t.id === activeTab) ?? QUEST_TABS[0]
  const catalog = QUEST_CATALOG_BY_TAB[activeTab]

  const isCompleted = (questCode: string): boolean =>
    questLogs.some((l) => l.quest?.code === questCode && l.status === 'COMPLETED')

  /** [เพิ่มรอบนี้ — เควสเล่นซ้ำได้ต่อวัน] นับจำนวนครั้งที่ทำสำเร็จ "วันนี้" จริงๆ (อิง completedAt)
   *  ใช้กับเควสที่มี maxPerDay เช่น phys-pure-water — เควสอื่นไม่มี maxPerDay จึงไม่ถูกเรียกใช้ */
  const getTodayCompletionCount = (questCode: string): number => {
    const todayStr = new Date().toDateString()
    return questLogs.filter((l) =>
      l.quest?.code === questCode && l.status === 'COMPLETED' &&
      l.completedAt && new Date(l.completedAt).toDateString() === todayStr,
    ).length
  }

  const completedDailyCount = catalog.daily.filter((q) => isCompleted(q.code)).length

  // ── เงื่อนไขล็อกระดับ "ทั้งระบบ" ──
  const atRisk = userData.currentRiskLevel === 'MODERATE' || userData.currentRiskLevel === 'HIGH'
  const overFocusQuota = focusMinutesToday >= DAILY_FOCUS_QUOTA_MINUTES
  const inCurfew = isInCurfew(screenCurfew)

  /** [แก้ตามที่ระบุ — เอาตาม backend schema.prisma Quest.requiresQuestIds] เดิม hardcode
   *  "ด่านที่ 2 เป็นต้นไปในหมวดความรู้ต้องรอด่านก่อนหน้าใน array" (อิงตำแหน่ง index ของ
   *  KNOWLEDGE_DAILY ตรงๆ ไม่ใช่ข้อมูลต่อเควส) — ตอนนี้เปลี่ยนเป็นอ่านจาก q.requiresQuestIds
   *  ทั่วไปแทน (generic dependency ตาม schema จริง) เควสไหนไม่ได้ใส่ requiresQuestIds ไว้
   *  = ไม่มีเงื่อนไขนี้เลย ไม่ต้องพึ่งตำแหน่งใน array อีกต่อไป — ยังคงพฤติกรรมเดิมทุกจุดเพราะ
   *  KNOWLEDGE_DAILY 4 ตัวหลังใส่ requiresQuestIds ไล่ตามลำดับเดิมไว้ครบแล้ว (ดู questCatalog.ts) */
  const isRequiredQuestsIncomplete = (q: QuestDef): boolean => {
    if (!q.requiresQuestIds || q.requiresQuestIds.length === 0) return false
    return q.requiresQuestIds.some((code) => !isCompleted(code))
  }

  /** เหตุผลที่เควสนี้ยังกดไม่ได้ (null = กดได้) — ใช้ทั้งล็อกจริงและอธิบายให้ผู้ใช้ฟัง */
  const getLockReason = (q: QuestDef): string | null => {
    if (q.maxPerDay && getTodayCompletionCount(q.code) >= q.maxPerDay) {
      return `ทำครบโควตาวันนี้แล้ว (${q.maxPerDay}/${q.maxPerDay}) พรุ่งนี้มาใหม่นะ`
    }
    if (q.isLocked && completedDailyCount < (q.unlockAfterQuestCount ?? 1)) {
      return `ต้องทำเควสประจำวันให้ครบ ${q.unlockAfterQuestCount ?? 1} ข้อก่อน`
    }
    if (!q.isLocked && isRequiredQuestsIncomplete(q)) {
      return 'ต้องทำด่านก่อนหน้าในเส้นทางนี้ให้สำเร็จก่อน'
    }
    if (q.energyLevel === 'HIGH') {
      if (atRisk) return 'พักเควสหนักไว้ก่อน — ผลประเมินสุขภาพใจล่าสุดบอกว่าควรพัก'
      if (overFocusQuota) return 'วันนี้โฟกัสครบโควตาแล้ว พักสายตาและสมองก่อนดีกว่า'
      if (inCurfew) return 'อยู่ในช่วงตัดจอก่อนนอนที่คุณตั้งไว้เอง'
    }
    return null
  }

  const isQuestLocked = (q: QuestDef) => getLockReason(q) !== null

  /** แถบอธิบายเหตุผลรวมที่หัว sidebar */
  const globalNotice = atRisk
    ? 'โหมดถนอมใจกำลังทำงาน — เควสที่ใช้พลังงานสูงถูกพักไว้ชั่วคราว ลองเควสสายผ่อนคลายก่อนนะ'
    : overFocusQuota
      ? `วันนี้โฟกัสไปแล้ว ${Math.round(focusMinutesToday / 60 * 10) / 10} ชม. ครบโควตาที่ตั้งไว้ — เควสเรียนหนักถูกพักไว้`
      : inCurfew
        ? 'ถึงเวลาตัดจอก่อนนอนแล้ว เควสเรียนหนักถูกพักไว้จนถึงพรุ่งนี้'
        : consecutiveNegativeDays >= 2
          ? `รู้สึกแย่ติดกันมา ${consecutiveNegativeDays} วันแล้ว ถ้าไหวลองเควสสายผ่อนคลายในหมวดสุขภาพจิตดูนะ`
          : null

  const openQuest = (quest: QuestDef) => {
    if (SPECIAL_QUEST_CODES.includes(quest.code)) setSpecialQuest(quest)
    else setPlayingQuest(quest)
  }

  const handleSelectQuest = (q: QuestDef) => {
    if (isQuestLocked(q) || q.isPassive) return
    setConfirmQuest(q)
  }

  const handleStartQuest = () => {
    if (!confirmQuest) return
    const quest = confirmQuest
    setConfirmQuest(null)
    openQuest(quest)
  }

  /** [ใหม่] เปิดเควสจาก code ตรงๆ — ใช้โดยแดชบอร์ด/หน้าประเมิน ที่อยากพาไปทำเควสทันที */
  const handleOpenQuestByCode = (questCode: string) => {
    const quest = findQuestByCode(questCode)
    if (!quest) return
    // ล้างหน้าจอชั่วคราวของหมวดเดิมก่อนเสมอ แล้วค่อยสลับแท็บ + เปิดเควสใหม่
    // (ลำดับสำคัญ: handleChangeTab จะ setSpecialQuest(null) จึงต้องเรียกก่อน openQuest)
    const targetTab: QuestTabId =
      quest.category === 'EMOTION' ? 'mental' : quest.category === 'HEALTH' ? 'physical' : 'knowledge'
    handleChangeTab(targetTab)
    setConfirmQuest(null)
    openQuest(quest)
  }

  const handleCompletePlaying = (questCode: string, payload?: QuestPlayPayload) => {
    const questDef = findQuestByCode(questCode)
    // เช็คก่อนเรียก onToggle เสมอ — หลังเรียกแล้ว questLogs (async) อาจยังไม่อัปเดตทัน
    const alreadyDone = isCompleted(questCode)
    onToggle(questCode, payload)
    setPlayingQuest(null)
    if (!alreadyDone || questDef?.maxPerDay) triggerCelebration(questCode, payload?.skipped === true)
  }

  const handleClosePlaying = () => setPlayingQuest(null)
  const handleCompleteSpecial = (payload?: QuestPlayPayload) => {
    if (specialQuest) {
      const alreadyDone = isCompleted(specialQuest.code)
      onToggle(specialQuest.code, payload)
      if (!alreadyDone) triggerCelebration(specialQuest.code, payload?.skipped === true)
    }
    setSpecialQuest(null)
  }
  const handleCloseSpecial = () => setSpecialQuest(null)

  const todaysMoodEntry = getTodaysMoodEntry(moodEntries)

  return (
    <div className="quest-section-root" style={{ zIndex: Z_INDEX.fullScreenSection }}>
      {/* [แก้ตามที่ระบุ] เอาแถบเมนู/แท็บสลับหมวด (NavbarQuest) กับ sidebar รายการเควสออก —
          สลับหมวดทำผ่านเมนูลอย "เควส" ที่ ActionMenuBar ด้านล่างจอแทน (เหมือน V1) */}
      {/* [แก้] แยกป้ายชื่อโซน (กึ่งกลางจอ) กับปุ่มปิด (มุมขวาบน) ออกจากกันเป็นคนละ element
          เดิมรวมกันเป็นก้อนเดียวชิดขวา ย้ายแค่ป้ายไปกึ่งกลางจะลากปุ่มปิดตามไปด้วยโดยไม่ตั้งใจ */}
      <div className="quest-section-title-pill">
        {/* [อัปเดตรอบนี้] ทั้ง 3 หมวดมีไฟล์รูปจริงครบแล้ว (ดู iconAssets.ts) */}
        <span>
          {QUEST_TAB_ICONS[tab.id]
            ? <img src={QUEST_TAB_ICONS[tab.id]} className="icon-img" alt="" />
            : tab.emoji} {ZONE_TITLES[activeTab]}
        </span>
      </div>
      <button onClick={onClose} title="ปิด" className="quest-section-close-btn"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>

      <QuestRewardCelebration data={celebration} onDone={() => setCelebration(null)} />
      <QuestFeedbackPrompt data={feedbackPrompt} onReact={handleQuestFeedback} onDismiss={() => setFeedbackPrompt(null)} />

      {globalNotice && (
        <div className="quest-section-notice">{globalNotice}</div>
      )}

      <div className="quest-section-body">
        <div className="quest-gameplay-frame-wrap">
          <GameplayFrame
            activeTab={activeTab}
            pathQuests={catalog.daily}
            sideQuests={catalog.side}
            isCompleted={isCompleted}
            isLocked={isQuestLocked}
            getTodayCompletionCount={getTodayCompletionCount}
            accent={tab.accent}
            accentBg={tab.accentBg}
            onSelectQuest={handleSelectQuest}
            confirmQuest={confirmQuest}
            onStartQuest={handleStartQuest}
            onCancelConfirm={() => setConfirmQuest(null)}
            playingQuest={playingQuest}
            onCompletePlaying={handleCompletePlaying}
            onClosePlaying={handleClosePlaying}
            specialQuest={specialQuest}
            todaysMoodEntry={todaysMoodEntry}
            onRequestMoodCheckin={onRequestMoodCheckin}
            onCompleteSpecial={handleCompleteSpecial}
            onCloseSpecial={handleCloseSpecial}
            onFailIncinerator={onFailIncinerator}
            onOpenQuestByCode={handleOpenQuestByCode}
            userData={userData}
            treeStats={treeStats}
            placedItems={placedItems}
            decorationPositions={decorationPositions}
            onDecorationMove={onDecorationMove}
            treeGrowthPulse={treeGrowthPulse}
          />
        </div>
      </div>

      <style>{`
        .quest-section-root {
          /* [แก้] เต็มจอเสมอ ไม่มีการลดขนาด/เพิ่ม padding ที่กล่องนี้หรือกล่องลูกใดๆ อีกแล้ว —
             รอบก่อนเคยลอง padding-bottom ที่ .quest-section-body แต่พื้นหลังเข้ม "ของจริง"
             ไม่ได้อยู่ที่กล่องนี้หรือกล่องลูก (มันอยู่ลึกเข้าไปในแต่ละหน้าเอง เช่น
             .learning-quest-map/.incinerator-frame/วิดีโอพื้นหลัง) พื้นที่ padding เลยโชว์
             var(--bg) ของกล่องนี้ (สีขาว/อ่อน) แทนที่จะเป็นฉากเข้ม กลายเป็นแถบขาวที่ขอบล่าง
             ตอนนี้แก้ที่ "องค์ประกอบที่ชิดขอบล่างจริงๆ" แทน ผ่าน --gpf-safe-bottom ที่ประกาศ
             ไว้ที่ .gameplay-frame (GameplayFrame.css) ให้ทุกหน้าลูกอ้างอิงร่วมกัน */
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; flex-direction: column;
          background: var(--bg);
        }
        .quest-section-body {
          flex: 1; min-height: 0; display: flex; flex-direction: column;
        }

        /* [แก้ตามที่ระบุ] ป้ายชื่อโซนลอยกึ่งกลางด้านบนจอ แทน NavbarQuest เดิม (แบบ V1) */
        .quest-section-title-pill {
          position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 30;
          display: flex; align-items: center;
          padding: 8px 16px; border-radius: var(--r-pill);
          background: var(--bg-card); box-shadow: var(--sh-card);
          font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--text);
        }

        /* [แก้] ปุ่มปิด — แยกจากป้ายชื่อโซน คงตำแหน่งมุมขวาบนเดิมไว้ นี่คือปุ่มปิดเดียวของ
           ทั้งระบบเควส (GameplayFrame.tsx เอา toolbar ปุ่มปิดซ้ำออกไปแล้ว) มาตรฐาน
           เดียวกับปุ่มปิดในหน้าเควสพิเศษทุกหน้า: วงกลม 44x44px ลอยมุมขวาบน */
        .quest-section-close-btn {
          position: absolute; top: 12px; right: 12px; z-index: 30;
          width: 44px; height: 44px; border-radius: 50%; border: none;
          background: var(--bg-card); box-shadow: var(--sh-card); cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s ease;
        }
        .quest-section-close-btn:hover { background: var(--n200); }

        /* [ใหม่] อธิบายเหตุผลที่เควสบางตัวถูกล็อก — ย้ายจาก sidebar เดิมมาไว้ตรงนี้แทน */
        .quest-section-notice {
  position: absolute;
  top: 62px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  max-width: min(90vw, 480px);
  padding: 10px 16px;
  border-radius: 12px;
  --lc-bg-1: rgba(251, 191, 36, .14);
  background: var(--lc-bg-1);
  --lc-border-2: rgba(251, 191, 36, .32);
  border: 1px solid var(--lc-border-2);
  color: var(--text-sub);
  font-size: var(--fs-xs);
  line-height: 1.6;
  text-align: center;
}

        .quest-gameplay-frame-wrap { flex: 1; min-height: 0; min-width: 0; position: relative; }
      `}</style>
    </div>
  )
}