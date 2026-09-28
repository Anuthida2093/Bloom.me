import { useState } from 'react'
import type { PostData } from '../../types'
import { useSocial } from '../../context/SocialContext'
import { useUser } from '../../context/UserContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'
import { sendChatMessage } from '../../utils/chatStore'
import PostPreviewMini from './PostPreviewMini'

/*============================================================================*\
  SharePostModal — ปุ่ม "ส่ง" ในโพสต์ → เลือกเพื่อนแล้วส่งโพสต์เข้าแชทของเพื่อนคนนั้น
  [แก้ตามที่ระบุ] ส่งได้เฉพาะ "เพื่อน" (ติดตามกันทั้งสองฝ่าย) · โพสต์ที่ส่งไปอยู่ในแชท (เมนู "แชท")
  ยังบันทึกลงหน้ากิจกรรมเหมือนเดิมด้วย (sharePostToFriend)
\*============================================================================*/
export default function SharePostModal({ post, onClose }: { post: PostData; onClose: () => void }) {
  useEscapeKey(onClose)
  const { friends, sharePostToFriend } = useSocial()
  const { userData } = useUser()
  const [sentTo, setSentTo] = useState<string[]>([])
  const [note, setNote] = useState('')

  const friendPlayers = MOCK_LEADERBOARD_PLAYERS.filter((p) => friends.includes(p.id))

  const handleSend = (friendId: string, friendName: string) => {
    if (sentTo.includes(friendId)) return
    sendChatMessage(userData.id, friendId, friendName, { postId: post.id })
    if (note.trim()) sendChatMessage(userData.id, friendId, friendName, { text: note.trim() })
    sharePostToFriend(post.id, friendId)
    setSentTo((prev) => [...prev, friendId])
  }

  return (
    <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="story-modal-card story-modal-card--post">
        <div className="story-modal-card__title">ส่งให้เพื่อน</div>
        <PostPreviewMini post={post} />
        {friendPlayers.length === 0 ? (
          <div className="story-empty-state">ยังไม่มีเพื่อน — เพื่อนคือคนที่ติดตามกันทั้งสองฝ่าย ลองติดตามคนที่ติดตามคุณอยู่ดูสิ</div>
        ) : (
          <>
            <input
              className="story-share-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เขียนข้อความถึงเพื่อน (ไม่บังคับ)"
            />
            <div className="story-comments-list">
              {friendPlayers.map((friend) => {
                const sent = sentTo.includes(friend.id)
                return (
                  <div key={friend.id} className="story-friend-row">
                    <div className="story-avatar story-avatar--sm">{friend.username.trim().charAt(0).toUpperCase()}</div>
                    <span className="story-friend-row__name">{friend.username}</span>
                    <button className={`story-follow-btn${sent ? ' story-follow-btn--following' : ''}`} onClick={() => handleSend(friend.id, friend.username)} disabled={sent}>
                      {sent ? 'ส่งแล้ว ✓' : 'ส่ง'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
        <button className="story-btn-ghost" style={{ width: '100%', padding: '10px 0', borderRadius: 999, marginTop: 10 }} onClick={onClose}>ปิด</button>
      </div>
    </div>
  )
}
