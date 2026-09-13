/*============================================================================*\
  GameplayFrame.tsx — "กรอบเขียว" หัวใจของการเล่นเควสทั้งหมด
  ────────────────────────────────────────────────────────────────────────────
  [แก้ไขรอบนี้]
   1) default view ของหมวด "สุขภาพจิต" เปลี่ยนจาก <TreeOfLife> → <MentalHealthDashboard>
      ตามที่ระบุ (ต้นไม้ยังดูได้ผ่านปุ่ม "ดูต้นไม้" ในแดชบอร์ด — ไม่ได้ตัดทิ้ง)
   2) เพิ่มหน้าเควสสุขภาพจิตใหม่: ทอดสมอใจฉบับใหม่ (MindfulAnchorPage — 4-7-8 breathing)
      [แก้รอบหลัง] เควสปรุงน้ำยาสำรวจใจ (DailyPotionPage) ถูกลบออกจากระบบทั้งหมดแล้ว —
      การเช็กอินอารมณ์ประจำวันไหลผ่าน MoodGateScreen → MoodCheckIn.tsx แทน
   3) เพิ่มระบบตอบสนองเมื่อเศร้าติดกันหลายวัน: ScreeningPage + SafetyNetPage
      เด้งขึ้นมา "ในกรอบเขียว" เหมือน popup อื่นทุกประการ
   4) popup ทุกตัวยังเป็น position:absolute ครอบเฉพาะกรอบนี้ (.gameplay-frame เป็น
      position:relative) ไม่ทะลุออกไปเต็มหน้าจอ และไม่ล้นออกนอกกรอบ (overflow:hidden)

  [แก้รอบนี้ — ปัญหาหน้าจอซ้อนทับกันเวลาสลับแท็บ]
   5) เดิมเวลาผู้ใช้กดแถบเมนูเปลี่ยนหมวด (ความรู้ / สุขภาพกาย / สุขภาพจิต) มีแค่
      `activeTab` ที่เปลี่ยน แต่ state ของ popup ที่เปิดค้างอยู่ (confirmQuest /
      playingQuest / specialQuest) ยังอยู่ครบ → หน้าเควสของหมวดเดิมจึงยังลอย
      ทับ default view ของหมวดใหม่ กลายเป็นภาพซ้อนกันสองชั้น
      แก้ 3 ชั้นซ้อนกันเพื่อให้ปิดช่องโหว่นี้ทุกทาง:
        ก. QuestSection เคลียร์ state ทั้งสามทันทีที่เปลี่ยนแท็บ (ต้นตอของปัญหา)
        ข. ไฟล์นี้กรองอีกชั้น — popup จะเรนเดอร์ก็ต่อเมื่อหมวดของเควสนั้น
           "ตรงกับแท็บที่เปิดอยู่จริง" เท่านั้น ถึงพาเรนต์ลืมเคลียร์ ก็ไม่มีทางซ้อน
        ค. ใส่ key={activeTab} ให้ default view → React unmount ของเก่าทิ้งทั้งก้อน
           ไม่ใช่แค่สลับเนื้อหา ทำให้ timer/วิดีโอ/canvas ของหมวดเดิมถูกคืนหน่วยความจำ
      และปิด SafetyNet + TransitionOverlay ทุกครั้งที่เปลี่ยนแท็บด้วย

  [แก้] ย้าย <style> ที่เคยฝังอยู่ท้ายไฟล์ออกไปเป็น GameplayFrame.css สิ่งเดียวกัน —
  README ของโปรเจกต์ห้ามฝัง <style> ในคอมโพเนนต์และห้ามเขียนสีดิบ

  [แก้ — ระบบปุ่มปิดซ้ำ] เดิมมีปุ่มปิด 2 จุดพร้อมกันบนหน้าเดียว: .gameplay-frame__toolbar
  ที่นี่ (มุมซ้ายบน) กับปุ่มปิดของ QuestSection.tsx (มุมขวาบน) ตัดปุ่ม/prop onCloseSection
  ออกจากไฟล์นี้ทั้งหมด เหลือปุ่มปิดจุดเดียวที่ QuestSection.tsx ทำหน้าที่ปิดทั้งระบบเควส
  ทุกกรณี (ทั้ง default view และตอนกำลังเล่นเควสอยู่)
\*============================================================================*/

import React, { useState } from 'react'

import { MOOD_GATED_QUEST_CODES, type QuestDef, type QuestTabId } from '../../config/questCatalog'
import { QUEST_ICONS } from '../../config/iconAssets'
import type { UserData, TreeStats, PlacedItem, DecorationPositionMap, MoodEntryData, QuestCategory } from '../../types'
import type { QuestPlayPayload } from '../../types.mental'
import { useAppContext } from '../../context/AppContext'
import LearningQuestMap from './learning/LearningQuestMap'
import QuestGateView from './QuestGateView'
import QuestConfirmModal from './QuestConfirmModal'
import QuestPlayModal from './QuestPlayModal'
import MoodGateScreen from './MoodGateScreen'
import OracleCardsPage from './mental/OracleCardsPage'
import ReframerJournalPage from './mental/ReframerJournalPage'
import IncineratorPage from './mental/IncineratorPage'
import GratitudeShieldPage from './mental/GratitudeShieldPage'
import MindfulAnchorPage from './mental/MindfulAnchorPage'
import ScreeningPage from './mental/ScreeningPage'
import SafetyNetPage from './mental/SafetyNetPage'
import './GameplayFrame.css'

const ORACLE_QUEST_CODE = 'ment-oracle-activation'
const JOURNAL_QUEST_CODE = 'ment-reframer-journal'
const INCINERATOR_QUEST_CODE = 'ment-cognitive-incinerator'
const GRATITUDE_SHIELD_QUEST_CODE = 'ment-gratitude-shield'
/** [ใหม่] เควสที่มีหน้าจอเต็มของตัวเอง ไม่ผ่าน questGameRegistry */
const MINDFUL_ANCHOR_QUEST_CODE = 'ment-mindful-anchor'

/** หมวดของเควส → แท็บที่เควสนั้นสังกัด ใช้กรองไม่ให้ popup ข้ามหมวดมาซ้อนกัน */
const CATEGORY_TO_TAB: Record<QuestCategory, QuestTabId> = {
  KNOWLEDGE: 'knowledge',
  HEALTH: 'physical',
  EMOTION: 'mental',
}

interface GameplayFrameProps {
  activeTab: QuestTabId
  pathQuests: QuestDef[]
  sideQuests: QuestDef[]
  isCompleted: (questCode: string) => boolean
  isLocked: (quest: QuestDef) => boolean
  /** [ใหม่] จำนวนครั้งที่ทำสำเร็จ "วันนี้" แล้ว — ใช้โชว์ badge "เล่นซ้ำได้ X/Y ครั้ง/วัน"
   *  บนเควสที่ isRepeatable (ดู questCatalog.ts) ใน QuestGateView/LearningQuestMap */
  getTodayCompletionCount: (questCode: string) => number
  accent: string
  accentBg: string

  onSelectQuest: (quest: QuestDef) => void

  confirmQuest: QuestDef | null
  onStartQuest: () => void
  onCancelConfirm: () => void

  playingQuest: QuestDef | null
  onCompletePlaying: (questCode: string, payload?: Record<string, unknown>) => void
  onClosePlaying: () => void

  specialQuest: QuestDef | null
  todaysMoodEntry: MoodEntryData | null
  onRequestMoodCheckin: () => void
  /** [แก้รอบนี้ — โหมดเคร่งครัด] รับ payload เสริมได้ (เช่น { skipped: true } จากทอดสมอใจที่ผู้เล่น
   *  กดข้ามกลางคัน) — หน้าเควสพิเศษอื่นที่ไม่มี concept การข้ามยังเรียกแบบไม่ส่ง payload ได้ตามเดิม */
  onCompleteSpecial: (payload?: QuestPlayPayload) => void
  onCloseSpecial: () => void
  onFailIncinerator: () => void

  /** [ใหม่] ให้แดชบอร์ด/หน้าประเมิน สั่งเปิดเควสด้วย code ตรงๆ ได้ (ข้ามหน้ายืนยัน) */
  onOpenQuestByCode: (questCode: string) => void

  userData: UserData
  treeStats: TreeStats
  placedItems: PlacedItem[]
  decorationPositions: DecorationPositionMap
  onDecorationMove: (itemId: string, xPct: number, yPct: number) => void
  treeGrowthPulse?: { category: QuestCategory; key: number } | null
}

export default function GameplayFrame({
  activeTab, pathQuests, sideQuests, isCompleted, isLocked, getTodayCompletionCount, accent, accentBg,
  onSelectQuest, confirmQuest, onStartQuest, onCancelConfirm,
  playingQuest, onCompletePlaying, onClosePlaying,
  specialQuest, todaysMoodEntry, onRequestMoodCheckin, onCompleteSpecial, onCloseSpecial, onFailIncinerator,
  onOpenQuestByCode,
}: GameplayFrameProps) {
  const { pendingScreening, dismissScreening } = useAppContext()
  const [safetyNetOpen, setSafetyNetOpen] = useState(false)

  /* ── [ใหม่] ยามกันหน้าซ้อน ──
     popup จะถูกเรนเดอร์ก็ต่อเมื่อเควสนั้นอยู่ในหมวดเดียวกับแท็บที่เปิดอยู่จริง
     เป็นด่านสุดท้ายที่รับประกันว่า "ไม่มีทาง" เห็นหน้าของหมวดเดิมค้างบนหมวดใหม่
     แม้พาเรนต์จะลืมเคลียร์ state หรือมีโค้ดใหม่มาเปิด popup ผิดจังหวะในอนาคต */
  const belongsToActiveTab = (quest: QuestDef | null): boolean =>
    !!quest && CATEGORY_TO_TAB[quest.category] === activeTab

  const visibleConfirmQuest = belongsToActiveTab(confirmQuest) ? confirmQuest : null
  const visiblePlayingQuest = belongsToActiveTab(playingQuest) ? playingQuest : null
  const visibleSpecialQuest = belongsToActiveTab(specialQuest) ? specialQuest : null

  /* ปิดกล่องพยาบาลเมื่อเปลี่ยนแท็บ — เป็น local state ของไฟล์นี้ พาเรนต์เคลียร์ให้ไม่ได้
     (ส่วน pendingScreening ตั้งใจให้ค้างข้ามแท็บ เพราะเป็นเรื่องที่ควรตอบก่อนไปทำอย่างอื่น)
     [แก้] ตั้งค่าระหว่าง render ทันทีที่ activeTab เปลี่ยน แทนการ setState ใน effect
     (react-hooks/set-state-in-effect) — แพทเทิร์น "ปรับ state เมื่อ prop เปลี่ยน" */
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab)
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab)
    setSafetyNetOpen(false)
  }

  const confirmLocked = visibleConfirmQuest ? isLocked(visibleConfirmQuest) : false
  // [แก้รอบนี้ — เควสเล่นซ้ำได้ต่อวัน] เควสที่มี maxPerDay (เช่น phys-pure-water) ต้องยัง
  // กดเริ่มใหม่ได้แม้เคยทำสำเร็จมาแล้ววันนี้ — ปิดกั้นเฉพาะตอนครบโควตาจริง (isLocked ข้างบน
  // เช็ค maxPerDay ให้แล้ว) ไม่ใช่ทันทีที่ "เคยสำเร็จ" แบบเควสทั่วไป
  const confirmCompleted = visibleConfirmQuest && !visibleConfirmQuest.maxPerDay
    ? isCompleted(visibleConfirmQuest.code) : false


  return (
    <div className="gameplay-frame">
      {/* ── Default view ตามหมวดที่เลือก ── */}
      {/* key={activeTab} — บังคับให้ React unmount view ของหมวดเดิมทิ้งทั้งก้อนแล้ว
          mount ของใหม่ ไม่ใช่ reuse โครงเดิม → timer / วิดีโอ / state ภายในของ
          หมวดเดิมถูกล้างจริง ไม่มีอะไรค้างมาทับหมวดใหม่ */}
      <div className="gameplay-frame__default-view" key={activeTab}>
        {activeTab === 'knowledge' && (
          <LearningQuestMap
            pathQuests={pathQuests}
            sideQuests={sideQuests}
            isCompleted={isCompleted}
            isLocked={isLocked}
            getTodayCompletionCount={getTodayCompletionCount}
            onSelectQuest={onSelectQuest}
            selectedQuestCode={visibleConfirmQuest?.code ?? visiblePlayingQuest?.code ?? null}
          />
        )}

        {activeTab === 'physical' && (
          <QuestGateView
            category="physical"
            quests={[...pathQuests, ...sideQuests]}
            isCompleted={isCompleted}
            isLocked={isLocked}
            getTodayCompletionCount={getTodayCompletionCount}
            onSelectQuest={onSelectQuest}
          />
        )}

        {/* [แก้ตามที่ระบุ] หมวดสุขภาพจิต → กลับไปใช้หน้าหลักแบบ V1 (โลโก้กลางจอ + คำคม + FAB)
            แทน MentalHealthDashboard — คงทางลัดไปกล่องความช่วยเหลือฉุกเฉิน (SafetyNetPage) ไว้
            ผ่านลิงก์เล็กๆ ใต้คำคม ไม่ได้ตัดการเข้าถึงจุดนี้ทิ้ง */}
        {activeTab === 'mental' && (
          <QuestGateView
            category="mental"
            quests={[...pathQuests, ...sideQuests]}
            isCompleted={isCompleted}
            isLocked={isLocked}
            getTodayCompletionCount={getTodayCompletionCount}
            onSelectQuest={onSelectQuest}
            onOpenSafetyNet={() => setSafetyNetOpen(true)}
            // [ใหม่] บอกล่วงหน้าที่เมนู FAB เลยว่าเควสไหนต้องเช็คอินอารมณ์ก่อน (ไพ่ทิพย์/สมุด
            // บันทึก) แทนที่จะปล่อยให้กดเข้าไปแล้วเจอ MoodGateScreen เงียบๆ โดยไม่มีสัญญาณอะไร
            // มาก่อนเลย — ใช้ MOOD_GATED_QUEST_CODES ตัวเดียวกับที่คุม fallback ด้านล่าง
            needsMoodCheckin={(code) => MOOD_GATED_QUEST_CODES.includes(code) && !todaysMoodEntry}
          />
        )}
      </div>

      {/* ── Contained popups (position:absolute ครอบแค่กรอบนี้) ── */}
      <QuestConfirmModal
        quest={visibleConfirmQuest}
        accent={accent}
        accentBg={accentBg}
        locked={confirmLocked}
        completed={confirmCompleted}
        onStart={onStartQuest}
        onCancel={onCancelConfirm}
      />

      <QuestPlayModal
        quest={visiblePlayingQuest}
        accent={accent}
        accentBg={accentBg}
        onComplete={onCompletePlaying}
        onClose={onClosePlaying}
      />

      {visibleSpecialQuest?.code === ORACLE_QUEST_CODE && (
        todaysMoodEntry ? (
          <OracleCardsPage moodEntry={todaysMoodEntry} onComplete={onCompleteSpecial} onClose={onCloseSpecial} />
        ) : (
          <MoodGateScreen title="ไพ่ทิพย์กระตุ้นพลัง" icon="🔮" iconImg={QUEST_ICONS[ORACLE_QUEST_CODE]} accent={accent} onRequestMoodCheckin={onRequestMoodCheckin} onClose={onCloseSpecial} />
        )
      )}

      {visibleSpecialQuest?.code === JOURNAL_QUEST_CODE && (
        todaysMoodEntry ? (
          <ReframerJournalPage
            moodEntry={todaysMoodEntry}
            alreadyCompleted={isCompleted(JOURNAL_QUEST_CODE)}
            onComplete={onCompleteSpecial}
            onClose={onCloseSpecial}
          />
        ) : (
          <MoodGateScreen title="สมุดบันทึกรากไม้เรืองแสง" icon="📖" iconImg={QUEST_ICONS[JOURNAL_QUEST_CODE]} accent={accent} onRequestMoodCheckin={onRequestMoodCheckin} onClose={onCloseSpecial} />
        )
      )}

      {visibleSpecialQuest?.code === INCINERATOR_QUEST_CODE && (
        <IncineratorPage onComplete={onCompleteSpecial} onFail={onFailIncinerator} onClose={onCloseSpecial} />
      )}

      {visibleSpecialQuest?.code === GRATITUDE_SHIELD_QUEST_CODE && (
        <GratitudeShieldPage
          alreadyCompleted={isCompleted(GRATITUDE_SHIELD_QUEST_CODE)}
          onComplete={onCompleteSpecial}
          onClose={onCloseSpecial}
        />
      )}

      {/* [ใหม่] ทอดสมอใจ — 4-7-8 breathing 2 นาที (ไฟล์ MindfulAnchorPage.tsx ที่เขียนใหม่ทั้งไฟล์) */}
      {visibleSpecialQuest?.code === MINDFUL_ANCHOR_QUEST_CODE && (
        <MindfulAnchorPage onComplete={onCompleteSpecial} onClose={onCloseSpecial} />
      )}

      {/* ── [ใหม่] ระบบตอบสนองเมื่อรู้สึกแย่ติดต่อกันหลายวัน ──
          เด้งทับทุกอย่างในกรอบเขียว (z-index สูงกว่า popup เควสปกติ) เพราะเป็นเรื่องที่
          ควรได้รับความสนใจก่อน — แต่ยัง "ขอข้ามไว้ก่อน" ได้เสมอ ไม่บังคับผู้ใช้ */}
      {pendingScreening && (
        <ScreeningPage
          pending={pendingScreening}
          onFinished={dismissScreening}
          onOpenSafetyNet={() => { dismissScreening(); setSafetyNetOpen(true) }}
          onStartCalmingQuest={() => { dismissScreening(); onOpenQuestByCode(MINDFUL_ANCHOR_QUEST_CODE) }}
          onDismiss={dismissScreening}
        />
      )}

      {safetyNetOpen && (
        <SafetyNetPage
          onClose={() => setSafetyNetOpen(false)}
          onStartCalmingQuest={() => { setSafetyNetOpen(false); onOpenQuestByCode(MINDFUL_ANCHOR_QUEST_CODE) }}
        />
      )}

    </div>
  )
}