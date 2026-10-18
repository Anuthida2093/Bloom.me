import { useEffect } from 'react'
import { BADGE_ICONS, ITEM_ICONS } from '../../config/iconAssets'
import { exchangeCardLabel } from '../../config/exchangeItems'
import { useProgress } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import { playSfx } from '../../utils/audioPlayer'
import RewardBurst from '../common/RewardBurst'
import { requestHomeWatering } from '../../utils/waterPrompt'

/*============================================================================*\
  LearningGiftPopup — [แก้ตามที่ระบุ] ของขวัญสุ่มเมื่อทำเควสการเรียนรู้ครบทั้ง 5 ด่าน
  (ProgressContext.learningGift — เซิร์ฟเวอร์สุ่ม ดู config/learningGift.ts) แล้วเส้นทางรีเซ็ตเล่นด่านแรกใหม่ได้
\*============================================================================*/

export default function LearningGiftPopup() {
  const { learningGift, dismissLearningGift } = useProgress()
  const { settings } = useUI()

  useEffect(() => {
    if (learningGift) playSfx('QUEST_SUCCESS', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
  }, [learningGift, settings.sfxVolume, settings.soundEnabled])

  if (!learningGift) return null
  const item = learningGift.kind === 'EXCHANGE_CARD' && learningGift.cardItemCode
    ? { image: ITEM_ICONS[learningGift.cardItemCode] ?? BADGE_ICONS.item, amount: '×1', label: exchangeCardLabel(learningGift.cardItemCode) }
    : learningGift.kind === 'BONUS_COINS'
      ? { image: BADGE_ICONS.coins, amount: `+${learningGift.amount}`, label: 'เหรียญโบนัส' }
      : { image: BADGE_ICONS.water, amount: `+${learningGift.amount}`, label: 'หยดน้ำ' }
  return (
    <RewardBurst
      onClose={() => {
        const water = learningGift.kind === 'WATER_DROPS'
        dismissLearningGift()
        if (water) requestHomeWatering() // [แก้ตามที่ระบุ] ได้หยดน้ำ → กลับหน้า Home แล้วรดน้ำต้นไม้
      }}
      items={[{ key: `${learningGift.key}`, ...item }]}
      note={<>ของขวัญจากการเรียนรู้ครบทั้ง 5 ด่าน 🎁<br />เส้นทางเริ่มรอบใหม่แล้ว — กลับไปเล่นด่านแรกได้เลย</>}
    />
  )
}
