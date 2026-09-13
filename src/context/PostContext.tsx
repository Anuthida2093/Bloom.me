import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostData, PostCommentData } from '../types'
import { queryKeys } from '../services/queryKeys'
import * as postApi from '../services/api/post.api'
import { useUser } from './UserContext'

/*============================================================================*\
  PostContext — [ไฟล์ใหม่] ฟีดโพสต์แบบ Threads (โพสต์/ไลค์/คอมเมนต์)
  ────────────────────────────────────────────────────────────────────────────
  แยกเป็น context ใหม่ต่างหาก (ไม่ยัดเข้า ProgressContext) เพราะเป็นคนละโดเมนกันชัดเจน —
  Progress คุมเควส/อารมณ์/บันทึกส่วนตัวของ "ตัวเอง", Post คุมโซเชียลฟีดที่มีคนอื่นเห็นด้วย —
  ตามหลักการเดียวกับที่ AppContext เดิมถูกแยกเป็น User/Progress/UI/Mental (ดู comment ใน
  AppContext.tsx) ต้องอยู่ใน <UserProvider> เพราะต้องรู้ userId/username ของผู้ใช้ปัจจุบัน
  ตอนสร้างโพสต์/คอมเมนต์ (เหมือน ProgressContext ที่ต้องอยู่ใน UserProvider เพื่อเรียก
  applyUserPatch)

  [แก้บั๊กจากรอบก่อนล่วงหน้า] completeQuestMutation เดิมไม่มี onMutate ทำให้ UI ไม่ sync
  ทันที (ดูคอมเมนต์ยาวใน ProgressContext.tsx) — รอบนี้ทุก mutation ของโพสต์มี onMutate
  ตั้งแต่แรกเลย โดยเฉพาะไลค์ที่ผู้ใช้คาดหวังว่าต้องกดแล้วติดทันที ไม่ใช่รอเน็ตตอบกลับ
\*============================================================================*/

interface PostContextValue {
  posts: PostData[]
  isLoadingPosts: boolean
  createPost: (input: { content: string; isAnonymous: boolean; imageUrl?: string | null }) => void
  toggleLike: (postId: string) => void
  toggleRepost: (postId: string) => void
  addComment: (postId: string, text: string) => void
  /** [ใหม่ — ข้อ 6] แก้เนื้อหา/สลับสถานะสาธารณะ-ไม่ระบุตัวตนของโพสต์ตัวเองได้ทุกเมื่อ */
  updatePost: (postId: string, patch: { content?: string; isAnonymous?: boolean }) => void
}

const PostCtx = createContext<PostContextValue | null>(null)

export function PostProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isLoggedIn, userData } = useUser()

  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: queryKeys.posts,
    queryFn: postApi.getFeedPosts,
    enabled: isLoggedIn,
    staleTime: 15_000,
  })

  const posts = useMemo(() => postsData ?? [], [postsData])

  const createPostMutation = useMutation({
    mutationFn: postApi.createPost,
    // ยิงโพสต์ขึ้นฟีดทันทีโดยไม่รอเซิร์ฟเวอร์ — ผู้ใช้ต้องเห็นโพสต์ของตัวเองปรากฏขึ้นทันที
    // ที่กดส่ง เหมือนแอปโซเชียลทั่วไป ไม่ใช่รอ mockDelay ก่อนถึงจะเห็น
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts })
      const previous = queryClient.getQueryData<PostData[]>(queryKeys.posts)
      const optimisticId = `optimistic-post-${Date.now()}`
      const optimisticPost: PostData = {
        id: optimisticId,
        userId: userData.id,
        authorName: userData.username,
        content: payload.content,
        imageUrl: payload.imageUrl ?? null,
        isAnonymous: payload.isAnonymous,
        likedBy: [],
        likeCount: 0,
        likedByMe: false,
        comments: [],
        repostedByMe: false,
        repostCount: 0,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) => [optimisticPost, ...(list ?? [])])
      return { previous, optimisticId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.posts, context.previous)
    },
    onSuccess: (post, _vars, context) => {
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) => {
        const current = list ?? []
        const idx = current.findIndex((p) => p.id === context?.optimisticId)
        if (idx === -1) return [post, ...current]
        const next = [...current]
        next[idx] = post
        return next
      })
    },
  })

  const toggleLikeMutation = useMutation({
    mutationFn: postApi.toggleLikePost,
    // ปุ่มไลค์ต้องติดทันทีที่กด — เดี๋ยวข้อ 1 ของรอบก่อนพิสูจน์ให้เห็นแล้วว่าถ้าไม่ทำแบบนี้
    // จะดูเหมือน "กดแล้วไม่มีอะไรเกิดขึ้น" จนกว่าจะมี re-render อื่นมากระตุ้นซ้ำ
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts })
      const previous = queryClient.getQueryData<PostData[]>(queryKeys.posts)
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => {
          if (p.id !== postId) return p
          const likedByMe = !p.likedByMe
          // [แก้รอบนี้] อัปเดต likedBy ให้ตรงกันทันทีด้วย ไม่งั้น popup "คนกดไลค์" (ข้อ 10)
          // จะเห็นรายชื่อเก่าค้างอยู่จนกว่าเซิร์ฟเวอร์ตอบกลับ
          const likedBy = likedByMe
            ? [...p.likedBy, { userId: userData.id, username: userData.username }]
            : p.likedBy.filter((l) => l.userId !== userData.id)
          return { ...p, likedByMe, likedBy, likeCount: likedBy.length }
        }),
      )
      return { previous }
    },
    onError: (_err, _postId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.posts, context.previous)
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => (p.id === updatedPost.id ? updatedPost : p)),
      )
    },
  })

  const toggleRepostMutation = useMutation({
    mutationFn: postApi.toggleRepost,
    // เหมือนไลค์เป๊ะ — ต้องติดทันทีที่กด ไม่งั้นดูเหมือนกดแล้วไม่มีอะไรเกิดขึ้น
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts })
      const previous = queryClient.getQueryData<PostData[]>(queryKeys.posts)
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => {
          if (p.id !== postId) return p
          const repostedByMe = !p.repostedByMe
          return { ...p, repostedByMe, repostCount: Math.max(0, p.repostCount + (repostedByMe ? 1 : -1)) }
        }),
      )
      return { previous }
    },
    onError: (_err, _postId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.posts, context.previous)
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => (p.id === updatedPost.id ? updatedPost : p)),
      )
    },
  })

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, patch }: { postId: string; patch: { content?: string; isAnonymous?: boolean } }) =>
      postApi.updatePost(postId, patch),
    // แก้แล้วต้องเห็นผลทันที (เนื้อหาใหม่/badge ไม่ระบุตัวตน) ไม่รอเน็ตตอบ เหมือน mutation อื่นๆ
    onMutate: async ({ postId, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts })
      const previous = queryClient.getQueryData<PostData[]>(queryKeys.posts)
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.posts, context.previous)
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => (p.id === updatedPost.id ? updatedPost : p)),
      )
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (input: { postId: string; text: string }) => postApi.addComment(input),
    onMutate: async ({ postId, text }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts })
      const previous = queryClient.getQueryData<PostData[]>(queryKeys.posts)
      const optimisticId = `optimistic-comment-${Date.now()}`
      const optimisticComment: PostCommentData = {
        id: optimisticId, userId: userData.id, authorName: userData.username,
        content: text, createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => (p.id === postId ? { ...p, comments: [...p.comments, optimisticComment] } : p)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.posts, context.previous)
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData<PostData[]>(queryKeys.posts, (list) =>
        (list ?? []).map((p) => (p.id === updatedPost.id ? updatedPost : p)),
      )
    },
  })

  const createPost = useCallback((input: { content: string; isAnonymous: boolean; imageUrl?: string | null }) => {
    createPostMutation.mutate({ content: input.content, isAnonymous: input.isAnonymous, imageUrl: input.imageUrl })
  }, [createPostMutation])

  const toggleLike = useCallback((postId: string) => {
    toggleLikeMutation.mutate(postId)
  }, [toggleLikeMutation])

  const toggleRepost = useCallback((postId: string) => {
    toggleRepostMutation.mutate(postId)
  }, [toggleRepostMutation])

  const addComment = useCallback((postId: string, text: string) => {
    if (!text.trim()) return
    addCommentMutation.mutate({ postId, text: text.trim() })
  }, [addCommentMutation])

  const updatePost = useCallback((postId: string, patch: { content?: string; isAnonymous?: boolean }) => {
    updatePostMutation.mutate({ postId, patch })
  }, [updatePostMutation])

  const value = useMemo<PostContextValue>(() => ({
    posts, isLoadingPosts: loadingPosts, createPost, toggleLike, toggleRepost, addComment, updatePost,
  }), [posts, loadingPosts, createPost, toggleLike, toggleRepost, addComment, updatePost])

  return <PostCtx.Provider value={value}>{children}</PostCtx.Provider>
}

// [หมายเหตุ react-refresh/only-export-components] ไฟล์ Context ต้อง export hook คู่กับ
// Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context กระทบแค่ Fast Refresh ตอน dev
// eslint-disable-next-line react-refresh/only-export-components
export function usePosts(): PostContextValue {
  const ctx = useContext(PostCtx)
  if (!ctx) throw new Error('usePosts ต้องถูกเรียกใช้ภายใน <PostProvider> เท่านั้น')
  return ctx
}
