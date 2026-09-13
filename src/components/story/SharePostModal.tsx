import { useState } from 'react'
import type { PostData } from '../../types'
import { useSocial } from '../../context/SocialContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'

/*============================================================================*\
  SharePostModal — [ใหม่ — ข้อ 13] ปุ่มแชร์ในโพสต์ (คนละปุ่มกับปุ่มแชร์ต้นไม้ที่ Dashboard
  หลัก) เปิด popup เลือก "เพื่อน" (คนที่เราติดตามอยู่) แล้วส่งเป็น ActivityItem ให้เห็นใน
  หน้ากิจกรรม — ไม่มีการเปิด native share sheet ของเบราว์เซอร์/OS ในปุ่มนี้เด็ดขาดตามที่ระบุ
\*============================================================================*/
export default function SharePostModal({ post, onClose }: { post: PostData; onClose: () => void }) {
  useEscapeKey(onClose)
  const { following, sharePostToFriend } = useSocial()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const friends = MOCK_LEADERBOARD_PLAYERS.filter((p) => following.includes(p.id))

  const handleSend = (friendId: string) => {
    sharePostToFriend(post.id, friendId)
    setSentTo(friendId)
    window.setTimeout(onClose, 700)
  }

  return (
    <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="story-modal-card">
        <div className="story-modal-card__title">แชร์ให้เพื่อน</div>
        {friends.length === 0 ? (
          <div className="story-empty-state">คุณยังไม่ได้ติดตามใครเลย — ไปที่หน้า "เพื่อน" เพื่อติดตามคนอื่นก่อน</div>
        ) : (
          <div className="story-comments-list">
            {friends.map((friend) => (
              <div key={friend.id} className="story-friend-row">
                <div className="story-avatar story-avatar--sm">{friend.username.trim().charAt(0).toUpperCase()}</div>
                <span className="story-friend-row__name">{friend.username}</span>
                <button className="story-follow-btn" onClick={() => handleSend(friend.id)}>
                  {sentTo === friend.id ? 'ส่งแล้ว ✓' : 'ส่ง'}
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="story-btn-ghost" style={{ width: '100%', padding: '10px 0', borderRadius: 999, marginTop: 10 }} onClick={onClose}>ปิด</button>
      </div>
    </div>
  )
}
