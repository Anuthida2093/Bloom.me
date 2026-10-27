import { useEffect, useState } from 'react'
import { BADGE_ICONS, ITEM_ICONS } from '../../../../config/iconAssets'
import { describeStepChest, type StepChestReward, SPECIAL_DUST_ICON, DOUBLE_CARD_ICON } from '../../../../config/stepChest'
import { playSfx } from '../../../../utils/audioPlayer'
import './DiaryRewardScroll.css'

/*============================================================================*\
  DiaryRewardScroll — หน้ารางวัลประจำวันของเควสก้าวเพื่อสุขภาพ แบบ "กระดาษไดอะรี่ของฉัน"
  ────────────────────────────────────────────────────────────────────────────
  ม้วนกระดาษค่อยๆ คลี่ลงมา (ไม้ม้วนบน-ล่าง) → รายการรางวัลที่ได้วันนี้ค่อยๆ เขียนขึ้นทีละบรรทัด
  ตัวเลขทั้งหมดมาจากเซิร์ฟเวอร์/สูตรเดียวกับ backend (StepJourneyGame ส่งมา) — ไม่สุ่มเองที่นี่
\*============================================================================*/

const UNROLL_MS = 1100
const LINE_STAGGER_MS = 260

export interface DiaryRewardScrollProps {
  reachedGoal: boolean
  steps: number
  goal: number
  exp: number
  coins: number
  /** null = ไม่แสดงบรรทัดหยดน้ำ (โหมด live ยังไม่ให้หยดน้ำตามสัดส่วนทริป) */
  waterDrops: number | null
  /** วันนี้มีบัฟคูณสองจากกล่อง → EXP/เหรียญที่แสดงคูณแล้ว */
  doubled: boolean
  /** ผลหีบสมบัติที่เส้นชัยวันนี้ (null = ไม่ถึงเป้า ไม่มีหีบ) */
  chest: StepChestReward | null
  sfx: { volume: number; enabled: boolean }
  onClaim: () => void
  /** เปิดแผนที่ทริปของวันนี้ขนาดใหญ่ (เส้นทางที่เดินสำเร็จ) */
  onViewMap?: () => void
}

function chestIcon(c: StepChestReward): React.ReactNode {
  if (c.kind === 'EXCHANGE_CARD') return c.cardItemCode && ITEM_ICONS[c.cardItemCode] ? <img src={ITEM_ICONS[c.cardItemCode]} alt="" /> : '🎴'
  return <img src={c.kind === 'BONUS_COINS' ? BADGE_ICONS.coins : c.kind === 'WATER_DROPS' ? BADGE_ICONS.water : c.kind === 'SPECIAL_DUST' ? SPECIAL_DUST_ICON : c.kind === 'DOUBLE_CARD' ? DOUBLE_CARD_ICON : BADGE_ICONS.exp} alt="" />
}

export default function DiaryRewardScroll(props: DiaryRewardScrollProps) {
  const { reachedGoal, steps, goal, exp, coins, waterDrops, doubled, chest, sfx, onClaim, onViewMap } = props
  const [unrolled, setUnrolled] = useState(false)

  useEffect(() => {
    playSfx('PAPER_CRUMPLE', sfx)
    const id = window.setTimeout(() => setUnrolled(true), UNROLL_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- เล่นเสียงคลี่กระดาษครั้งเดียวตอนเปิด
  }, [])

  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const lines: { key: string; icon: React.ReactNode; text: React.ReactNode; highlight?: boolean }[] = [
    { key: 'steps', icon: '🦶', text: <>เดินได้ <b>{steps.toLocaleString()}</b> / {goal.toLocaleString()} ก้าว {reachedGoal ? ' ถึงเป้าแล้ว!' : ''}</> },
    { key: 'exp', icon: <img src={BADGE_ICONS.exp} alt="" />, text: <>EXP <b>+{exp}</b>{doubled && <span className="diary-scroll__x2">×2</span>}</> },
    { key: 'coins', icon: <img src={BADGE_ICONS.coins} alt="" />, text: <>เหรียญ <b>+{coins}</b>{doubled && <span className="diary-scroll__x2">×2</span>}</> },
    ...(waterDrops !== null ? [{ key: 'water', icon: <img src={BADGE_ICONS.water} alt="" />, text: <>หยดน้ำ <b>+{waterDrops}</b></> }] : []),
    ...(chest ? [{ key: 'chest', icon: chestIcon(chest), text: describeStepChest(chest), highlight: chest.kind === 'EXCHANGE_CARD' }] : []),
  ]

  return (
    <div className="diary-scroll-overlay" role="dialog" aria-modal="true" aria-labelledby="diary-scroll-title">
      <div className={`diary-scroll${unrolled ? ' diary-scroll--open' : ''}`}>
        <div className="diary-scroll__rod diary-scroll__rod--top" aria-hidden="true" />
        <div className="diary-scroll__paper">
          <div className="diary-scroll__inner">
            <p className="diary-scroll__date">{today}</p>
            <h2 id="diary-scroll-title" className="diary-scroll__title">{reachedGoal ? 'บันทึกการเดินทางวันนี้' : 'หมดวันแล้ว บันทึกการเดินทาง'}</h2>
            <ul className="diary-scroll__lines">
              {lines.map((l, i) => (
                <li
                  key={l.key}
                  className={`diary-scroll__line${l.highlight ? ' diary-scroll__line--special' : ''}`}
                  style={{ animationDelay: `${UNROLL_MS + i * LINE_STAGGER_MS}ms` }}
                >
                  <span className="diary-scroll__icon" aria-hidden="true">{l.icon}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
            {onViewMap && (
              <button
                type="button"
                className="diary-scroll__map-btn"
                onClick={onViewMap}
                disabled={!unrolled}
                style={{ animationDelay: `${UNROLL_MS + lines.length * LINE_STAGGER_MS}ms` }}
              >
                🗺️ ดูแผนที่
              </button>
            )}
            <button
              type="button"
              className="diary-scroll__btn"
              onClick={onClaim}
              disabled={!unrolled}
              style={{ animationDelay: `${UNROLL_MS + lines.length * LINE_STAGGER_MS}ms` }}
            >
              รับรางวัลวันนี้
            </button>
          </div>
        </div>
        <div className="diary-scroll__rod diary-scroll__rod--bottom" aria-hidden="true" />
      </div>
    </div>
  )
}
