import { useMemo } from 'react'
import { usePosts } from '../../context/PostContext'
import PostCard from './PostCard'
import { MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer } from '../../config/leaderboardData'

/*============================================================================*\
  OtherProfileView — [ใหม่ — ข้อ 9/10/11/15] หน้าโปรไฟล์ "คนอื่น" เปิดจาก list เพื่อน/
  คนกดไลค์/คนคอมเมนต์ (ผ่าน requestViewProfile ใน SocialContext ซึ่งเช็ค privacy ให้แล้ว
  ก่อนจะมาถึงหน้านี้ได้ — ถ้าปิดโปรไฟล์ไว้จะไม่มีทางมาถึงหน้านี้เลย เจอแต่ toast แทน)

  [ข้อจำกัดของ mock] ระบบนี้มีแค่บัญชีเดียวจริง (เรา) — "คนอื่น" ทั้งหมดคือ mock player
  ชุดเดียวกับ MOCK_LEADERBOARD_PLAYERS (p1-p7) จึงดึงข้อมูลต้นไม้/ระดับได้แค่ชุดนี้เท่านั้น
  ถ้า backend มีบัญชีจริงหลายคน ให้ fetch โปรไฟล์คนนั้นจาก endpoint จริงแทนการ find ในนี้
\*============================================================================*/
interface OtherProfileViewProps {
  userId: string
  username: string
  onBack: () => void
  onViewTree: (player: LeaderboardPlayer) => void
}

export default function OtherProfileView({ userId, username, onBack, onViewTree }: OtherProfileViewProps) {
  const { posts } = usePosts()
  const player = useMemo(() => MOCK_LEADERBOARD_PLAYERS.find((p) => p.id === userId), [userId])
  const publicPosts = useMemo(
    () => posts.filter((p) => p.userId === userId && !p.isAnonymous),
    [posts, userId],
  )

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack}>←</button>
        <span className="story-subpage__title">โปรไฟล์</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div className="story-avatar story-avatar--lg">{username.trim().charAt(0).toUpperCase() || '?'}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', color: 'var(--g800)' }}>{username}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {player ? (
          <button className="story-btn-outline" style={{ padding: '9px 18px', borderRadius: 999 }} onClick={() => onViewTree(player)}>
            🌳 ดูต้นไม้
          </button>
        ) : (
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลต้นไม้ของผู้ใช้นี้</span>
        )}
      </div>

      <div style={{ fontWeight: 800, fontSize: 'var(--fs-md)', marginBottom: 12 }}>โพสต์</div>
      {publicPosts.length === 0 ? (
        <div className="story-empty-state">ยังไม่มีโพสต์สาธารณะ</div>
      ) : (
        <div className="story-feed__list">
          {publicPosts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
