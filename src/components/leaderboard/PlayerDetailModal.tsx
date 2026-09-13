import { MBTI_TREE_THEME } from '../../types'
import type { LeaderboardPlayer } from '../../config/leaderboardData'
import MiniTree from '../tree/MiniTree'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface PlayerDetailModalProps {
  /** null = ยังไม่มีใครถูกเลือก — component คืน null ทันที ไม่ render อะไรเลย (ดูใน Dashboard.tsx:
   *  ใช้ `{selectedPlayer && <PlayerDetailModal .../>}` ก็ได้ผลเหมือนกัน แต่เช็คซ้ำในนี้ด้วย
   *  กันเผื่อมี consumer อื่นเรนเดอร์โดยไม่เช็ค null ก่อน) */
  player: LeaderboardPlayer | null
  onClose: () => void
}

interface StatRow {
  icon: string
  label: string
  value: number
  color: string
}

export default function PlayerDetailModal({ player, onClose }: PlayerDetailModalProps) {
  useEscapeKey(onClose, !!player)
  if (!player) return null

  const theme = MBTI_TREE_THEME[player.mbtiType] ?? MBTI_TREE_THEME.INFP

  const stats: StatRow[] = [
    { icon: '📚', label: 'ความรู้', value: player.knowledgeStack, color: 'var(--b500)' },
    { icon: '💪', label: 'สุขภาพกาย', value: player.healthStack, color: 'var(--g600)' },
    { icon: '🌸', label: 'สุขภาพจิต', value: player.emotionStack, color: 'var(--purple)' },
  ]
  // สเกลแท่งกราฟแบบ "เทียบกับค่าสูงสุดของผู้เล่นคนนี้เอง" ให้เห็นจุดเด่นชัดเจน (แท่งที่สูง
  // ที่สุดจะเต็ม 100% เสมอ) ไม่ใช่การคำนวณ level ใดๆ ของ backend — ใช้แค่ "แสดงผล" เท่านั้น
  const maxStat = Math.max(...stats.map((s) => s.value), 1)

  return (
    // backdrop ซ้อนทับ Leaderboard เดิมได้เลย (Leaderboard ใช้ zIndex 200 อยู่แล้ว จึงต้อง
    // สูงกว่านั้น) — Dashboard.tsx เป็นคนคุมว่าจะเปิดพร้อมกันหรือปิด Leaderboard ก่อนก็ได้
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--glass-b-55)',
        backdropFilter: 'blur(8px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="player-detail-modal-card"
        style={{
          background: 'var(--fixed-white)',
          borderRadius: 28,
          width: '100%',
          maxWidth: 420,
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 24px 60px var(--glass-b-28), 0 0 0 1px ${theme.accent}33`,
        }}
      >
        {/* Header ไล่สีตามธีม MBTI ของผู้เล่นคนนั้นๆ — คนละสีกันทุกคนตาม mbtiType จริง
            ปุ่มปิดอยู่เป็น flex item แถวบนสุดของ header เอง (แบบเดียวกับ Leaderboard.tsx)
            ไม่ใช้ position:fixed/absolute เพราะการ์ดนี้ scroll ได้ (overflowY:auto) — ปุ่มแบบ
            fixed/absolute จะค้างอยู่ตำแหน่งเดิมตอนเลื่อนเนื้อหา หลุดออกนอกกรอบการ์ดได้
            ส่วน borderTopLeftRadius/borderTopRightRadius ทำให้มุมบนโค้งพอดีชนขอบการ์ดจริง
            (หลักการเดียวกับที่แก้ขอบแหว่งใน Leaderboard.tsx — ไม่พึ่ง overflow:hidden ของ
            container แม่ แต่ให้ตัวลูกที่ชนขอบปัดมุมของตัวเอง) */}
        <div
          style={{
            padding: '20px 24px 24px',
            background: `linear-gradient(160deg, ${theme.accent}, ${theme.trunk})`,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              title="ปิด"
              style={{
                background: 'var(--glass-w-18)',
                border: 'none',
                borderRadius: 99,
                width: 32,
                height: 32,
                color: 'var(--fixed-white)',
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: -8 }}>
            <div className="player-detail-modal-tree-pop">
              <MiniTree theme={theme} size={110} full />
            </div>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 24, color: 'var(--fixed-white)', marginTop: 4 }}>{player.username}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <span className="tag" style={{ background: 'var(--glass-w-22)', color: 'var(--fixed-white)' }}>{player.mbtiType}</span>
              <span className="tag" style={{ background: 'var(--glass-w-22)', color: 'var(--fixed-white)' }}>🌳 เลเวล {player.level}</span>
            </div>
          </div>
        </div>

        {/* สถิติแยกหมวดหมู่ */}
        <div style={{ padding: '24px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-sub)', marginBottom: 14 }}>สถิติแยกหมวดหมู่</div>
          {stats.map((s, i) => (
            <div key={s.label} className="player-detail-modal-stat-row" style={{ marginBottom: 16, animationDelay: `${i * 70}ms` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{s.icon} {s.label}</span>
                <span style={{ fontFamily: 'Fredoka One', fontSize: 15, color: s.color }}>{s.value.toLocaleString()}</span>
              </div>
              <div style={{ height: 9, background: 'var(--n100)', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  className="player-detail-modal-stat-bar"
                  style={{ height: '100%', width: `${(s.value / maxStat) * 100}%`, background: s.color, borderRadius: 99 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes playerDetailModalPop {
          from { opacity: 0; transform: scale(.9) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .player-detail-modal-card { animation: playerDetailModalPop .3s cubic-bezier(.22,1,.36,1) both; }

        @keyframes playerDetailModalTreePop {
          0%   { opacity: 0; transform: scale(.6); }
          70%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        .player-detail-modal-tree-pop { display: inline-block; animation: playerDetailModalTreePop .5s .1s cubic-bezier(.22,1,.36,1) both; }

        @keyframes playerDetailModalStatFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .player-detail-modal-stat-row { animation: playerDetailModalStatFadeUp .35s cubic-bezier(.22,1,.36,1) both; }

        @keyframes playerDetailModalBarFill { from { width: 0; } }
        .player-detail-modal-stat-bar { animation: playerDetailModalBarFill .7s .2s cubic-bezier(.22,1,.36,1) both; }

        @media (prefers-reduced-motion: reduce) {
          .player-detail-modal-card, .player-detail-modal-tree-pop,
          .player-detail-modal-stat-row, .player-detail-modal-stat-bar {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}