import { useEffect, useState, type RefObject } from 'react'
import { createProgressTracker } from '../utils/progressTracker'

/*============================================================================*\
  useMediaLoadProgress — [ใหม่ตามที่ระบุ] เปอร์เซ็นต์โหลดจริงของรูป/วิดีโอทั้งหมดในพื้นที่หนึ่งของหน้า
  ────────────────────────────────────────────────────────────────────────────
  ใช้กับหน้า Welcome และหน้าแผนที่การเรียนรู้ (คู่กับ GameLoadingScreen — โผล่เฉพาะเมื่อโหลดนานเกิน 200 ms)
  - <img> = เสร็จเมื่อโหลด/ล้มเหลว (ล้มเหลวก็นับว่าเสร็จ — ไม่ค้างหน้าโหลด)
  - <video> = ความคืบหน้าจากข้อมูลที่บัฟเฟอร์แล้วจริง จนถึงพอเล่นเฟรมแรก (readyState ≥ 2)
  - extraUrls = รูปที่ใช้ผ่าน CSS (เช่น ภาพเฟรมแรกของวิดีโอ) — โหลดล่วงหน้าแล้วนับด้วย
  - น้ำหนัก: วิดีโอ 6 · รูปละ 1 · ไม่ถอยหลัง · ครบ 100% เมื่อทุกชิ้นพร้อมจริง
  - กันค้าง: เกิน timeoutMs แล้วถือว่าพร้อม (หน้าเดิมก็มีกันพลาด 2 วิ ของวิดีโอแผนที่อยู่แล้ว)
\*============================================================================*/

const VIDEO_WEIGHT = 6
/** วิดีโอ: นับว่าพร้อมเมื่อบัฟเฟอร์ได้อย่างน้อยเท่านี้ (วินาที) หรือเล่นเฟรมแรกได้ */
const VIDEO_READY_SECONDS = 2

export function useMediaLoadProgress(rootRef: RefObject<HTMLElement | null>, extraUrls: string[] = [], timeoutMs = 8000): { progress: number; ready: boolean } {
  const [state, setState] = useState({ progress: 0, ready: false })
  const extraKey = extraUrls.join('|')

  useEffect(() => {
    const root = rootRef.current
    // ไม่มีอะไรต้องรอ → พร้อมทันที (เลื่อนไปหลัง effect — ไม่ setState ซ้อนใน effect)
    const readyNow = () => { const t = window.setTimeout(() => setState({ progress: 1, ready: true }), 0); return () => window.clearTimeout(t) }
    if (!root) return readyNow()
    const imgs = Array.from(root.querySelectorAll('img'))
    const videos = Array.from(root.querySelectorAll('video'))
    const extra = extraKey ? extraKey.split('|') : []
    const weights: Record<string, number> = {}
    imgs.forEach((_, i) => { weights[`img${i}`] = 1 })
    extra.forEach((_, i) => { weights[`url${i}`] = 1 })
    videos.forEach((_, i) => { weights[`vid${i}`] = VIDEO_WEIGHT })
    if (Object.keys(weights).length === 0) return readyNow()

    const tracker = createProgressTracker(weights)
    let alive = true
    const push = (key: string, v: number) => {
      if (!alive) return
      const p = tracker.set(key, v)
      setState({ progress: p, ready: p >= 1 })
    }
    const cleanups: (() => void)[] = []

    imgs.forEach((img, i) => {
      const key = `img${i}`
      if (img.complete) { push(key, 1); return }
      const done = () => push(key, 1)
      img.addEventListener('load', done); img.addEventListener('error', done)
      cleanups.push(() => { img.removeEventListener('load', done); img.removeEventListener('error', done) })
    })
    extra.forEach((url, i) => {
      const im = new Image()
      const done = () => push(`url${i}`, 1)
      im.onload = done; im.onerror = done
      im.src = url
      if (im.complete) done()
    })
    videos.forEach((v, i) => {
      const key = `vid${i}`
      const update = () => {
        if (v.readyState >= 2 || v.error) { push(key, 1); return }
        // บัฟเฟอร์แล้วกี่วินาที เทียบกับที่ต้องใช้ก่อนเล่นได้ (ข้อมูลจริงจากเบราว์เซอร์)
        const need = Math.min(VIDEO_READY_SECONDS, Number.isFinite(v.duration) && v.duration > 0 ? v.duration : VIDEO_READY_SECONDS)
        const got = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0
        push(key, Math.min(0.95, got / need))
      }
      const events = ['progress', 'loadedmetadata', 'loadeddata', 'canplay', 'error'] as const
      events.forEach((e) => v.addEventListener(e, update))
      cleanups.push(() => events.forEach((e) => v.removeEventListener(e, update)))
      update()
    })
    const giveUp = window.setTimeout(() => { if (alive) setState({ progress: 1, ready: true }) }, timeoutMs)
    return () => { alive = false; window.clearTimeout(giveUp); cleanups.forEach((f) => f()) }
  }, [rootRef, extraKey, timeoutMs])

  return state
}
