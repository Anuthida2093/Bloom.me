import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { EventData, Step } from 'react-joyride'
import { useUser } from '../../context/UserContext'
import { TOURS, tourTargetSelector, type TourId, type TourStepConfig } from '../../config/tourSteps'
import { hasSeenTour, markTourSeen, TOURS_RESET_EVENT } from '../../utils/tourProgress'
import { Z_INDEX } from '../../config/zIndex'
import TourTooltip from './TourTooltip'

/*============================================================================*\
  PageTour — ทัวร์สอนใช้งานของ "หนึ่งหน้า" (react-joyride)
  ────────────────────────────────────────────────────────────────────────────
  วางไว้ในหน้าไหนก็ได้: <PageTour tourId="shop" />
    • เด้งเองครั้งแรกที่ผู้ใช้เปิดหน้านั้น (จำแยกตามบัญชี — ดู utils/tourProgress.ts)
    • ข้อความ/จุดไฮไลท์ทั้งหมดอยู่ที่ config/tourSteps.ts ไฟล์เดียว ไม่ต้องแก้ที่นี่
    • ขั้นที่ชี้ไปยังปุ่มที่ "ไม่ได้แสดงอยู่ตอนนี้" (เช่น ปุ่มที่โผล่ตามเงื่อนไข) ถูกข้ามเอง
    • เล่นได้ทีละทัวร์ — หน้าที่เปิดซ้อนกันจะรอคิวจนทัวร์ก่อนหน้าจบ
    • enabled=false → ยังไม่เริ่ม (เช่น หน้า Home รอให้ฉากเปิดตัว/โมดัลปิดก่อน)
  โหลด react-joyride แบบ lazy — ผู้ใช้ที่ดูทัวร์ครบแล้วไม่ต้องดาวน์โหลดไลบรารีนี้เลย
\*============================================================================*/

const Joyride = lazy(() => import('react-joyride').then((m) => ({ default: m.Joyride })))

/** ทัวร์ที่กำลังแสดงอยู่ (มีได้ทีละอันทั้งแอป) */
let activeTourId: string | null = null
const QUEUE_RETRY_MS = 500

/** ป๊อปอัพอื่นที่ต้องรอให้ปิดก่อนทัวร์เริ่ม (กันกล่องซ้อนกันจนรก): รางวัล/การ์ดดรอป (reward-burst),
 *  แจ้งเตือนในเกม (ui-game-alert), เลื่อนอันดับ, กู้คืนหยดน้ำ, ผงพิเศษ, แคปซูลเวลาถึงกำหนด,
 *  ฉลองวันต่อเนื่อง — ป๊อปอัพใหม่ที่อยากให้ทัวร์รอ ใส่ data-tour-block ที่ตัวนอกสุดได้เลย */
const BLOCKING_POPUPS = [
  '[data-tour-block]', '.reward-burst', '.ui-game-alert', '.rank-up-modal', '.fw-modal', '.dust-pouch',
  '[aria-labelledby="time-capsule-title"]',
].join(',')

/** ระยะเว้นจากขอบจอ + พื้นที่ปลอดภัยของ iOS/Android (รอยบาก, แถบโฮม, แถบนำทาง) — ค่ามาจาก
 *  ตัวแปร --tour-safe-* ใน TourTooltip.css (env(safe-area-inset-*)) */
function screenPadding() {
  const css = getComputedStyle(document.documentElement)
  const inset = (name: string) => parseFloat(css.getPropertyValue(name)) || 0
  const gap = 12
  return {
    top: gap + inset('--tour-safe-top'),
    right: gap + inset('--tour-safe-right'),
    bottom: gap + inset('--tour-safe-bottom'),
    left: gap + inset('--tour-safe-left'),
  }
}

/** เป้าหมายที่กินพื้นที่เกือบเต็มจอ (ต้นไม้, หน้าเควสเต็มกรอบ) ไม่มีที่ให้วางกล่องข้อความข้างๆ
 *  กล่องจะหลุดขอบจอจนกดปุ่มไม่ได้ → แสดงเป็นกล่องลอยกลางจอแทน */
function isLargeTarget(target: string): boolean {
  const rect = document.querySelector(tourTargetSelector(target))?.getBoundingClientRect()
  if (!rect) return false
  const vw = window.innerWidth
  const vh = window.innerHeight
  return rect.height > vh * 0.65 || (rect.width > vw * 0.9 && rect.height > vh * 0.4)
}

function toJoyrideStep(s: TourStepConfig): Step {
  const isCenter = s.target === 'center' || isLargeTarget(s.target)
  return {
    target: isCenter ? 'body' : tourTargetSelector(s.target),
    placement: isCenter ? 'center' : (s.placement ?? 'auto'),
    title: s.title,
    content: s.content,
  }
}

interface PageTourProps {
  tourId: TourId
  enabled?: boolean
  /** รอให้แอนิเมชันเปิดหน้าจบก่อนค่อยวัดตำแหน่งปุ่ม */
  delayMs?: number
}

export default function PageTour({ tourId, enabled = true, delayMs = 700 }: PageTourProps) {
  const { userData, isLoggedIn, isGuest } = useUser()
  const userId = userData.id
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [resetTick, setResetTick] = useState(0)

  useEffect(() => {
    const onReset = () => setResetTick((n) => n + 1)
    window.addEventListener(TOURS_RESET_EVENT, onReset)
    return () => window.removeEventListener(TOURS_RESET_EVENT, onReset)
  }, [])

  useEffect(() => {
    if (!enabled || !(isLoggedIn || isGuest) || hasSeenTour(userId, tourId)) return
    let cancelled = false
    let timer = 0
    const tryStart = () => {
      if (cancelled) return
      const busy = (activeTourId && activeTourId !== tourId) || document.querySelector(BLOCKING_POPUPS)
      if (busy) { timer = window.setTimeout(tryStart, QUEUE_RETRY_MS); return }
      const available = (TOURS[tourId] ?? []).filter((s) => s.target === 'center' || document.querySelector(tourTargetSelector(s.target)))
      if (available.length === 0) return
      activeTourId = tourId
      setSteps(available.map(toJoyrideStep))
    }
    timer = window.setTimeout(tryStart, delayMs)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [enabled, isLoggedIn, isGuest, userId, tourId, delayMs, resetTick])

  // หน้าถูกปิดระหว่างทัวร์ → ปล่อยคิวให้ทัวร์อื่น (ยังไม่นับว่าดูแล้ว เปิดหน้าใหม่จะเห็นอีก)
  useEffect(() => () => { if (activeTourId === tourId) activeTourId = null }, [tourId])

  // ระหว่างทัวร์ ซ่อนแจ้งเตือนเล็กๆ (toast) ไม่ให้โผล่ทับกล่องทัวร์ — ดู .tour-active ใน TourTooltip.css
  useEffect(() => {
    if (!steps) return
    document.body.classList.add('tour-active')
    return () => document.body.classList.remove('tour-active')
  }, [steps])

  const handleEvent = useCallback((data: EventData) => {
    if (data.type !== 'tour:end') return
    markTourSeen(userId, tourId) // จบ/กดข้าม = ไม่เด้งอีก (ดูซ้ำได้จากปุ่มในหน้าตั้งค่า)
    if (activeTourId === tourId) activeTourId = null
    setSteps(null)
  }, [userId, tourId])

  if (!steps) return null
  return (
    <Suspense fallback={null}>
      <Joyride
        run
        continuous
        steps={steps}
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        // วงแสงทองนุ่มๆ รอบจุดที่ไฮไลท์ (เส้นขอบช่องสว่าง) — เงาเรืองแสงเพิ่มใน TourTooltip.css
        styles={{ spotlight: { stroke: '#F6DE8D', strokeWidth: 3 } }}
        scrollToFirstStep
        // กล่องไม่ชิดขอบจอ และไม่ทับรอยบาก/แถบโฮมของ iPhone หรือแถบนำทางของ Android
        floatingOptions={{ shiftOptions: { padding: screenPadding() }, flipOptions: { padding: screenPadding() } }}
        locale={{ back: 'ย้อนกลับ', close: 'ปิด', last: 'เข้าใจแล้ว', next: 'ถัดไป', skip: 'ข้าม' }}
        options={{
          zIndex: Z_INDEX.tour,
          buttons: ['back', 'skip', 'primary'],
          skipBeacon: true,
          overlayClickAction: false,
          dismissKeyAction: false,
          blockTargetInteraction: true,
          // พื้นหลังเขียวเข้มโปร่งแสง (แทนดำล้วน) ให้เข้ากับป่า — จุดที่พูดถึงสว่างอยู่จุดเดียว
          overlayColor: 'rgba(14, 34, 22, 0.68)',
          spotlightRadius: 18,
          spotlightPadding: 8,
          targetWaitTimeout: 1500,
          arrowColor: '#F8EDD3', // สีเดียวกับกระดาษของกล่อง
        }}
      />
    </Suspense>
  )
}
