import { useEffect } from 'react'
import type { QuestDef } from '../../config/questCatalog'
import { Z_INDEX } from '../../config/zIndex'
import { BADGE_ICONS } from '../../config/iconAssets'
import './QuestRewardCelebration.css'

/*============================================================================*\
  QuestRewardCelebration — [ไฟล์ใหม่] ป้ายฉลองรางวัลกลาง "ครอบคลุมทุกเส้นทางทำเควสสำเร็จ"
  ────────────────────────────────────────────────────────────────────────────
  ก่อนหน้านี้แต่ละเส้นทางฉลองความสำเร็จไม่เหมือนกัน: เกมที่ผ่าน GameShell มีหน้ารับรางวัล
  ของตัวเอง (ดาว/เหรียญ/EXP) ส่วนหน้าเควสพิเศษ 5 หน้า (ไพ่ทิพย์/เตาเผา/ทอดสมอใจ/สมุดรากไม้/
  เกราะขอบคุณ) ต่างก็มีหน้าจอ "สำเร็จ" ของตัวเองที่หน้าตาไม่เหมือนกันเลยสักหน้า

  ตัวนี้เป็น "ป้ายลอย" (ไม่ใช่หน้าเต็มจอ) แปะไว้กึ่งกลางด้านบนจอ ลอยทับทุกอย่างที่กำลัง
  แสดงอยู่ (ไม่บล็อกการโต้ตอบกับหน้าจอเดิม) โผล่มาทันทีที่เควสไหนก็ตามสำเร็จจริง
  (เรียกจาก QuestSection.tsx จุดเดียว ครอบคลุมทั้ง onCompletePlaying และ onCompleteSpecial —
  ทุกเส้นทางเรียกผ่านสองจุดนี้หมด) แสดงดาว/เหรียญ/EXP + แอนิเมชันประกายดาวกระจาย + เสียง
  แล้วหายไปเองใน 2.2 วิ ไม่ต้องกดปิด
\*============================================================================*/

export interface QuestCelebrationData {
  quest: QuestDef
  skipped: boolean
  key: number
}

interface QuestRewardCelebrationProps {
  data: QuestCelebrationData | null
  onDone: () => void
}

const AUTO_DISMISS_MS = 2200

export default function QuestRewardCelebration({ data, onDone }: QuestRewardCelebrationProps) {
  useEffect(() => {
    if (!data) return
    const id = window.setTimeout(onDone, AUTO_DISMISS_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.key])

  if (!data) return null

  const { quest, skipped } = data
  const coin = skipped ? Math.round(quest.coinReward / 2) : quest.coinReward
  const exp = skipped ? Math.round(quest.expReward / 2) : quest.expReward

  return (
    <div className="quest-celebration" style={{ zIndex: Z_INDEX.celebration }} key={data.key}>
      <div className="quest-celebration__sparkles" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ '--i': i } as React.CSSProperties}>✨</span>
        ))}
      </div>
      <div className="quest-celebration__card">
        <span className="quest-celebration__icon">{quest.icon}</span>
        <div className="quest-celebration__text">
          <div className="quest-celebration__title">
            {skipped ? `${quest.titleTh} สำเร็จ (ข้ามตัวจับเวลา)` : `${quest.titleTh} สำเร็จ!`}
          </div>
          {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 7] ตัวเลขไว้หน้ารูป + รูปใหญ่ชัดเจนขึ้น */}
          <div className="quest-celebration__rewards">
            <span>+{coin} <img src={BADGE_ICONS.coins} className="icon-img--reward" alt="" /></span>
            <span>+{exp} EXP <img src={BADGE_ICONS.exp} className="icon-img--reward" alt="" /></span>
          </div>
        </div>
      </div>
    </div>
  )
}
