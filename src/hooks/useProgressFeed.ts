import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getRecentProgressEvents, type ProgressEvent } from '../services/api/activity.api'
import { queryKeys } from '../services/queryKeys'

/** รอบ poll ปกติ — ไม่ poll ตอนแท็บถูกซ่อน แต่ดึงทันทีเมื่อกลับมาที่แท็บ/เน็ตกลับมา (ใกล้เคียงเรียลไทม์) */
export const PROGRESS_FEED_POLL_MS = 15_000
/** คิวยาวสุด — เพื่อนเยอะมากๆ ไม่ต้องไล่โชว์ข่าวเก่าค้างเป็นนาที */
const MAX_QUEUE = 10

/**
 * poll GET /api/activity/recent แล้วคืน toast ที่ควรแสดง "ทีละอัน" (current) — จบแล้วเรียก dismiss
 * ตัวถัดไปในคิวจะเด้งขึ้นมาต่อ (ข่าวเพื่อนเป็น toast ชั่วคราวเท่านั้น ไม่เก็บลงแผงแจ้งเตือน 🔔)
 * เก็บ createdAt ล่าสุดเป็น cursor (since) — รอบแรกไม่ส่ง since ให้ backend ย้อนดูแค่ไม่กี่นาที
 * ITEM_UNLOCKED ที่มอบให้เรา → รีเฟรชกระเป๋า/ข้อมูลผู้ใช้ทันที (ร้านค้า/ของตกแต่งเห็นของใหม่เลย)
 */
export function useProgressFeed(enabled: boolean, myUserId: string | null) {
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState<ProgressEvent[]>([])
  const sinceRef = useRef<string | null>(null)
  const seenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let inFlight = false

    const poll = async () => {
      if (inFlight || document.visibilityState === 'hidden') return
      inFlight = true
      try {
        const events = await getRecentProgressEvents(sinceRef.current)
        if (cancelled || events.length === 0) return
        sinceRef.current = events[0].createdAt // ใหม่สุดอยู่ตัวแรก
        // ITEM_UNLOCKED ของคนอื่น (ไม่ได้มอบให้เรา) ไม่แจ้ง
        const relevant = events.filter((e) => e.type !== 'ITEM_UNLOCKED' || !e.payload.recipientId || e.payload.recipientId === myUserId)
        const fresh = relevant.filter((e) => !seenRef.current.has(e.id)).reverse() // แสดงเก่า→ใหม่
        if (fresh.length === 0) return
        fresh.forEach((e) => seenRef.current.add(e.id))
        setQueue((q) => [...q, ...fresh].slice(-MAX_QUEUE))
        if (fresh.some((e) => e.type === 'ITEM_UNLOCKED')) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.inventory })
          void queryClient.invalidateQueries({ queryKey: queryKeys.me })
        }
      } catch {
        /* เน็ตหลุด/เซิร์ฟเวอร์ล่ม — ข้ามรอบนี้ ไม่รบกวนผู้ใช้ */
      } finally {
        inFlight = false
      }
    }

    const pollNow = () => { void poll() }
    const onVisible = () => { if (document.visibilityState === 'visible') pollNow() }

    pollNow()
    const id = window.setInterval(pollNow, PROGRESS_FEED_POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', pollNow)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', pollNow)
    }
  }, [enabled, myUserId, queryClient])

  const dismiss = useCallback((id: string) => setQueue((q) => q.filter((e) => e.id !== id)), [])

  return { current: queue[0] ?? null, dismiss }
}
