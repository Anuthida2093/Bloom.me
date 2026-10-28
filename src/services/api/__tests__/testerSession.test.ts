// @vitest-environment jsdom
/*============================================================================*\
  testerSession.test.ts — บัญชีทดสอบ tester@bloom.me ต้องไม่แตะข้อมูลจริงเลย
  (ไม่ยิง API แม้ตั้ง live, ข้อมูลอยู่ใน sessionStorage เท่านั้น, ออกจากระบบแล้วหายหมด)
\*============================================================================*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('tester session', () => {
  beforeEach(() => {
    vi.resetModules()
    // ตั้งเป็น live — ถ้าบัญชีทดสอบหลุดไปเรียก fetch จริง เทสต์ต้องพัง
    vi.stubEnv('VITE_API_MODE', 'live')
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ห้ามยิง API จริงจากบัญชีทดสอบ'))))
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('สมัคร → เลือก MBTI → ทำเควส: ทุกอย่างอยู่ใน sessionStorage ไม่ยิง API และ localStorage ว่าง', async () => {
    const user = await import('../user.api')
    const quest = await import('../quest.api')
    const { TESTER_EMAIL, TESTER_PASSWORD, isTesterSession } = await import('../../../utils/testerSession')

    const registered = await user.register({
      email: TESTER_EMAIL, username: 'ผู้ทดสอบ', password: TESTER_PASSWORD,
      birthDate: '2000-01-01', gender: 'FEMALE', height: 160, weight: 55,
    })
    expect(registered.mbtiType).toBeNull()
    expect(isTesterSession()).toBe(true)

    const withTree = await user.updateMbti('INFJ')
    expect(withTree.mbtiType).toBe('INFJ')
    await quest.completeQuest({ questCode: 'phys-hydration-drop' })

    expect(fetch).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.getItem('bloom:mock-db')).toContain('INFJ')
  })

  it('ล็อกอินด้วยอีเมลทดสอบได้ (ช่องแรกรับอีเมล) และเล่นต่อจากเดิมในแท็บเดียวกัน', async () => {
    const user = await import('../user.api')
    const { TESTER_EMAIL, TESTER_PASSWORD } = await import('../../../utils/testerSession')

    await user.login({ username: TESTER_EMAIL, password: TESTER_PASSWORD })
    await user.updateMbti('ENFP')
    const again = await user.login({ username: ` ${TESTER_EMAIL.toUpperCase()} `, password: TESTER_PASSWORD })
    expect(again.mbtiType).toBe('ENFP')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ออกจากระบบ → ข้อมูลทดสอบของแท็บนี้ถูกล้าง กลับมาเป็นผู้ใช้ปกติ', async () => {
    const user = await import('../user.api')
    const { TESTER_EMAIL, TESTER_PASSWORD, isTesterSession } = await import('../../../utils/testerSession')

    await user.login({ username: TESTER_EMAIL, password: TESTER_PASSWORD })
    await user.updateMbti('ISTJ')
    await user.logout()

    expect(isTesterSession()).toBe(false)
    expect(window.sessionStorage.getItem('bloom:mock-db')).toBeNull()
    const fresh = await user.login({ username: TESTER_EMAIL, password: TESTER_PASSWORD })
    expect(fresh.mbtiType).toBeNull()
  })
})
