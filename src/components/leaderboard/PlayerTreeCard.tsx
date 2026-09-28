import { MBTI_TREE_THEME, STACK_PER_VISUAL_LEVEL, type MbtiType } from '../../types'
import MiniTree from '../tree/MiniTree'
import FadeInText from '../welcome/FadeInText'
import './leaderboardRow.css'
import '../tree/TreeOfLife.css'
import type { LeaderboardPlayer } from '../../config/leaderboardData'
import { BADGE_ICONS, QUEST_TAB_ICONS } from '../../config/iconAssets'
import { speciesOf } from '../tree/procedural/species'
import { getMbtiDescription } from '../../config/mbtiDescriptions'

interface PlayerTreeCardProps {
  player: LeaderboardPlayer
  /** ปิดการ์ด (เปิดใหม่ได้จากปุ่มต้นไม้ที่แถบปุ่มขวา) — ไม่ใส่ = ไม่มีปุ่มปิด */
  onClose?: () => void
}

const toBarPct = (stack: number): number => Math.min(100, (stack / (STACK_PER_VISUAL_LEVEL * 5)) * 100)

/**
 * PlayerTreeCard — แผงข้อมูลต้นไม้ของ "คนอื่น" แบบอ่านอย่างเดียว (read-only)
 * แสดงคู่กับ TreeOfLife ของเขาตรงๆ บนจอ แทนที่จะเด้งเป็น modal การ์ดลอย (แบบ V1)
 * ข้อมูลที่มีจริงจาก LeaderboardPlayer มีแค่ username/mbtiType/level/3 stack เท่านั้น
 * (ไม่มี exp/coins/streak ของผู้เล่นคนอื่น) จึงไม่ใส่ตัวเลขปลอมๆ ลงไป
 */
export default function PlayerTreeCard({ player, onClose }: PlayerTreeCardProps) {
  // [แก้ตามที่ระบุ] บอกว่าเป็นต้นอะไร + MBTI ของเพื่อนคนนั้น
  const species = speciesOf(player.mbtiType as MbtiType)
  const mbtiInfo = getMbtiDescription(player.mbtiType as MbtiType)
  // [แก้ตามที่ระบุ — grep 📚/💪/🌸 พบจุดนี้] 3 หมวดตรงกับ QUEST_TAB_ICONS เป๊ะทั้ง 3 ตัว
  // (knowledge/physical/mental) มีไฟล์รูปจริงครบ จึงแทนได้ทั้งแถวโดยไม่ปนอีโมจิ/รูปในแถวเดียวกัน
  const stats = [
    { img: QUEST_TAB_ICONS.knowledge, icon: '📚', label: 'ด้านการเรียนรู้', val: toBarPct(player.knowledgeStack), color: 'var(--b500)' },
    { img: QUEST_TAB_ICONS.physical, icon: '💪', label: 'ด้านสุขภาพกาย', val: toBarPct(player.healthStack), color: 'var(--g600)' },
    { img: QUEST_TAB_ICONS.mental, icon: '🌸', label: 'ด้านสุขภาพจิต', val: toBarPct(player.emotionStack), color: 'var(--purple)' },
  ]

  return (
    /* [แก้ตามที่ระบุ] กรอบ/สีพื้นแบบกระดานจัดอันดับ — ชุดเดียวกับแผงข้อมูลต้นไม้ของเราเอง
       (สว่าง: เขียวอ่อน/ดำ, มืด: เขียวเข้ม/ขาวทั้งหมด) ต้นไม้ประจำ MBTI ของเพื่อนขึ้นก่อน */
    <div className="tree-of-life__tooltip tree-info-panel lb-frame player-tree-card">
      <div className="lb-frame__banner">🌳 {player.username}</div>
      {onClose && (
        <button className="tree-of-life__tooltip-close" title="ปิด" aria-label="ปิด" onClick={onClose}>
          <img src={BADGE_ICONS.close} className="icon-img" alt="" />
        </button>
      )}
      <div className="lb-frame__sheet tree-of-life__tooltip-sheet" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FadeInText style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <MiniTree theme={MBTI_TREE_THEME[player.mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP} size={84} />
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="tag" style={{ background: 'var(--ti-row)', color: 'var(--ti-text)' }}>{player.mbtiType}</span>
          <span className="tag" style={{ background: 'var(--ti-row)', color: 'var(--ti-text)' }}>🌳 Lv.{player.level}</span>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--ti-text)' }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{species.name} <span style={{ fontSize: 13, opacity: 0.75 }}>({species.nameEn})</span></div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{player.mbtiType} · {mbtiInfo.nickname}</div>
          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4, lineHeight: 1.5 }}>{species.meaning}</div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>แตะที่ต้นไม้เพื่อดูลักษณะนิสัย {player.mbtiType}</div>
        </div>
      </FadeInText>

      <FadeInText delayMs={200}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ti-text)', marginBottom: 8 }}>สถิติแยกหมวดหมู่</div>
        {stats.map((s) => (
          <div key={s.label} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
              <div>
                <span style={{ fontSize: 18 }}>{s.img ? <img src={s.img} className="icon-img" alt="" /> : s.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ti-text)', marginLeft: 4 }}>{s.label}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: s.color }}>{Math.round(s.val)}%</span>
            </div>
            <div style={{ height: 8, background: 'color-mix(in srgb, var(--ti-text) 15%, transparent)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.val}%`, background: s.color, borderRadius: 99, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
            </div>
          </div>
        ))}
      </FadeInText>
      </div>
    </div>
  )
}
