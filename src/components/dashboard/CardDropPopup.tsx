import { useEffect } from 'react'
import { BADGE_ICONS, ITEM_ICONS } from '../../config/iconAssets'
import { exchangeCardLabel } from '../../config/exchangeItems'
import { useProgress } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import { playSfx } from '../../utils/audioPlayer'
import RewardBurst from '../common/RewardBurst'

/*============================================================================*\
  CardDropPopup — ได้รับการ์ดแลกซื้อเมื่อการ์ดสุ่มตกจากเควสประจำวัน (ProgressContext.cardDrop)
  [แก้ตามที่ระบุ] ใช้ RewardBurst: รูปไอเทมของการ์ด (ใหญ่) + จำนวน + แสงจ้าด้านหลัง ไม่มีกรอบ
\*============================================================================*/

export default function CardDropPopup() {
  const { cardDrop, dismissCardDrop } = useProgress()
  const { settings } = useUI()

  useEffect(() => {
    if (cardDrop) playSfx('QUEST_SUCCESS', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
  }, [cardDrop, settings.sfxVolume, settings.soundEnabled])

  if (!cardDrop) return null
  return (
    <RewardBurst
      onClose={dismissCardDrop}
      items={[{
        key: cardDrop.itemCode,
        image: ITEM_ICONS[cardDrop.itemCode] ?? BADGE_ICONS.item,
        amount: '×1',
        label: exchangeCardLabel(cardDrop.itemCode),
      }]}
    />
  )
}
