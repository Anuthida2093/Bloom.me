import Overlay from '../ui/Overlay'
import Surface from '../ui/Surface'
import Button from '../ui/Button'
import { BADGE_ICONS } from '../../config/iconAssets'
import './RankUpModal.css'

/*============================================================================*\
  RankUpModal — [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 8] แจ้งเตือนตอนเลื่อนอันดับกระดานผู้นำ
  ────────────────────────────────────────────────────────────────────────────
  ระบบเก็บ "อันดับก่อนหน้า" (lastKnownRank) ไม่เคยมีมาก่อนจริงๆ (ตรวจโค้ดจริงแล้ว —
  LeaderboardPanel.tsx เดิม hardcode "#8" เป็น string ตรงๆ ไม่มีการคำนวณอันดับจริงเลย)
  สร้างใหม่ทั้งคู่: การคำนวณอันดับจริง (ดู LeaderboardPanel.tsx: computeMyRank) และ
  popup นี้ (Dashboard.tsx เป็นคนเทียบ lastKnownRank เก่ากับอันดับปัจจุบันแล้วเปิด popup)

  ใช้ Overlay/Surface/Button ชุดเดียวกับ GameAlert.tsx (ระบบ popup มาตรฐานของทั้งแอป)
  ไม่ได้สร้างดีไซน์ modal แยกใหม่โดดๆ ตามที่ระบุ — Surface variant="chrome" ตรงกับที่
  คอมเมนต์ใน Surface.tsx เองระบุไว้ว่าใช้กับ "leaderboard" อยู่แล้ว
\*============================================================================*/

interface RankUpModalProps {
  open: boolean
  fromRank: number | null
  toRank: number
  onClose: () => void
}

export default function RankUpModal({ open, fromRank, toRank, onClose }: RankUpModalProps) {
  return (
    <Overlay open={open} onClose={onClose} labelledBy="rank-up-modal-title">
      <Surface variant="chrome" radius="lg" pad="lg" className="rank-up-modal">
        <img src={BADGE_ICONS.trophy} alt="" className="rank-up-modal__badge" />
        <h2 id="rank-up-modal-title" className="rank-up-modal__title">ยินดีด้วย!</h2>
        <p className="rank-up-modal__message">
          คุณเลื่อนอันดับจาก{' '}
          <span className="rank-up-modal__rank rank-up-modal__rank--from">#{fromRank ?? '—'}</span>
          {' '}เป็น{' '}
          <span className="rank-up-modal__rank rank-up-modal__rank--to">#{toRank}</span>
        </p>
        <Button variant="primary" block onClick={onClose}>เยี่ยมเลย!</Button>
      </Surface>
    </Overlay>
  )
}
