import { useProgression } from '../../hooks/useProgression'
import { formatRemainingTh, useCountdown } from '../../hooks/useCountdown'
import { DOUBLE_CARD_ICON } from '../../config/stepChest'

/** [ใหม่ตามที่ระบุ] ป้ายเล็กใต้ HUD หน้า Home ระหว่างการ์ด ×2 ทำงาน — บอกเวลาที่เหลือ (หายเองเมื่อหมดเวลา) */
export default function DoubleRewardChip() {
  const { doubleRewardUntil } = useProgression()
  const remainingMs = useCountdown(doubleRewardUntil)
  if (remainingMs <= 0) return null
  return (
    <div className="hud-double" role="status" title="รางวัลเควสทุกเควส ×2 จนกว่าการ์ดจะหมดเวลา">
      <img src={DOUBLE_CARD_ICON} alt="" />
      <span>รางวัล ×2 · เหลือ {formatRemainingTh(remainingMs)}</span>
    </div>
  )
}
