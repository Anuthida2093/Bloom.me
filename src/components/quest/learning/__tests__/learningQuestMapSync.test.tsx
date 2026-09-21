// @vitest-environment jsdom
/*============================================================================*\
  learningQuestMapSync.test.tsx — [ใหม่] พิสูจน์บั๊ก "นกฮูก/ด่านล็อกไม่ sync ทันที"
  ────────────────────────────────────────────────────────────────────────────
  ตามที่ระบุ (ข้อ 5) — ห้ามรายงานว่าแก้แล้วโดยไม่พิสูจน์จริง เทสต์นี้เล่นเควสจริง
  "เพ่งสมาธิ / ตั้งเป้าหมาย" ผ่าน UI จริงทั้งชุด (QuestSection → GameShell →
  ActiveFocusGame) โดยใช้ ProgressContext/UserContext ตัวจริง (ไม่ mock hook ใดๆ)
  แล้วเช็ค "ทันทีที่กด" (ไม่มี await/waitFor คั่นกลาง) ว่านกฮูกขยับ + ด่านถัดไปปลดล็อก
  หรือยัง — ถ้าต้องรอ tick/microtask เพิ่มถึงจะเห็นค่าใหม่ แปลว่ายังมีช่องว่างจริง
\*============================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppProvider, useUser, useProgress } from '../../../../context/AppContext'
import QuestSection from '../../QuestSection'

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Harness() {
  const { isLoggedIn, setLoggedIn, userData, treeStats, placedItems } = useUser()
  const { questLogs, moodEntries, handleToggleQuest, markIncineratorFailed } = useProgress()

  useEffect(() => {
    if (!isLoggedIn) setLoggedIn(true, false)
  }, [isLoggedIn, setLoggedIn])

  if (!isLoggedIn) return <div>logging in…</div>

  return (
    <QuestSection
      questLogs={questLogs}
      userData={userData}
      treeStats={treeStats}
      placedItems={placedItems}
      moodEntries={moodEntries}
      onToggle={handleToggleQuest}
      onFailIncinerator={markIncineratorFailed}
      onClose={() => {}}
      initialTab="knowledge"
    />
  )
}

function renderHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Harness />
      </AppProvider>
    </QueryClientProvider>,
  )
}

describe('LearningQuestMap — sync ทันทีหลังทำเควสสำเร็จ', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    // [เพิ่มรอบ pan/zoom] LearningQuestMap เรียก useIsLowPowerMode() (เช็ค prefers-reduced-motion/
    // max-width เพื่อสลับวิดีโอพื้นหลัง) ตอนนี้แล้ว — jsdom ไม่มี window.matchMedia จริง ต้อง stub
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      // framer-motion (ใช้อยู่แล้วในต้นไม้ผ่าน AnimatePresence/motion.* หลายจุด) ยังใช้ legacy
      // addListener/removeListener ของ MediaQueryList เช็ค prefers-reduced-motion เองด้วย
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
    // [ใหม่ — กล้องซูมออกตอนจบฐานสุดท้าย] jsdom ไม่มี requestAnimationFrame ทำงานจริงตามเฟรมเรต
    // จริง — เอฟเฟกต์กล้อง (startCameraFocus) ใช้ rAF ขับ tween ถ้าไม่ stub เทสต์ที่ต้องรอ tween
    // จบจะค้าง/ไม่จบตามเวลาที่คาดไว้ shim เป็น setTimeout(cb,0) ให้ tick ไวสุดเท่าที่ทำได้แทน —
    // ต้องตั้งทั้ง window.* ตรงๆ ด้วย (ไม่ใช่แค่ vi.stubGlobal บน globalThis) เพราะ
    // LearningQuestMap.tsx เรียกผ่าน window.requestAnimationFrame(...) ตรงๆ ทุกจุด
    const rafShim = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0) as unknown as number
    const cafShim = (id: number) => window.clearTimeout(id)
    vi.stubGlobal('requestAnimationFrame', rafShim)
    vi.stubGlobal('cancelAnimationFrame', cafShim)
    window.requestAnimationFrame = rafShim
    window.cancelAnimationFrame = cafShim
    // [ใหม่ — กล้องซูมออกตอนจบฐานสุดท้าย] jsdom ไม่ทำ layout จริง el.clientWidth/Height จึงเป็น
    // 0 เสมอ — LearningQuestMap's useLayoutEffect เรียก updateSize() ทันทีตอน mount (ไม่ต้องรอ
    // ResizeObserver callback จริงเลย ดูโค้ด) แต่ init-zoom effect bail ทิ้งถ้า width/height<=0
    // ทำให้ zoom/pan ค้างที่ค่าเริ่มต้น {1,{0,0}} ตลอดเทสต์ ไม่มีทางพิสูจน์ zoom เปลี่ยนได้เลย —
    // stub ค่าคงที่ให้ elements ทุกตัวรายงานขนาดที่ไม่เป็นศูนย์แทน
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1200 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 500 })
  })

  it('เล่น "เพ่งสมาธิ / ตั้งเป้าหมาย" จบ 1 ครั้ง → ด่าน "หยั่งรากลึก" ต้องปลดล็อกโดยไม่ต้องรอ tick เพิ่ม', async () => {
    renderHarness()

    // เปิดหน้ายืนยันเควสแรก
    fireEvent.click(await screen.findByTitle('เพ่งสมาธิ / ตั้งเป้าหมาย'))
    fireEvent.click(await screen.findByText('🚩 เริ่มทำภารกิจ'))

    // กรอกฟอร์มขั้นต่ำให้ปุ่ม "ปักธงเป้าหมายวันนี้" กดได้ (canSubmit)
    fireEvent.change(await screen.findByLabelText('วันนี้จะฝึกอะไรให้เก่งขึ้น'), { target: { value: 'ทดสอบ SQL join' } })
    fireEvent.change(screen.getByLabelText('จะทำให้ดีขึ้นกว่าเดิมยังไง'), { target: { value: 'เขียน query เองแล้วตรวจคำตอบ' } })

    const submitBtn = screen.getByText('ปักธงเป้าหมายวันนี้') as HTMLButtonElement
    expect(submitBtn.disabled).toBe(false)

    // owl ก่อนทำเควส — ยืนอยู่ที่ FIRST_OWL_POS ({x:51,y:90}, จุดคงที่ก่อนถึงโหนด 1 บนเส้นทาง —
    // ดู LearningQuestMap.tsx) เพราะยังไม่ทำอะไรสำเร็จ [แก้รอบกล้องอัตโนมัติ] เดิมทดสอบด้วยสูตร
    // offset จากโหนด 1 (rawStartPos) ซึ่งถูกตัดออกไปแล้วตามที่ระบุ (ข้อ 1: นกฮูกต้องอยู่บน
    // เส้นทางจริง ไม่ใช่ offset เดา) แทนที่ด้วย FIRST_OWL_POS คงที่
    const owlBefore = document.querySelector('.learning-quest-map__owl') as HTMLElement
    expect(owlBefore.style.left).toBe('51%')
    expect(owlBefore.style.top).toBe('90%')

    // ── จุดวัดผลจริง — กดครั้งเดียว แล้วเช็คทันที ไม่มี await/waitFor คั่นกลางเลย ──
    fireEvent.click(submitBtn)

    // 1) ด่าน "หยั่งรากลึก" ต้องปลดล็อกทันที ในเรนเดอร์เดียวกับที่กด ไม่ใช่รอ tick ถัดไป
    const deepRootNode = screen.getByTitle('หยั่งรากลึก / โหมดจดจ่อ')
    expect(deepRootNode.className).not.toContain('learning-quest-map__node--locked')

    // 2) นกฮูกต้องขยับไปที่ตำแหน่งโหนดที่ 1 "พอดี" ทันที (FIXED_NODE_POSITIONS[0] = {x:40,y:70}
    // — รอบกล้องอัตโนมัตินี้เปลี่ยนสูตรจาก offset เดาเป็น "ตำแหน่งโหนดพอดี" กันนกฮูกหลุดเส้นทาง)
    const owlAfter = document.querySelector('.learning-quest-map__owl') as HTMLElement
    expect(owlAfter.style.left).toBe('40%')
    expect(owlAfter.style.top).toBe('70%')
  }, 10000)
})
