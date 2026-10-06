import type { QuestDef } from '../../config/questCatalog'
import { Z_INDEX } from '../../config/zIndex'
import { BADGE_ICONS } from '../../config/iconAssets'
import { useProgression } from '../../hooks/useProgression'
import RewardBurst from '../common/RewardBurst'

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
  [แก้ตามที่ระบุ] เปลี่ยนเป็น RewardBurst: รูปรางวัลใหญ่ + จำนวน + แสงจ้าด้านหลัง ไม่มีกรอบ
  ปุ่ม "ตกลง" กลางล่าง + กากบาทมุมขวาบน (ไม่หายเองแล้ว รอผู้เล่นกดปิด)
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

export default function QuestRewardCelebration({ data, onDone }: QuestRewardCelebrationProps) {
  const { doubleRewardToday } = useProgression()
  if (!data) return null

  const { quest, skipped } = data
  // บัฟ "รางวัลคูณสองวันนี้" (ตอนนี้ไม่มีแหล่งที่มา — กล่องระหว่างทางถูกเลิกใช้) — แสดงให้ตรงกับที่เซิร์ฟเวอร์ให้จริง
  const mult = (skipped ? 0.5 : 1) * (doubleRewardToday ? 2 : 1)
  const coin = Math.round(quest.coinReward * mult)
  const exp = Math.round(quest.expReward * mult)

  return (
    <RewardBurst
      key={data.key}
      zIndex={Z_INDEX.celebration}
      onClose={onDone}
      items={[
        { key: 'coins', image: BADGE_ICONS.coins, amount: `+${coin}`, label: 'เหรียญ' },
        { key: 'exp', image: BADGE_ICONS.exp, amount: `+${exp}`, label: 'EXP' },
      ]}
    />
  )
}
