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
  type Gender,
} from '../types'
import { DECORATION_ITEM_META } from '../config/decorationItems'
import { queryKeys } from '../services/queryKeys'
import * as userApi from '../services/api/user.api'
import * as shopApi from '../services/api/shop.api'
import { getAuthToken } from '../services/http'

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
  /** คืน Promise เพื่อให้หน้า Login จับ error ได้เอง (เช่น รหัสผ่านผิด) แล้วโชว์ข้อความใต้ฟอร์ม */
  loginWithUsername: (username: string, password: string) => Promise<void>
  /** คืน Promise เพื่อให้หน้า Register จับ error ได้เอง (เช่น อีเมลซ้ำ) แล้วโชว์ข้อความใต้ฟอร์ม */
  registerUser: (data: { email: string; username: string; password: string; birthDate: string; gender: Gender; height: number; weight: number }) => Promise<void>
  /** [เพิ่มรอบนี้ — ข้อ 4] เปลี่ยนรหัสผ่านจากหน้าตั้งค่า ต้องกรอกรหัสเดิมให้ถูกก่อน */
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>
  /** [เพิ่มรอบนี้ — ข้อ 3] ลบบัญชีถาวร — ล้าง mockDb ทั้งก้อนแล้วเคลียร์ session ทันที */
  deleteAccount: () => Promise<void>
  /** [เพิ่มรอบนี้ — ข้อ 2] ขอลิงก์กู้รหัสผ่าน — ดูคำเตือนเรื่อง devToken ใน user.api.ts */
  requestPasswordReset: (email: string) => Promise<userApi.RequestPasswordResetResult>
  /** [เพิ่มรอบนี้ — ข้อ 2] ตั้งรหัสผ่านใหม่จาก token ในลิงก์กู้รหัสผ่าน */
  resetPassword: (data: { token: string; newPassword: string }) => Promise<void>

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

  // [แก้บั๊ก — พบระหว่างพิสูจน์ผลข้อ 2 รอบก่อน] เดิม isLoggedIn เริ่มที่ false เสมอ ไม่มีจุดไหน
  // เช็ค token ที่ persist ไว้ใน localStorage เลย — รีเฟรชหน้าทีไร (แม้ล็อกอินค้างจริงอยู่)
  // isLoggedIn จะรีเซ็ตเป็น false ทันที ทำให้ query questLogs/me/inventory (enabled: isLoggedIn)
  // ไม่ยิงเลย หน้าเควสทุกด่านที่ต้องเช็ค isCompleted() จึงเห็นเป็น "ล็อกหมด" ทั้งที่ทำสำเร็จ
  // มาก่อนแล้วจริงๆ — อ่าน token ตรงๆ ตอน mount ด้วย lazy initializer (ไม่ใช้ useEffect+setState
  // เพราะเป็นการเช็คค่าเดียวจบ ไม่ต้อง subscribe อะไร ตรงตามที่ react-hooks/set-state-in-effect ต้องการ)
  const [isLoggedIn, setIsLoggedIn] = useState(() => getAuthToken() !== null)
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
    mutationFn: (vars: { username: string; password: string }) => userApi.login(vars),
    onSuccess: (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser)
      setIsLoggedIn(true)
      setIsGuest(false)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string; birthDate: string; gender: Gender; height: number; weight: number }) =>
      userApi.register(data),
    onSuccess: (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser)
      setIsLoggedIn(true)
      setIsGuest(false)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: userApi.changePassword,
  })

  const deleteAccountMutation = useMutation({
    mutationFn: userApi.deleteAccount,
    onSuccess: () => {
      setIsLoggedIn(false)
      setIsGuest(false)
      queryClient.clear()
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
  const loginWithUsername = useCallback(
    (username: string, password: string) => loginMutation.mutateAsync({ username, password }).then(() => {}),
    [loginMutation])
  const registerUser = useCallback(
    (data: { email: string; username: string; password: string; birthDate: string; gender: Gender; height: number; weight: number }) =>
      registerMutation.mutateAsync(data).then(() => {}),
    [registerMutation])
  const changePassword = useCallback(
    (data: { currentPassword: string; newPassword: string }) => changePasswordMutation.mutateAsync(data),
    [changePasswordMutation])
  const deleteAccount = useCallback(() => deleteAccountMutation.mutateAsync(), [deleteAccountMutation])
  // [เพิ่มรอบนี้ — ข้อ 2] ไม่ต้องผ่าน useMutation เพราะไม่มี user session ให้อัปเดต cache
  // (หน้า ForgotPassword/ResetPassword ทำงานได้ทั้งตอนล็อกอินอยู่หรือไม่อยู่ก็ได้)
  const requestPasswordReset = useCallback((email: string) => userApi.requestPasswordReset(email), [])
  const resetPassword = useCallback(
    (data: { token: string; newPassword: string }) => userApi.resetPassword(data),
    [])

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
    setMbtiType, setLoggedIn, loginWithUsername, registerUser, changePassword, deleteAccount,
    requestPasswordReset, resetPassword,
    handleBuy, handleEquip, handleClaimStreakReward, applyUserPatch, updateProfile,
  }), [
    userData, treeStats, inventoryData, placedItems,
    isLoggedIn, isGuest, isLoadingUser, streakCelebrationDays,
    setMbtiType, setLoggedIn, loginWithUsername, registerUser, changePassword, deleteAccount,
    requestPasswordReset, resetPassword,
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