// @vitest-environment jsdom
/*============================================================================*\
  useEscapeKey.test.tsx — Esc ปิดเฉพาะชั้นบนสุด (ไม่ปิดหน้าข้างใต้ไปด้วย) แล้วค่อยถึงชั้นถัดไป
\*============================================================================*/
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEscapeKey } from '../useEscapeKey'

const pressEsc = () => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })

describe('useEscapeKey', () => {
  it('ชั้นที่เปิดล่าสุดได้ Esc ก่อน · ปิดแล้วชั้นล่างถึงได้', () => {
    const page = vi.fn(), popup = vi.fn()
    const pageHook = renderHook(() => useEscapeKey(page))
    const popupHook = renderHook(() => useEscapeKey(popup))
    pressEsc()
    expect(popup).toHaveBeenCalledTimes(1)
    expect(page).not.toHaveBeenCalled()
    popupHook.unmount()
    pressEsc()
    expect(page).toHaveBeenCalledTimes(1)
    pageHook.unmount()
  })

  it('active=false ไม่อยู่ในสแตก', () => {
    const page = vi.fn(), closedPopup = vi.fn()
    const a = renderHook(() => useEscapeKey(page))
    const b = renderHook(() => useEscapeKey(closedPopup, false))
    pressEsc()
    expect(page).toHaveBeenCalledTimes(1)
    expect(closedPopup).not.toHaveBeenCalled()
    a.unmount(); b.unmount()
  })
})
