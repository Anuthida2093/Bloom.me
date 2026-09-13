import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_JOURNAL_ENTRIES,
  type QuestLogEntry,
  type MoodEntryData,
  type JournalEntryRecord,
  type PostItData,
  type QuestCategory,
} from '../types'
import { findQuestByCode } from '../config/questCatalog'
import { queryKeys } from '../services/queryKeys'
import * as questApi from '../services/api/quest.api'
import * as moodApi from '../services/api/mood.api'
import { useUser } from './UserContext'

/*============================================================================*\
  ProgressContext — [ไฟล์ใหม่ แยกออกจาก AppContext เดิม]
  ────────────────────────────────────────────────────────────────────────────
  รับผิดชอบ: เควส อารมณ์ บันทึก และ "สัญญาณภาพ" ที่ต้นไม้ต้องตอบสนอง

  ต้องอยู่ข้างใน <UserProvider> เพราะการทำเควสสำเร็จกระทบเหรียญ/EXP/stack
  ของผู้ใช้ด้วย — เรียก applyUserPatch() ส่งผลลัพธ์จากเซิร์ฟเวอร์กลับเข้า cache
  ของ UserContext ในคำขอเดียว ไม่ต้องยิงซ้ำอีกรอบ

  [คงพฤติกรรมเดิมไว้ครบ] treeGrowthPulse และ hasSoot ยังทำงานเหมือนเดิมทุกอย่าง
  ส่วนนี้โค้ดเดิมออกแบบไว้ดีอยู่แล้ว (key เปลี่ยนทุกครั้งเพื่อให้เล่นเอฟเฟกต์ซ้ำได้)
  จึงยกมาทั้งดุ้นโดยไม่แก้ตรรกะ
\*============================================================================*/

interface ProgressContextValue {
  questLogs: QuestLogEntry[]
  moodEntries: MoodEntryData[]
  journalEntries: JournalEntryRecord[]
  postIts: PostItData[]
  completedQuestCount: number
  treeGrowthPulse: { category: QuestCategory; key: number } | null
  hasSoot: boolean
  isLoadingProgress: boolean

  handleToggleQuest: (questCode: string, payload?: Record<string, unknown>) => void
  markIncineratorFailed: () => void
  handleMoodSubmit: (mood: 'good' | 'neutral' | 'bad', text: string) => void
  handleAddJournalEntry: (entry: { questCode: string; originalText: string; aiReframedText: string }) => void
}

const ProgressCtx = createContext<ProgressContextValue | null>(null)

const MOOD_CATEGORY = { good: 'POSITIVE', neutral: 'NEUTRAL', bad: 'NEGATIVE' } as const
const MOOD_TYPE = { good: 'HAPPY', neutral: 'CALM', bad: 'SAD' } as const

export function ProgressProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isLoggedIn, applyUserPatch } = useUser()

  const [journalEntries, setJournalEntries] = useState<JournalEntryRecord[]>(DEFAULT_JOURNAL_ENTRIES)
  const [postIts] = useState<PostItData[]>([])
  const [treeGrowthPulse, setTreeGrowthPulse] = useState<{ category: QuestCategory; key: number } | null>(null)
  const [hasSoot, setHasSoot] = useState(false)

  const { data: questLogsData, isLoading: loadingQuests } = useQuery({
    queryKey: queryKeys.questLogs(),
    queryFn: questApi.getQuestLogs,
    enabled: isLoggedIn,
    staleTime: 15_000,
  })

  const { data: moodData, isLoading: loadingMood } = useQuery({
    queryKey: queryKeys.moodEntries(),
    queryFn: moodApi.getMoodEntries,
    enabled: isLoggedIn,
    staleTime: 30_000,
  })

  const questLogs = useMemo(() => questLogsData ?? [], [questLogsData])
  const moodEntries = useMemo(() => moodData ?? [], [moodData])

  const completeQuestMutation = useMutation({
    mutationFn: questApi.completeQuest,
    // [แก้บั๊ก — นกฮูก/ด่านล็อกไม่ sync ทันที] เดิมไฟล์นี้ไม่มี onMutate เลย — questLogs
    // (ซึ่ง isCompleted/isLocked ของ LearningQuestMap คำนวณจากมันตรงๆ) จึงรอผลจริงจาก
    // เซิร์ฟเวอร์เท่านั้น (โหมด mock ก็ยังมี await mockDelay() ~220ms) ก่อนจะอัปเดต ต่างจาก
    // treeGrowthPulse ด้านล่างที่ "ยิงทันทีโดยไม่รอเซิร์ฟเวอร์" ตามคอมเมนต์เดิมของไฟล์นี้เอง —
    // ผลคือปิดหน้าเล่นเควสแล้วกลับมาเห็นแผนที่ในเฟรมที่ questLogs ยังเป็นค่าเก่าอยู่ ต้องรอ
    // re-render อื่นมากระตุ้นซ้ำ (สลับแท็บ/เปิดปิดใหม่) ถึงจะเห็นนกฮูกเดิน/ด่านถัดไปปลดล็อก
    // เติม onMutate ให้เขียน log ชั่วคราวลง cache "ทันที" (แพทเทิร์นเดียวกับ mbtiMutation/
    // equipMutation ใน UserContext.tsx) แล้วแทนที่ด้วยของจริงจากเซิร์ฟเวอร์ใน onSuccess —
    // isCompleted/isLocked จึงเห็นสถานะใหม่ใน re-render เดียวกับที่ setPlayingQuest(null) ทำงาน
    //
    // [แก้รอบนี้ — พิสูจน์แล้วว่ายังไม่นิ่งจริง ดู learningQuestMapSync.test.tsx] เดิม onMutate
    // เป็น async แล้ว `await queryClient.cancelQueries(...)` ก่อนเขียน cache — แม้ cancelQueries
    // จะ resolve เร็วมาก (ไม่มี query กำลัง fetch อยู่จริง) แต่ทุก `await` ก็ยังบังคับให้โค้ด
    // หลังจากนั้นไปรันใน microtask ถัดไปเสมอ (ตามสเปก ES2020+) ผลคือ setQueryData เกิดขึ้นคนละ
    // รีเรนเดอร์กับ setPlayingQuest(null) ที่ handleCompletePlaying เรียกพร้อมกันแบบ synchronous
    // — เทสต์ยืนยันว่าด่านถัดไป "ยังล็อกอยู่ทันทีที่กด" แล้วค่อยปลดล็อกเองอีก ~25ms ถัดมา (ไม่ใช่
    // ในเรนเดอร์เดียวกันจริงๆ) ตอนนี้เอา async/await ออกจาก onMutate ทั้งหมด — setQueryData ด้านล่าง
    // จึงรันแบบ synchronous เป็นส่วนหนึ่งของ call stack เดียวกับ mutate()/setPlayingQuest(null)
    // ทำให้ React แบตช์เป็นรีเรนเดอร์เดียวจริงๆ ส่วน cancelQueries ยังเรียกอยู่ (กันคำขอ fetch
    // ที่ค้างอยู่มาทับข้อมูล optimistic ทีหลัง) แต่ไม่ await ผลลัพธ์ของมันอีกต่อไป
    onMutate: ({ questCode }) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.questLogs() })
      const previousLogs = queryClient.getQueryData<QuestLogEntry[]>(queryKeys.questLogs())
      const def = findQuestByCode(questCode)
      const category: QuestCategory = def?.category ?? 'KNOWLEDGE'
      const now = new Date().toISOString()
      const optimisticId = `optimistic-${questCode}-${Date.now()}`
      const optimisticLog: QuestLogEntry = {
        id: optimisticId,
        status: 'COMPLETED',
        userId: '',
        questId: questCode,
        quest: { id: questCode, code: questCode, category },
        logDate: now.split('T')[0],
        completedAt: now,
      }
      queryClient.setQueryData<QuestLogEntry[]>(queryKeys.questLogs(), (logs) => {
        const list = logs ?? []
        // เควสเล่นซ้ำได้ต่อวัน (maxPerDay) ต้องเพิ่ม log ใหม่เสมอ เควสทั่วไปแทนที่ log เดิม
        if (def?.maxPerDay) return [...list, optimisticLog]
        const idx = list.findIndex((l) => l.quest?.code === questCode)
        if (idx === -1) return [...list, optimisticLog]
        const next = [...list]
        next[idx] = { ...next[idx], status: 'COMPLETED', completedAt: now }
        return next
      })
      return { previousLogs, optimisticId }
    },
    onError: (_err, _vars, context) => {
      // คำขอล้มเหลว — ย้อน questLogs กลับไปก่อนหน้า optimistic update (เหมือน mbtiMutation)
      if (context?.previousLogs) queryClient.setQueryData(queryKeys.questLogs(), context.previousLogs)
    },
    onSuccess: ({ user, log }, _vars, context) => {
      applyUserPatch(user)
      queryClient.setQueryData<QuestLogEntry[]>(queryKeys.questLogs(), (logs) => {
        const list = logs ?? []
        // แทนที่ log ชั่วคราวจาก onMutate ด้วยของจริงจากเซิร์ฟเวอร์ (มี id จริงแล้ว)
        const optimisticIdx = context?.optimisticId ? list.findIndex((l) => l.id === context.optimisticId) : -1
        if (optimisticIdx !== -1) {
          const next = [...list]
          next[optimisticIdx] = log
          return next
        }
        // [แก้รอบนี้ — เควสเล่นซ้ำได้ต่อวัน] จับคู่ด้วย id ไม่ใช่ quest code อีกต่อไป — เควสที่มี
        // maxPerDay (เช่น phys-pure-water) สร้าง log ใหม่ "ทุกครั้ง" ที่ทำสำเร็จ (คนละ id) จับคู่
        // ด้วย code แบบเดิมจะทำให้ log ใหม่ไปทับ log เก่าของวันนั้นแทนที่จะเพิ่มเป็นรายการใหม่
        const idx = list.findIndex((l) => l.id === log.id)
        if (idx === -1) return [...list, log]
        const next = [...list]
        next[idx] = log
        return next
      })
    },
  })

  const createMoodMutation = useMutation({
    mutationFn: moodApi.createMoodEntry,
    onSuccess: (entry) => {
      queryClient.setQueryData<MoodEntryData[]>(queryKeys.moodEntries(), (list) => [...(list ?? []), entry])
    },
  })

  const handleToggleQuest = useCallback((questCode: string, payload?: Record<string, unknown>) => {
    const def = findQuestByCode(questCode)
    const category: QuestCategory = def?.category ?? 'KNOWLEDGE'
    const alreadyDone = questLogs.some((l) => l.quest?.code === questCode && l.status === 'COMPLETED')

    completeQuestMutation.mutate({ questCode, payload })

    // "แรงสั่นสะเทือนแห่งการเติบโต" ยิงทันทีโดยไม่รอเซิร์ฟเวอร์ — ผู้ใช้ต้องเห็นต้นไม้
    // ตอบสนองในเสี้ยววินาทีที่กด ไม่ใช่หลังเน็ตตอบกลับ (ถ้าคำขอล้มเหลว ตัวเลขจะถูก
    // ย้อนกลับเองจาก cache แต่เอฟเฟกต์ที่เล่นไปแล้วไม่ทำอันตรายอะไร)
    // [แก้รอบนี้ — เควสเล่นซ้ำได้ต่อวัน] เควสที่มี maxPerDay (เช่น phys-pure-water) ต้องได้
    // เอฟเฟกต์ต้นไม้เติบโตทุกครั้งที่เล่นสำเร็จ ไม่ใช่แค่ครั้งแรก — alreadyDone เดิมเช็คแค่
    // "เคยสำเร็จมาก่อนไหม" ซึ่งใช้ไม่ได้กับเควสที่ตั้งใจให้ทำซ้ำได้
    if (!alreadyDone || def?.maxPerDay) {
      setTreeGrowthPulse({ category, key: Date.now() })
      if (questCode === 'ment-cognitive-incinerator') setHasSoot(false)
    }
  }, [completeQuestMutation, questLogs])

  const markIncineratorFailed = useCallback(() => setHasSoot(true), [])

  const handleMoodSubmit = useCallback((mood: 'good' | 'neutral' | 'bad', text: string) => {
    createMoodMutation.mutate({
      category: MOOD_CATEGORY[mood] ?? 'NEUTRAL',
      mood: MOOD_TYPE[mood] ?? 'CALM',
      note: text || null,
    })
  }, [createMoodMutation])

  const handleAddJournalEntry = useCallback(
    (entry: { questCode: string; originalText: string; aiReframedText: string }) => {
      const firstLine = entry.originalText.trim().split('\n')[0] ?? ''
      const title = firstLine.length > 40 ? `${firstLine.slice(0, 40)}...` : firstLine || 'บันทึกไม่มีชื่อ'
      setJournalEntries((entries) => [
        ...entries,
        { id: `journal-${Date.now()}`, title, ...entry, createdAt: new Date().toISOString() },
      ])
      // [ยังไม่มีที่เก็บฝั่ง backend] ตาราง journal_entries ยังไม่มีใน schema
      // จนกว่าจะสร้าง (ดู docs/DB_CHANGES.md ข้อ 6.2) บันทึกจะหายเมื่อรีเฟรช
    }, [])

  const completedQuestCount = useMemo(
    () => questLogs.filter((l) => l.status === 'COMPLETED').length,
    [questLogs],
  )

  const value = useMemo<ProgressContextValue>(() => ({
    questLogs, moodEntries, journalEntries, postIts,
    completedQuestCount, treeGrowthPulse, hasSoot,
    isLoadingProgress: loadingQuests || loadingMood,
    handleToggleQuest, markIncineratorFailed, handleMoodSubmit, handleAddJournalEntry,
  }), [
    questLogs, moodEntries, journalEntries, postIts,
    completedQuestCount, treeGrowthPulse, hasSoot, loadingQuests, loadingMood,
    handleToggleQuest, markIncineratorFailed, handleMoodSubmit, handleAddJournalEntry,
  ])

  return <ProgressCtx.Provider value={value}>{children}</ProgressCtx.Provider>
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressCtx)
  if (!ctx) throw new Error('useProgress ต้องถูกเรียกใช้ภายใน <ProgressProvider> เท่านั้น')
  return ctx
}