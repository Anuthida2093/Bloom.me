import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityItem } from '../types'
import { usePersistentState } from '../hooks/usePersistentState'
import { queryKeys } from '../services/queryKeys'
import * as socialApi from '../services/api/social.api'
import type { SearchUserResult } from '../services/api/social.api'
import { useUser } from './UserContext'

/*============================================================================*\
  SocialContext — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] ติดตาม/กิจกรรม/ค้นหา
  ────────────────────────────────────────────────────────────────────────────
  แยกจาก PostContext เพราะคนละโดเมนกัน (Post = เนื้อหาที่โพสต์, Social = ความสัมพันธ์
  ระหว่างผู้ใช้) ตามหลักการเดียวกับที่ PostContext แยกออกจาก ProgressContext มาก่อน

  "ล่าสุด" (recent search) เป็น client state ล้วนๆ ไม่มี endpoint รองรับ (เหมือน
  settings/decorationPositions ใน UIContext) ใช้ usePersistentState เก็บลง localStorage
\*============================================================================*/

const RECENT_SEARCH_LIMIT = 8

interface SocialContextValue {
  following: string[]
  isFollowing: (userId: string) => boolean
  toggleFollow: (userId: string) => void

  activity: ActivityItem[]
  isLoadingActivity: boolean

  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: SearchUserResult[]
  isSearching: boolean

  recentSearches: SearchUserResult[]
  addRecentSearch: (result: SearchUserResult) => void
  removeRecentSearch: (id: string) => void
  clearRecentSearches: () => void

  /** [ใหม่ — ข้อ 9/10/11] เป้าหมายโปรไฟล์ที่กำลังจะเปิดดู (จาก list เพื่อน/คนกดไลค์/คอมเมนต์)
   *  ตัวเดียวใช้ทั้งเปิดโปรไฟล์ตัวเอง (userId === ของเรา) และคนอื่น — เก็บไว้ที่นี่แทนที่จะ
   *  ส่ง prop ลอดผ่านหลายชั้น (PostCard/CommentsModal/LikersModal/FriendsListPanel) เพราะ
   *  ทุกจุดเรียก useSocial() ตรงอยู่แล้วตามแพทเทิร์นเดิมของฟีเจอร์นี้ */
  viewProfileTarget: { userId: string; username: string } | null
  clearViewProfileTarget: () => void
  /** เช็ค privacy ก่อนเปิดเสมอ — ถ้าปิดโปรไฟล์ไว้ ไม่เซ็ต viewProfileTarget แต่โชว์ toast แทน */
  requestViewProfile: (userId: string, username: string) => void
  showPrivacyToast: boolean
  dismissPrivacyToast: () => void

  /** [ใหม่ — ข้อ 13] แชร์โพสต์ให้เพื่อนในแอป (ไม่ใช่ native share sheet) */
  sharePostToFriend: (postId: string, friendUserId: string) => void
}

const SocialCtx = createContext<SocialContextValue | null>(null)

export function SocialProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isLoggedIn, userData } = useUser()

  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = usePersistentState<SearchUserResult[]>('story-recent-searches', [])
  const [viewProfileTarget, setViewProfileTarget] = useState<{ userId: string; username: string } | null>(null)
  const [showPrivacyToast, setShowPrivacyToast] = useState(false)

  const { data: followingData } = useQuery({
    queryKey: queryKeys.following,
    queryFn: socialApi.getFollowing,
    enabled: isLoggedIn,
    staleTime: 15_000,
  })
  const following = useMemo(() => followingData ?? [], [followingData])

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: queryKeys.activity,
    queryFn: socialApi.getActivityFeed,
    enabled: isLoggedIn,
    staleTime: 30_000,
  })
  const activity = useMemo(() => activityData ?? [], [activityData])

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: queryKeys.socialSearch(searchQuery),
    queryFn: () => socialApi.searchUsers(searchQuery),
    enabled: isLoggedIn && searchQuery.trim().length > 0,
    staleTime: 10_000,
  })
  const searchResults = useMemo(() => searchData ?? [], [searchData])

  const toggleFollowMutation = useMutation({
    mutationFn: socialApi.toggleFollow,
    // ปุ่ม "+" บน avatar / "ติดตามกลับ" ต้องหายทันทีที่กด ไม่รอเน็ตตอบ — เหมือนไลค์โพสต์
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.following })
      const previous = queryClient.getQueryData<string[]>(queryKeys.following)
      queryClient.setQueryData<string[]>(queryKeys.following, (list) => {
        const current = list ?? []
        return current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
      })
      return { previous }
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.following, context.previous)
    },
    onSuccess: (nextFollowing) => {
      queryClient.setQueryData(queryKeys.following, nextFollowing)
    },
  })

  const isFollowing = useCallback((userId: string) => following.includes(userId), [following])
  const toggleFollow = useCallback((userId: string) => { toggleFollowMutation.mutate(userId) }, [toggleFollowMutation])

  const clearViewProfileTarget = useCallback(() => { setViewProfileTarget(null) }, [])
  const dismissPrivacyToast = useCallback(() => { setShowPrivacyToast(false) }, [])

  /** [ข้อ 11] ดูโปรไฟล์ตัวเองได้เสมอ (ไม่เช็ค privacy) — ของคนอื่นต้องเช็คก่อนทุกครั้ง
   *  ถ้าปิดโปรไฟล์ไว้ ไม่เปิดหน้าโปรไฟล์เลย โชว์แค่ toast แทน */
  const requestViewProfile = useCallback((userId: string, username: string) => {
    if (userId === userData.id) { setViewProfileTarget({ userId, username }); return }
    void socialApi.checkProfileAccess(userId).then(({ blocked }) => {
      if (blocked) setShowPrivacyToast(true)
      else setViewProfileTarget({ userId, username })
    })
  }, [userData.id])

  const sharePostToFriendMutation = useMutation({
    mutationFn: ({ postId, friendUserId }: { postId: string; friendUserId: string }) =>
      socialApi.sharePostToFriend(postId, friendUserId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.activity }) },
  })
  const sharePostToFriend = useCallback((postId: string, friendUserId: string) => {
    sharePostToFriendMutation.mutate({ postId, friendUserId })
  }, [sharePostToFriendMutation])

  const addRecentSearch = useCallback((result: SearchUserResult) => {
    setRecentSearches((prev) => {
      const withoutDup = prev.filter((r) => r.id !== result.id)
      return [result, ...withoutDup].slice(0, RECENT_SEARCH_LIMIT)
    })
  }, [setRecentSearches])

  const removeRecentSearch = useCallback((id: string) => {
    setRecentSearches((prev) => prev.filter((r) => r.id !== id))
  }, [setRecentSearches])

  const clearRecentSearches = useCallback(() => { setRecentSearches([]) }, [setRecentSearches])

  const value = useMemo<SocialContextValue>(() => ({
    following, isFollowing, toggleFollow,
    activity, isLoadingActivity,
    searchQuery, setSearchQuery, searchResults, isSearching,
    recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches,
    viewProfileTarget, clearViewProfileTarget, requestViewProfile, showPrivacyToast, dismissPrivacyToast,
    sharePostToFriend,
  }), [
    following, isFollowing, toggleFollow,
    activity, isLoadingActivity,
    searchQuery, searchResults, isSearching,
    recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches,
    viewProfileTarget, clearViewProfileTarget, requestViewProfile, showPrivacyToast, dismissPrivacyToast,
    sharePostToFriend,
  ])

  return <SocialCtx.Provider value={value}>{children}</SocialCtx.Provider>
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialCtx)
  if (!ctx) throw new Error('useSocial ต้องถูกเรียกใช้ภายใน <SocialProvider> เท่านั้น')
  return ctx
}
