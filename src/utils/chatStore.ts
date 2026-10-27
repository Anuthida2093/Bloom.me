import { useSyncExternalStore } from 'react'

/*============================================================================*\
  chatStore.ts — [ใหม่ตามที่ระบุ] แชทกับเพื่อนในหน้าสตอรี่ (รวมถึงโพสต์ที่ "แชร์ให้เพื่อน")
  ────────────────────────────────────────────────────────────────────────────
  เก็บในเครื่อง (localStorage แยกตามบัญชี) — backend ยังไม่มีตาราง/endpoint แชท
  วันที่มี API แชทจริง แทนที่ฟังก์ชันในไฟล์นี้ได้เลย หน้าจอเรียกผ่าน useChatThreads/sendChatMessage เท่านั้น
\*============================================================================*/

export interface ChatMessage {
  id: string
  /** 'me' = เราส่ง · อื่นๆ = userId ของเพื่อน */
  from: string
  text?: string
  /** แชร์โพสต์ให้เพื่อน */
  postId?: string
  createdAt: string
}

export interface ChatThread {
  friendId: string
  friendName: string
  messages: ChatMessage[]
}

type ChatState = Record<string, ChatThread>

const listeners = new Set<() => void>()
let currentUser = ''
let cache: ChatState = {}

const keyOf = (uid: string) => `bloom.chat.${uid || 'guest'}`

function load(uid: string): ChatState {
  try { return JSON.parse(localStorage.getItem(keyOf(uid)) ?? '{}') as ChatState } catch { return {} }
}

function ensureUser(uid: string) {
  if (uid !== currentUser) { currentUser = uid; cache = load(uid) }
}

function save() {
  try { localStorage.setItem(keyOf(currentUser), JSON.stringify(cache)) } catch { /* storage เต็ม/ปิดอยู่ — ยังใช้ได้ในรอบนี้ */ }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** แชททั้งหมดของบัญชีนี้ */
export function useChatThreads(userId: string): ChatState {
  ensureUser(userId)
  return useSyncExternalStore(subscribe, () => { ensureUser(userId); return cache })
}

export function sendChatMessage(userId: string, friendId: string, friendName: string, msg: { text?: string; postId?: string }): void {
  ensureUser(userId)
  const thread = cache[friendId] ?? { friendId, friendName, messages: [] }
  const message: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from: 'me',
    ...msg,
    createdAt: new Date().toISOString(),
  }
  cache = { ...cache, [friendId]: { ...thread, friendName, messages: [...thread.messages, message] } }
  save()
}

export function lastMessageAt(thread: ChatThread): string {
  return thread.messages[thread.messages.length - 1]?.createdAt ?? ''
}
