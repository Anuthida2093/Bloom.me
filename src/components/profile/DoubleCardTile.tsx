import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DOUBLE_CARD_HOURS, DOUBLE_CARD_ICON } from '../../config/stepChest'
import { consumeDoubleCard } from '../../services/api/progression.api'
import { ApiError } from '../../services/http'
import { queryKeys } from '../../services/queryKeys'
import { formatRemainingTh, useCountdown } from '../../hooks/useCountdown'
import './ProfileTokens.css'

/*============================================================================*\
  DoubleCardTile — [ใหม่ตามที่ระบุ] "การ์ดคูณสอง" ในคลังไอเทม (ได้จากหีบสมบัติเควสก้าว)
  กด "ใช้" → ยืนยันอีกครั้ง → เซิร์ฟเวอร์เริ่มนับ 12 ชม. (เหรียญ/EXP จากเควสทุกเควส ×2 ระหว่างนั้น)
  ระหว่างการ์ดทำงาน: แสดงเวลาที่เหลือ และใช้ใบใหม่ซ้อนไม่ได้ (กันเสียการ์ดฟรี)
\*============================================================================*/

export default function DoubleCardTile({ count, activeUntil }: { count: number; activeUntil: string | null }) {
  const queryClient = useQueryClient()
  const remainingMs = useCountdown(activeUntil)
  const active = remainingMs > 0
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (count <= 0 && !active) return null

  const use = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await consumeDoubleCard()
      setConfirming(false)
      void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'ใช้การ์ดไม่สำเร็จ ลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`double-tile${active ? ' double-tile--active' : ''}`}>
      {count > 0 && <span className="double-tile__count">{count}</span>}
      <img src={DOUBLE_CARD_ICON} alt="" className="double-tile__img" />
      <span className="double-tile__name">การ์ดคูณสอง</span>
      {active ? (
        <small className="double-tile__hint double-tile__hint--on">กำลังทำงาน · เหลือ {formatRemainingTh(remainingMs)}</small>
      ) : (
        <small className="double-tile__hint">รางวัลเควส ×2 นาน {DOUBLE_CARD_HOURS} ชม.</small>
      )}
      {!active && count > 0 && (confirming ? (
        <div className="double-tile__confirm">
          <small>เริ่มนับ {DOUBLE_CARD_HOURS} ชม. ทันที?</small>
          <div className="double-tile__confirm-row">
            <button type="button" className="double-tile__use" onClick={() => void use()} disabled={busy}>
              {busy ? '…' : 'ยืนยัน'}
            </button>
            <button type="button" className="double-tile__use double-tile__use--ghost" onClick={() => setConfirming(false)} disabled={busy}>
              ไม่ใช่ตอนนี้
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="double-tile__use" onClick={() => setConfirming(true)}>ใช้</button>
      ))}
      {error && <small className="double-tile__error" role="alert">{error}</small>}
    </div>
  )
}
