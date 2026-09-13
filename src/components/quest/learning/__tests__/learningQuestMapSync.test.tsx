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

    // owl ก่อนทำเควส — ยืนอยู่ที่ตำแหน่งเริ่มต้น (ก่อนโหนดที่ 1) ตาม FIXED_NODE_POSITIONS[0]
    // = {x:42,y:69} → rawStartPos = {x:33, y:76} (ดู LearningQuestMap.tsx) เพราะยังไม่ทำอะไรสำเร็จ
    const owlBefore = document.querySelector('.learning-quest-map__owl') as HTMLElement
    expect(owlBefore.style.left).toBe('33%')
    expect(owlBefore.style.top).toBe('76%')

    // ── จุดวัดผลจริง — กดครั้งเดียว แล้วเช็คทันที ไม่มี await/waitFor คั่นกลางเลย ──
    fireEvent.click(submitBtn)

    // 1) ด่าน "หยั่งรากลึก" ต้องปลดล็อกทันที ในเรนเดอร์เดียวกับที่กด ไม่ใช่รอ tick ถัดไป
    const deepRootNode = screen.getByTitle('หยั่งรากลึก / โหมดจดจ่อ')
    expect(deepRootNode.className).not.toContain('learning-quest-map__node--locked')

    // 2) นกฮูกต้องขยับไปที่โหนดที่ 1 (FIXED_NODE_POSITIONS[0] = {x:42,y:69}) ทันทีเช่นกัน
    const owlAfter = document.querySelector('.learning-quest-map__owl') as HTMLElement
    expect(owlAfter.style.left).toBe('42%')
    expect(owlAfter.style.top).toBe('69%')
  }, 10000)
})
