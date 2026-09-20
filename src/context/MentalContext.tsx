import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { RiskLevel, PostItData, MoodTypeValue } from '../types'
import type {
  MoodColorCode, MoodPotionLog, ScreeningAnswer, ScreeningResultRecord,
  ScreeningTriggerType, PendingScreening, ActivityType, ActivityLogRecord,
  LearningCheckinRecord, QuestFeedbackRecord,
} from '../types.mental'
import {
  bangkokDateKey, dateKeyDaysAgo, countConsecutiveNegativeDays, legacyMoodToColor,
} from '../config/moodPotion'
import {
  NEGATIVE_STREAK_TRIGGER, buildTriggerReason, computeNextDueAt, computeRiskLevel, computeTotalScore,
} from '../config/screening'
import { useUser } from './UserContext'
import { useProgress } from './ProgressContext'
import { useUI } from './UIContext'

const C_1 = '#fde68a'

const TEXT_1 = C_1

/*============================================================================*\
  MentalContext — [ไฟล์ใหม่ในรอบรวมโค้ด]
  ────────────────────────────────────────────────────────────────────────────
  ยกระบบสุขภาพจิตทั้งหมด (ปรุงน้ำยาสำรวจใจ / คัดกรอง / กล่องพยาบาล / activity log /
  เช็คอินการเรียน / โควตาโฟกัส / เวลาตัดจอ) ออกมาเป็น context ของตัวเอง

  ทำไมต้องแยกเป็นตัวที่ 4: ตอนรวมแพตช์สุขภาพจิตเข้ากับการรีแฟกเตอร์ context
  ถ้ายัดกลับเข้า AppContext เดิม จะกลับไปเป็น god object เหมือนเดิมทันที
  ระบบนี้มี state 8 ตัวและฟังก์ชัน 9 ตัว ซึ่งเปลี่ยนแปลงคนละจังหวะกับ
  เควส/โปรไฟล์/โมดัล จึงควรมีขอบเขตของตัวเอง

  ต้องอยู่ในสุด (ข้างใน User → Progress → UI) เพราะ:
    • อ่าน journalEntries จาก ProgressContext เพื่อคำนวณ streak ความขอบคุณ
    • เขียน currentRiskLevel กลับเข้า UserContext เมื่อได้ผลคัดกรอง
    • สั่งปิดโมดัลเช็คอินอารมณ์ผ่าน UIContext

  [หมายเหตุเรื่อง backend] ข้อมูลในไฟล์นี้ยังไม่มีตารางรองรับครบ — ดู
  docs/DB_CHANGES.md ตารางที่ต้องเพิ่มคือ activity_logs, learning_checkins,
  oracle_draws และคอลัมน์ colorCode/moodScore/logDate ใน mood_entries
\*============================================================================*/

const GRATITUDE_AURA_TARGET = 14
export const DAILY_FOCUS_QUOTA_MINUTES = 300

export interface ScreenCurfew {
  bedtime: string       // 'HH:MM'
  curfewHours: number   // ตัดจอกี่ชั่วโมงก่อนถึงเวลานอน
}

interface MentalContextValue {
  moodPotionLogs: MoodPotionLog[]
  consecutiveNegativeDays: number
  screeningResults: ScreeningResultRecord[]
  nextScreeningDueAt: string | null
  pendingScreening: PendingScreening | null
  activityLogs: ActivityLogRecord[]
  learningCheckins: LearningCheckinRecord[]
  focusMinutesToday: number
  screenCurfew: ScreenCurfew | null
  gratitudeStreak: number
  gratitudeAuraUnlocked: boolean
  postIts: PostItData[]
  /** [เพิ่มตามที่ระบุ] feedback สั้นๆ หลังทำเควสสำเร็จ — ใช้ประเมิน badge "Mirror of Truth" */
  questFeedbackLogs: QuestFeedbackRecord[]
  /** [เพิ่มตามที่ระบุ] code ของ badge ที่ปลดล็อกแล้ว (BADGE_CATALOG) — ประเมินสดจาก
   *  activityLogs/questFeedbackLogs ทุกครั้งที่ค่าที่เกี่ยวข้องเปลี่ยน ไม่ใช่ state แยก */
  earnedBadges: string[]

  submitMoodPotion: (input: { colorCode: MoodColorCode; moodScore: number; note: string | null }) => void
  requestScreening: (triggerType?: ScreeningTriggerType) => void
  submitScreening: (answers: ScreeningAnswer[], triggerType: ScreeningTriggerType) => ScreeningResultRecord
  dismissScreening: () => void
  logActivity: (input: { activityType: ActivityType; durationSeconds: number; meta?: Record<string, unknown> }) => void
  saveLearningCheckin: (record: Omit<LearningCheckinRecord, 'id' | 'userId' | 'checkinDate' | 'createdAt'>) => void
  addFocusMinutes: (minutes: number) => void
  setScreenCurfew: (curfew: ScreenCurfew) => void
  /** ทับของ ProgressContext — เช็คอินอารมณ์แบบ 3 ปุ่มเดิม ส่งเข้าท่อเดียวกับเควสปรุงน้ำยา
   *  [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] เพิ่ม subMood (ค่าจริง 1 ใน 8 ตัวที่
   *  ผู้ใช้เลือกจาก bottom sheet ใน MoodCheckIn.tsx) ส่งต่อเข้า mood_entries.mood ตรงๆ
   *  แทนที่จะปัดเหลือแค่ HAPPY/CALM/SAD 3 ค่าเหมือนเดิม
   *  [แก้รอบนี้ — บั๊กเจอเควสประตูอารมณ์ซ้ำบนจอเล็ก] คืน Promise ที่ resolve หลัง moodEntries
   *  ถูกบันทึกจริงแล้วเท่านั้น — MoodCheckIn.tsx ต้อง await ก่อนจะให้ Dashboard ปิด modal
   *  (ดูรายละเอียด race condition เต็มๆ ที่ handleMoodSubmit ใน ProgressContext.tsx) */
  handleMoodSubmit: (mood: 'good' | 'neutral' | 'bad', subMood: MoodTypeValue, text: string) => Promise<void>
  /** [เพิ่มตามที่ระบุ — กลไกใหม่แทน 'know-mirror-of-truth' ที่ถูกลบไปแล้ว] บันทึก feedback
   *  สั้นๆ ที่ผู้ใช้ให้ทันทีหลังทำเควสสำเร็จ (questCode + เวลาทำสำเร็จ + ปฏิกิริยา) */
  submitQuestFeedback: (questCode: string, completedAt: string, reaction: 'good' | 'neutral' | 'bad') => void
}

const MentalCtx = createContext<MentalContextValue | null>(null)

export function MentalProvider({ children }: { children: ReactNode }) {
  const { userData, applyUserPatch, isLoggedIn } = useUser()
  const { journalEntries, handleMoodSubmit: recordMoodEntry } = useProgress()
  const { closeModal } = useUI()

  const [moodPotionLogs, setMoodPotionLogs] = useState<MoodPotionLog[]>([])
  const [screeningResults, setScreeningResults] = useState<ScreeningResultRecord[]>([])
  const [pendingScreening, setPendingScreening] = useState<PendingScreening | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([])
  const [questFeedbackLogs, setQuestFeedbackLogs] = useState<QuestFeedbackRecord[]>([])
  const [learningCheckins, setLearningCheckins] = useState<LearningCheckinRecord[]>([])
  const [postIts, setPostIts] = useState<PostItData[]>([])
  const [focusState, setFocusState] = useState<{ date: string; minutes: number }>(
    () => ({ date: bangkokDateKey(), minutes: 0 }),
  )
  const [screenCurfew, setScreenCurfewState] = useState<ScreenCurfew | null>(null)

  /* ── ค่าที่คำนวณสด ไม่เก็บซ้ำเป็น state เพื่อไม่ให้ข้อมูลขัดกันเอง ── */

  const consecutiveNegativeDays = useMemo(
    () => countConsecutiveNegativeDays(moodPotionLogs), [moodPotionLogs],
  )

  const nextScreeningDueAt = useMemo(
    () => (screeningResults.length === 0 ? null : screeningResults[screeningResults.length - 1].nextDueAt),
    [screeningResults],
  )

  /** นับคืนที่บันทึก "เกราะแห่งความขอบคุณ" ติดต่อกัน โดยไล่ย้อนจากวันนี้ */
  const gratitudeStreak = useMemo(() => {
    const dates = new Set(
      journalEntries
        .filter((j) => j.questCode === 'ment-gratitude-shield')
        .map((j) => bangkokDateKey(j.createdAt)),
    )
    let streak = 0
    for (let i = 0; i < 60; i++) {
      const key = dateKeyDaysAgo(i)
      if (!dates.has(key)) {
        if (i === 0) continue   // ยังไม่ได้เขียนของวันนี้ ไม่ถือว่าขาด
        break
      }
      streak++
    }
    return streak
  }, [journalEntries])

  const gratitudeAuraUnlocked = gratitudeStreak >= GRATITUDE_AURA_TARGET

  /** [เพิ่มตามที่ระบุ] badge ที่ปลดล็อกแล้ว — ประเมินสดจาก state ที่มีอยู่แล้ว ไม่เก็บเป็น
   *  state แยกต่างหาก (กันข้อมูลสองชุดขัดกันเอง เหมือน consecutiveNegativeDays/gratitudeStreak
   *  ด้านบน) มีแค่ 2 badge ที่ implement จริงตามที่ตัดสินใจไว้ — ดู BADGE_CATALOG */
  const earnedBadges = useMemo(() => {
    const earned: string[] = []

    // "Strategic Delay" — seed.ts: reviewIntervalStreak รายเดือนต่อเนื่อง 3 รอบ questCode
    // content-review ตีความเป็น "มีการทบทวน (activityType REVIEW) เกิดขึ้นอย่างน้อย 1 ครั้ง
    // ในแต่ละเดือนปฏิทิน ติดต่อกันอย่างน้อย 3 เดือนนับถึงเดือนปัจจุบัน" — ใช้ activityLogs
    // ที่ ContentReviewGame.tsx (เควส know-content-review) log ไว้แล้วด้วย activityType REVIEW
    const reviewMonths = new Set(
      activityLogs
        .filter((a) => a.activityType === 'REVIEW')
        .map((a) => a.completedAt.slice(0, 7)), // 'YYYY-MM'
    )
    let monthStreak = 0
    const cursor = new Date()
    for (let i = 0; i < 24; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      if (!reviewMonths.has(key)) break
      monthStreak++
      cursor.setMonth(cursor.getMonth() - 1)
    }
    if (monthStreak >= 3) earned.push('strategic-delay')

    // "Mirror of Truth" — seed.ts: feedbackWithinHours value 24 ("ขอ feedback ทันทีหลังทำ
    // กิจกรรมเสร็จ") — questFeedbackLogs ทุกอันถูกสร้างทันทีตอนกดปุ่ม feedback หลังเควสสำเร็จ
    // อยู่แล้ว (ดู QuestFeedbackPrompt.tsx) จึงอยู่ในกรอบ 24 ชม. เสมอโดยไม่ต้องเช็คซ้ำ —
    // ปลดล็อกตั้งแต่ครั้งแรกที่ให้ feedback
    if (questFeedbackLogs.length > 0) earned.push('mirror-of-truth')

    return earned
  }, [activityLogs, questFeedbackLogs])
  const focusMinutesToday = focusState.date === bangkokDateKey() ? focusState.minutes : 0

  /* ── ปรุงน้ำยาสำรวจใจ → ตัวนับวันติดต่อกัน → ตัวจุดชนวนแบบประเมิน ── */

  const submitMoodPotion = useCallback<MentalContextValue['submitMoodPotion']>(
    ({ colorCode, moodScore, note }) => {
      const today = bangkokDateKey()

      // 1 วัน 1 record — ปรุงซ้ำในวันเดียวกันถือเป็นการ "แก้ไข" ไม่ใช่เพิ่มวันใหม่
      // (สอดคล้องกับ unique(userId, logDate) ที่ขอให้เพิ่มใน DB)
      const record: MoodPotionLog = {
        id: `mood-${today}`,
        userId: userData.id,
        logDate: today,
        colorCode,
        moodScore,
        note,
        createdAt: new Date().toISOString(),
      }

      const nextLogs = [...moodPotionLogs.filter((m) => m.logDate !== today), record]
      setMoodPotionLogs(nextLogs)

      // [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] เดิมเรียก recordMoodEntry ตรงนี้เอง
      // โดยคำนวณย้อนกลับจากสีเป็น 3 ค่า good/neutral/bad ล้วนๆ (ทิ้ง backendMood ที่แม่นกว่า
      // ของแต่ละสีไปเฉยๆ) ตอนนี้ย้ายความรับผิดชอบนี้ไปให้ handleMoodSubmit (ผู้เรียกเดียวของ
      // submitMoodPotion ในระบบตอนนี้) เรียก recordMoodEntry เองพร้อม subMood ที่ผู้ใช้เลือก
      // จริงจาก bottom sheet แทน — ฟังก์ชันนี้เหลือหน้าที่แค่จัดการฝั่ง "น้ำยา"/ตัวจุดชนวนล้วนๆ

      // ตัวจุดชนวนฉุกเฉิน: อารมณ์ด้านลบติดกันครบเกณฑ์ → เด้งแบบประเมินทันที
      const streak = countConsecutiveNegativeDays(nextLogs)
      const screenedToday = screeningResults.some((s) => bangkokDateKey(s.createdAt) === today)
      if (streak >= NEGATIVE_STREAK_TRIGGER && !screenedToday) {
        setPendingScreening({ triggerType: 'EMERGENCY', reason: buildTriggerReason('EMERGENCY', streak) })
      }
    },
    [moodPotionLogs, screeningResults, userData.id],
  )

  /* ── แบบคัดกรอง ── */

  const requestScreening = useCallback((triggerType: ScreeningTriggerType = 'ROUTINE') => {
    setPendingScreening({ triggerType, reason: buildTriggerReason(triggerType, consecutiveNegativeDays) })
  }, [consecutiveNegativeDays])

  const dismissScreening = useCallback(() => setPendingScreening(null), [])

  const submitScreening = useCallback<MentalContextValue['submitScreening']>((answers, triggerType) => {
    const totalScore = computeTotalScore(answers)
    const riskLevel: RiskLevel = computeRiskLevel(totalScore)
    const record: ScreeningResultRecord = {
      id: `screen-${Date.now()}`,
      userId: userData.id,
      triggerType,
      answers,
      totalScore,
      riskLevel,
      createdAt: new Date().toISOString(),
      nextDueAt: computeNextDueAt(),
    }
    setScreeningResults((prev) => [...prev, record])
    // users.currentRiskLevel มีอยู่แล้วใน schema — เขียนกลับเข้า cache ของ UserContext
    // ค่านี้คือหัวใจของระบบตอบสนอง: QuestSection ใช้ล็อกเควสพลังงานสูง,
    // MindfulAnchorPage ใช้ถามยืนยันก่อนออกกลางคัน, แดชบอร์ดใช้เลือกแผนดูแล
    applyUserPatch({ ...userData, currentRiskLevel: riskLevel })
    setPendingScreening(null)
    return record
  }, [userData, applyUserPatch])

  /* ── activity log / เช็คอินการเรียน / โควตาโฟกัส / เวลาตัดจอ ── */

  const logActivity = useCallback<MentalContextValue['logActivity']>(({ activityType, durationSeconds, meta }) => {
    setActivityLogs((logs) => [
      ...logs,
      {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: userData.id,
        activityType,
        durationSeconds,
        meta: meta ?? {},
        completedAt: new Date().toISOString(),
      },
    ])
  }, [userData.id])

  /** [เพิ่มตามที่ระบุ — กลไกใหม่แทน 'know-mirror-of-truth'] เรียกจาก QuestFeedbackPrompt.tsx
   *  หลังผู้ใช้กดปฏิกิริยา (👍/😐/👎) ให้เควสที่เพิ่งทำสำเร็จ */
  const submitQuestFeedback = useCallback<MentalContextValue['submitQuestFeedback']>((questCode, completedAt, reaction) => {
    setQuestFeedbackLogs((prev) => [
      ...prev,
      { id: `fb-${Date.now()}`, questCode, reaction, completedAt, submittedAt: new Date().toISOString() },
    ])
  }, [])

  const saveLearningCheckin = useCallback<MentalContextValue['saveLearningCheckin']>((record) => {
    const today = bangkokDateKey()
    setLearningCheckins((prev) => [
      ...prev.filter((c) => c.checkinDate !== today),
      { ...record, id: `checkin-${today}`, userId: userData.id, checkinDate: today, createdAt: new Date().toISOString() },
    ])
    // คำถามโบนัส "พรุ่งนี้อยากปรับอะไร" → แปะเป็น Post-it บนกระดานจริง ตามเอกสารเควส
    if (record.bonusNote) {
      setPostIts((prev) => [
        ...prev,
        {
          id: `postit-${today}`,
          content: record.bonusNote as string,
          color: TEXT_1,
          positionX: 30 + ((prev.length * 13) % 40),
          positionY: 25 + ((prev.length * 17) % 40),
          isPinned: false,
          userId: userData.id,
        },
      ])
    }
  }, [userData.id])

  const addFocusMinutes = useCallback((minutes: number) => {
    const today = bangkokDateKey()
    setFocusState((prev) => (prev.date === today
      ? { date: today, minutes: prev.minutes + minutes }
      : { date: today, minutes }))
  }, [])

  const setScreenCurfew = useCallback((curfew: ScreenCurfew) => setScreenCurfewState(curfew), [])

  const handleMoodSubmit = useCallback(async (mood: 'good' | 'neutral' | 'bad', subMood: MoodTypeValue, text: string) => {
    // เช็คอินอารมณ์ 3 ปุ่มแบบเดิมยังใช้ได้อยู่ แต่แปลงเป็นสีน้ำยาแล้วส่งเข้าท่อเดียวกับ
    // เควสปรุงน้ำยา เพื่อให้ตัวนับ "เศร้าติดกัน 3 วัน" นับได้ครบทุกช่องทาง
    // ไม่ว่าผู้ใช้จะบันทึกจากตรงไหนก็ตาม
    submitMoodPotion({ colorCode: legacyMoodToColor(mood), moodScore: 3, note: text || null })
    // [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] เดิม recordMoodEntry (ProgressContext)
    // คำนวณย้อนกลับจากสีน้ำยาเป็น 3 ค่า good/neutral/bad เท่านั้น ทำให้ mood_entries.mood
    // เป็นได้แค่ HAPPY/CALM/SAD เสมอ ไม่ว่าผู้ใช้จะเลือกอารมณ์ย่อยอะไรจริงๆ — ตอนนี้ส่ง subMood
    // ที่ผู้ใช้เลือกจริงจาก bottom sheet ต่อเข้าไปตรงๆ แทน
    //
    // [แก้บั๊กรอบนี้ — เจอเควสประตูอารมณ์ (MoodGateScreen) ซ้ำบนจอเล็ก ทั้งที่เพิ่งเช็คอินสำเร็จ]
    // เดิม recordMoodEntry(...) ยิง mutate() แบบ fire-and-forget แล้ว closeModal ทันทีในบรรทัด
    // ถัดมาโดยไม่รอผล — ปิด modal เร็วกว่าที่ moodEntries cache จะอัปเดตจริงเสมอ (มี
    // mockDelay() ~220ms ใน mood.api.ts คั่นอยู่) ทำให้เรนเดอร์แรกหลังปิด modal
    // todaysMoodEntry (QuestSection.tsx) ยังเป็น null อยู่ → GameplayFrame.tsx โชว์
    // MoodGateScreen ซ้ำ แล้วค่อยเด้งเป็นเนื้อหาจริงเองทีหลังเมื่อ cache อัปเดตเสร็จ — ช่วงเวลา
    // นี้ปกติสั้นจนแทบไม่เห็นบนเดสก์ท็อป แต่ยืดยาวได้มาก (พิสูจน์แล้วว่ายืดได้หลายเท่า) เมื่อ
    // เบราว์เซอร์ throttle setTimeout ของแท็บ (เช่นตอนแท็บถูกมองว่า background) ซึ่งมือถือเจอ
    // สถานการณ์แบบนี้ได้ง่ายกว่าเดสก์ท็อปมาก — ตอนนี้ await ให้บันทึกเสร็จจริงก่อนค่อยปิด modal
    // เท่ากับตัด race condition นี้ทิ้งขาด ไม่ว่า delay จะสั้นหรือถูก throttle ยาวแค่ไหนก็ตาม
    await recordMoodEntry(mood, subMood, text)
    closeModal('moodCheckin')
  }, [submitMoodPotion, recordMoodEntry, closeModal])

  /* ── ตัวจุดชนวนตามรอบ: ถึงกำหนดตรวจประจำเดือนแล้วให้เด้งตอนเปิดแอป ──
     [หมายเหตุ react-hooks/set-state-in-effect] ที่นี่ "sync" กับนาฬิกาจริงของเครื่อง
     (เทียบ due date จากเซิร์ฟเวอร์กับ Date.now() ที่อ่านตอน effect รัน ไม่ใช่ตอน render)
     ไม่ใช่การ derive state จาก prop ที่เปลี่ยน — จึงไม่มีทางย้ายไปคำนวณตอน render ได้ตรงๆ
     โดยไม่ผิดกฎ react-hooks/purity (Date.now() ห้ามเรียกตอน render) ปล่อยไว้ใน effect ตามเดิม */
  useEffect(() => {
    if (!isLoggedIn || pendingScreening || !nextScreeningDueAt) return
    if (new Date(nextScreeningDueAt).getTime() > Date.now()) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingScreening({ triggerType: 'ROUTINE', reason: buildTriggerReason('ROUTINE', 0) })
  }, [isLoggedIn, nextScreeningDueAt, pendingScreening])

  const value = useMemo<MentalContextValue>(() => ({
    moodPotionLogs, consecutiveNegativeDays, screeningResults, nextScreeningDueAt,
    pendingScreening, activityLogs, learningCheckins, focusMinutesToday, screenCurfew,
    gratitudeStreak, gratitudeAuraUnlocked, postIts, questFeedbackLogs, earnedBadges,
    submitMoodPotion, requestScreening, submitScreening, dismissScreening,
    logActivity, saveLearningCheckin, addFocusMinutes, setScreenCurfew, handleMoodSubmit,
    submitQuestFeedback,
  }), [
    moodPotionLogs, consecutiveNegativeDays, screeningResults, nextScreeningDueAt,
    pendingScreening, activityLogs, learningCheckins, focusMinutesToday, screenCurfew,
    gratitudeStreak, gratitudeAuraUnlocked, postIts, questFeedbackLogs, earnedBadges,
    submitMoodPotion, requestScreening, submitScreening, dismissScreening,
    logActivity, saveLearningCheckin, addFocusMinutes, setScreenCurfew, handleMoodSubmit,
    submitQuestFeedback,
  ])

  return <MentalCtx.Provider value={value}>{children}</MentalCtx.Provider>
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function useMental(): MentalContextValue {
  const ctx = useContext(MentalCtx)
  if (!ctx) throw new Error('useMental ต้องถูกเรียกใช้ภายใน <MentalProvider> เท่านั้น')
  return ctx
}