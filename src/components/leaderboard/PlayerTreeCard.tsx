import { STACK_PER_VISUAL_LEVEL } from '../../types'
import type { LeaderboardPlayer } from '../../config/leaderboardData'
import { QUEST_TAB_ICONS } from '../../config/iconAssets'

interface PlayerTreeCardProps {
  player: LeaderboardPlayer
}

const toBarPct = (stack: number): number => Math.min(100, (stack / (STACK_PER_VISUAL_LEVEL * 5)) * 100)

/**
 * PlayerTreeCard — แผงข้อมูลต้นไม้ของ "คนอื่น" แบบอ่านอย่างเดียว (read-only)
 * แสดงคู่กับ TreeOfLife ของเขาตรงๆ บนจอ แทนที่จะเด้งเป็น modal การ์ดลอย (แบบ V1)
 * ข้อมูลที่มีจริงจาก LeaderboardPlayer มีแค่ username/mbtiType/level/3 stack เท่านั้น
 * (ไม่มี exp/coins/streak ของผู้เล่นคนอื่น) จึงไม่ใส่ตัวเลขปลอมๆ ลงไป
 */
export default function PlayerTreeCard({ player }: PlayerTreeCardProps) {
  // [แก้ตามที่ระบุ — grep 📚/💪/🌸 พบจุดนี้] 3 หมวดตรงกับ QUEST_TAB_ICONS เป๊ะทั้ง 3 ตัว
  // (knowledge/physical/mental) มีไฟล์รูปจริงครบ จึงแทนได้ทั้งแถวโดยไม่ปนอีโมจิ/รูปในแถวเดียวกัน
  const stats = [
    { img: QUEST_TAB_ICONS.knowledge, icon: '📚', label: 'ด้านการเรียนรู้', val: toBarPct(player.knowledgeStack), color: 'var(--b500)' },
    { img: QUEST_TAB_ICONS.physical, icon: '💪', label: 'ด้านสุขภาพกาย', val: toBarPct(player.healthStack), color: 'var(--g600)' },
    { img: QUEST_TAB_ICONS.mental, icon: '🌸', label: 'ด้านสุขภาพจิต', val: toBarPct(player.emotionStack), color: 'var(--purple)' },
  ]

  return (
    <div className="card glass no-scroll player-tree-card" style={{ width: 210, flexShrink: 0, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 40 }}>🌳</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text)' }}>{player.username}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="tag" style={{ background: 'var(--g50)', color: 'var(--g700)' }}>{player.mbtiType}</span>
          <span className="tag" style={{ background: 'var(--g50)', color: 'var(--g700)' }}>🌳 Lv.{player.level}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-sub)', marginBottom: 10 }}>สถิติแยกหมวดหมู่</div>
        {stats.map((s) => (
          <div key={s.label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <div>
                <span style={{ fontSize: 13 }}>{s.img ? <img src={s.img} className="icon-img" alt="" /> : s.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginLeft: 4 }}>{s.label}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: s.color }}>{Math.round(s.val)}%</span>
            </div>
            <div style={{ height: 7, background: 'var(--n100)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.val}%`, background: s.color, borderRadius: 99, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
