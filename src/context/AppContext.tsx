import { type ReactNode } from 'react'
import { UserProvider, useUser } from './UserContext'
import { ProgressProvider, useProgress } from './ProgressContext'
import { UIProvider, useUI, type AppSettings, type ModalKey } from './UIContext'
import { MentalProvider, useMental, DAILY_FOCUS_QUOTA_MINUTES, type ScreenCurfew } from './MentalContext'
import { PostProvider, usePosts } from './PostContext'
import { SocialProvider, useSocial } from './SocialContext'

/*============================================================================*\
  AppContext — [เขียนใหม่: จาก god object 375 บรรทัด เหลือชั้นประกอบร่างบางๆ]
  ────────────────────────────────────────────────────────────────────────────
  [เหตุผลที่ยังเก็บไฟล์นี้ไว้แทนที่จะลบทิ้ง]
  มีคอมโพเนนต์ 15 ไฟล์ที่เรียก useAppContext() อยู่ (QuestPlayModal, OracleCardsPage,
  IncineratorPage, GratitudeShieldPage, ReframerJournalPage, MindfulAnchorPage,
  QuestConfirmModal, WelcomeModal, Login, Register, MBTISelect, AudioContext ฯลฯ)
  ถ้าลบ useAppContext ทิ้งเลย ต้องแก้ทั้ง 15 ไฟล์ในคอมมิตเดียว ซึ่งเสี่ยงพังหลายจุดพร้อมกัน

  ไฟล์นี้จึงทำหน้าที่เป็น "สะพาน": ประกอบ context ทั้ง 4 ตัวเข้าด้วยกัน แล้ว
  useAppContext() รวมค่าจากทั้งสี่คืนเป็นออบเจกต์เดียวเหมือนเดิมเป๊ะ
  (User / Progress / UI / Mental — ตัวสุดท้ายคือระบบสุขภาพจิตทั้งชุด)
  → ของเดิมทำงานต่อได้ทันทีโดยไม่ต้องแก้อะไร ส่วนของใหม่ค่อยๆ ย้ายไปเรียก
    useUser() / useProgress() / useUI() ทีละไฟล์ตามสะดวก

  [ข้อควรรู้] useAppContext() จะ re-render เมื่อ context ใดก็ตามใน 4 ตัวเปลี่ยน
  ดังนั้นคอมโพเนนต์ไหนที่อยู่ในเส้นทางร้อน (ต้นไม้ กรอบเควส) ควรย้ายไปใช้ hook
  เฉพาะทางก่อนเป็นอันดับแรก — ตัวที่ย้ายแล้วในรอบนี้: Dashboard, TreeOfLife
\*============================================================================*/

export type { AppSettings, ModalKey, ScreenCurfew }
export { DAILY_FOCUS_QUOTA_MINUTES }

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ProgressProvider>
        {/* [ใหม่] PostProvider/SocialProvider ต้องอยู่ใน UserProvider (ต้องรู้ userId/username
            ตอนสร้างโพสต์/คอมเมนต์/ติดตาม) — ตอนนี้ต่อกับ UI จริงแล้วผ่านปุ่ม "สตอรี่"
            (เดิมชื่อ "โพสต์") มุมซ้ายล่างของ Dashboard ดู StoryOverlay.tsx */}
        <PostProvider>
          <SocialProvider>
            <UIProvider>
              <MentalProvider>{children}</MentalProvider>
            </UIProvider>
          </SocialProvider>
        </PostProvider>
      </ProgressProvider>
    </UserProvider>
  )
}

/**
 * useAppContext — API เดิมทั้งชุด รวมจาก 3 context
 * ใช้ได้เหมือนเดิมทุกประการ ไม่มี field ไหนหายไป
 */
// [หมายเหตุ react-refresh/only-export-components] ไฟล์สะพานของ Context ต้อง export hook
// คู่กับ Provider component เสมอ — แพทเทิร์นมาตรฐานของ React Context ทั้งวงการ การแยก hook
// ออกไปคนละไฟล์จะกระทบไฟล์ที่เรียก useAppContext() อยู่ 15 ไฟล์โดยไม่ได้อะไรเพิ่มนอกจาก
// Fast Refresh เต็มรูปแบบ (แทนที่จะ refresh บางส่วน) ตอน dev เท่านั้น ไม่กระทบ production
// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const user = useUser()
  const progress = useProgress()
  const ui = useUI()
  const mental = useMental()
  // ลำดับการรวมสำคัญ: mental อยู่ท้ายสุดเพราะทับ handleMoodSubmit และ postIts
  // ของ ProgressContext โดยตั้งใจ (เช็คอินอารมณ์ต้องไหลเข้าระบบน้ำยา/คัดกรองด้วย)
  return { ...user, ...progress, ...ui, ...mental }
}

// eslint-disable-next-line react-refresh/only-export-components
export { useUser, useProgress, useUI, useMental, usePosts, useSocial }