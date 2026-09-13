import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_USER_DATA,
  DEFAULT_TREE_STATS,
  STACK_PER_VISUAL_LEVEL,
  type UserData,
  type TreeStats,
  type InventoryItem,
  type PlacedItem,
  type MbtiType,
} from '../types'
import { DECORATION_ITEM_META } from '../config/decorationItems'
import { queryKeys } from '../services/queryKeys'
import * as userApi from '../services/api/user.api'
import * as shopApi from '../services/api/shop.api'

/*============================================================================*\
  UserContext — [ไฟล์ใหม่ แยกออกจาก AppContext เดิม]
  ────────────────────────────────────────────────────────────────────────────
  รับผิดชอบเฉพาะ: ตัวผู้ใช้ ต้นไม้ คลังไอเทม และการล็อกอิน

  ทำไมต้องแยก: AppContext เดิมเป็นออบเจกต์เดียวที่ถือ state ~30 ตัว และสร้าง
  value object ใหม่ทุก render โดยไม่มี useMemo เลย ผลคือ "กดเปิดโมดัลตั้งค่า
  → modals เปลี่ยน → value เป็นออบเจกต์ใหม่ → Dashboard re-render → TreeOfLife
  re-render → ใบไม้ 84 <img> ถูก reconcile ใหม่ทั้งหมด" ทั้งที่ต้นไม้ไม่ได้เปลี่ยนอะไรเลย

  ตอนนี้แยกเป็น 3 context ตามอัตราการเปลี่ยนแปลงของข้อมูล:
    UserContext      เปลี่ยนน้อย   (โปรไฟล์ ต้นไม้ คลังไอเทม)
    ProgressContext  เปลี่ยนกลาง   (เควส อารมณ์ บันทึก)
    UIContext        เปลี่ยนบ่อย   (โมดัล ตั้งค่า แผงย่อ/ขยาย)
  → เปิดโมดัลกระทบแค่ UIContext ต้นไม้ไม่ขยับ

  [พร้อมต่อ API แล้ว] ข้อมูลทุกตัวมาจาก services/api ผ่าน TanStack Query
  โหมด mock/live สลับด้วย VITE_API_MODE ตัวเดียว ไม่ต้องแก้ไฟล์นี้
\*============================================================================*/

interface UserContextValue {
  userData: UserData
  treeStats: TreeStats
  inventoryData: InventoryItem[]
  placedItems: PlacedItem[]
  isLoggedIn: boolean
  isGuest: boolean
  isLoadingUser: boolean

  streakCelebrationDays: number | null
  setStreakCelebrationDays: (days: number | null) => void

  setMbtiType: (mbti: MbtiType) => void
  setLoggedIn: (loggedIn: boolean, guest: boolean) => void
  loginWithUsername: (username: string) => void
  registerUser: (data: { email: string; username: string; birthDate: string; height: number; weight: number }) => void

  handleBuy: (itemId: string, price: number) => void
  handleEquip: (itemId: string) => void
  handleClaimStreakReward: (itemId: string) => void

  /** ใช้โดย ProgressContext เมื่อทำเควสสำเร็จแล้วเหรียญ/EXP/stack เปลี่ยน */
  applyUserPatch: (next: UserData) => void

  /** [เพิ่มรอบนี้] บันทึกแก้ไขโปรไฟล์จากหน้าตั้งค่า (userApi.updateProfile มีอยู่แล้วแต่ไม่เคย
   *  ถูกเรียกใช้จริงที่ไหนเลย — SettingsModal เดิมส่ง onUpdateUser เป็นฟังก์ชันเปล่าตลอด) */
  updateProfile: (patch: Partial<UserData>) => void
}

const UserCtx = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [streakCelebrationDays, setStreakCelebrationDays] = useState<number | null>(null)

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: queryKeys.me,
    queryFn: userApi.getMe,
    enabled: isLoggedIn,
    staleTime: 30_000,
  })

  const { data: inventory } = useQuery({
    queryKey: queryKeys.inventory,
    queryFn: shopApi.getInventory,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })

  const userData = user ?? DEFAULT_USER_DATA
  const inventoryData = useMemo(() => inventory ?? [], [inventory])

  /** ระดับภาพของต้นไม้ derive สดจาก stack ทั้ง 3 หมวด — ไม่เก็บ state ซ้ำ */
  const treeStats: TreeStats = useMemo(() => ({
    ...DEFAULT_TREE_STATS,
    trunkBranchLevel: Math.max(1, Math.floor(userData.knowledgeStack / STACK_PER_VISUAL_LEVEL) + 1),
    leafFlowerLevel: Math.max(1, Math.floor(userData.emotionStack / STACK_PER_VISUAL_LEVEL) + 1),
    grassSoilLevel: Math.max(1, Math.floor(userData.healthStack / STACK_PER_VISUAL_LEVEL) + 1),
  }), [userData.knowledgeStack, userData.emotionStack, userData.healthStack])

  const placedItems: PlacedItem[] = useMemo(
    () => inventoryData
      .filter((i) => i.isEquipped)
      .map((i) => ({ itemId: i.shopItemId, zone: DECORATION_ITEM_META[i.shopItemId]?.zone ?? 'pot' })),
    [inventoryData],
  )

  const applyUserPatch = useCallback((next: UserData) => {
    queryClient.setQueryData(queryKeys.me, next)
  }, [queryClient])

  const setLoggedIn = useCallback((loggedIn: boolean, guest: boolean) => {
    setIsLoggedIn(loggedIn)
    setIsGuest(guest)
    if (!loggedIn) {
      userApi.logout()
      queryClient.clear()
    }
  }, [queryClient])

  const loginMutation = useMutation({
    mutationFn: (username: string) => userApi.login({ username, password: '' }),
    onSuccess: (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser)
      setIsLoggedIn(true)
      setIsGuest(false)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; username: string; birthDate: string; height: number; weight: number }) =>
      userApi.register({ ...data, password: '' }),
    onSuccess: (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser)
      setIsLoggedIn(true)
      setIsGuest(false)
    },
  })

  const mbtiMutation = useMutation({
    mutationFn: userApi.updateMbti,
    // อัปเดตหน้าจอทันทีไม่ต้องรอเซิร์ฟเวอร์ แล้วย้อนกลับถ้าล้มเหลว
    onMutate: async (mbti: MbtiType) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me })
      const previous = queryClient.getQueryData<UserData>(queryKeys.me)
      queryClient.setQueryData<UserData>(queryKeys.me, (u) => (u ? { ...u, mbtiType: mbti } : u))
      return { previous }
    },
    onError: (_err, _mbti, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.me, ctx.previous)
    },
    onSuccess: (nextUser) => queryClient.setQueryData(queryKeys.me, nextUser),
  })

  const buyMutation = useMutation({
    mutationFn: ({ itemId, price }: { itemId: string; price: number }) => shopApi.buyItem(itemId, price),
    onSuccess: ({ user: nextUser }) => {
      queryClient.setQueryData(queryKeys.me, nextUser)
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (nextUser) => queryClient.setQueryData(queryKeys.me, nextUser),
  })

  const equipMutation = useMutation({
    mutationFn: shopApi.toggleEquip,
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory })
      const previous = queryClient.getQueryData<InventoryItem[]>(queryKeys.inventory)
      queryClient.setQueryData<InventoryItem[]>(queryKeys.inventory, (inv) =>
        (inv ?? []).map((i) => (i.shopItemId === itemId ? { ...i, isEquipped: !i.isEquipped } : i)),
      )
      return { previous }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.inventory, ctx.previous)
    },
    onSuccess: (next) => queryClient.setQueryData(queryKeys.inventory, next),
  })

  const setMbtiType = useCallback((mbti: MbtiType) => { mbtiMutation.mutate(mbti) }, [mbtiMutation])
  const loginWithUsername = useCallback((username: string) => { loginMutation.mutate(username) }, [loginMutation])
  const registerUser = useCallback(
    (data: { email: string; username: string; birthDate: string; height: number; weight: number }) => {
      registerMutation.mutate(data)
    }, [registerMutation])

  const handleBuy = useCallback((itemId: string, price: number) => {
    if (inventoryData.some((i) => i.shopItemId === itemId)) return
    if (userData.coins < price) return
    buyMutation.mutate({ itemId, price })
  }, [buyMutation, inventoryData, userData.coins])

  const handleEquip = useCallback((itemId: string) => { equipMutation.mutate(itemId) }, [equipMutation])

  const handleClaimStreakReward = useCallback((itemId: string) => {
    if (inventoryData.some((i) => i.shopItemId === itemId)) return
    buyMutation.mutate({ itemId, price: 0 })
  }, [buyMutation, inventoryData])

  const updateProfile = useCallback((patch: Partial<UserData>) => {
    updateProfileMutation.mutate(patch)
  }, [updateProfileMutation])

  const value = useMemo<UserContextValue>(() => ({
    userData, treeStats, inventoryData, placedItems,
    isLoggedIn, isGuest, isLoadingUser,
    streakCelebrationDays, setStreakCelebrationDays,
    setMbtiType, setLoggedIn, loginWithUsername, registerUser,
    handleBuy, handleEquip, handleClaimStreakReward, applyUserPatch, updateProfile,
  }), [
    userData, treeStats, inventoryData, placedItems,
    isLoggedIn, isGuest, isLoadingUser, streakCelebrationDays,
    setMbtiType, setLoggedIn, loginWithUsername, registerUser,
    handleBuy, handleEquip, handleClaimStreakReward, applyUserPatch, updateProfile,
  ])

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserCtx)
  if (!ctx) throw new Error('useUser ต้องถูกเรียกใช้ภายใน <UserProvider> เท่านั้น')
  return ctx
}