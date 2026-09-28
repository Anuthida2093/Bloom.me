import { useMemo } from 'react'
import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'
import { useSocial } from '../../context/SocialContext'
import { useUser } from '../../context/UserContext'
import { usePosts } from '../../context/PostContext'
import { BADGE_ICONS } from '../../config/iconAssets'
import { lastMessageAt, useChatThreads } from '../../utils/chatStore'

/*============================================================================*\
  ChatListPage — [ใหม่ตามที่ระบุ] เมนู "แชท" (ต่อจาก "เพื่อน") แสดงแทนที่หน้าฟีด
  รายชื่อเพื่อนที่เคยสนทนาด้วย (ล่าสุดขึ้นก่อน) + ข้อความล่าสุด · แตะเพื่อเปิดห้องแชท
  ด้านล่าง: เพื่อนที่ยังไม่เคยแชท แตะเพื่อเริ่มสนทนา
\*============================================================================*/
function timeShort(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

interface ChatListPageProps {
  onBack: () => void
  onOpenChat: (friendId: string, friendName: string) => void
}

export default function ChatListPage({ onBack, onOpenChat }: ChatListPageProps) {
  const { userData } = useUser()
  const { friends } = useSocial()
  const { posts } = usePosts()
  const threads = useChatThreads(userData.id)

  const conversations = useMemo(
    () => Object.values(threads).filter((t) => t.messages.length > 0).sort((a, b) => lastMessageAt(b).localeCompare(lastMessageAt(a))),
    [threads],
  )
  const newChatFriends = MOCK_LEADERBOARD_PLAYERS.filter((p) => friends.includes(p.id) && !threads[p.id]?.messages.length)

  const preview = (friendId: string) => {
    const last = threads[friendId]?.messages.at(-1)
    if (!last) return ''
    const prefix = last.from === 'me' ? 'คุณ: ' : ''
    if (last.postId) {
      const post = posts.find((p) => p.id === last.postId)
      return `${prefix}ส่งโพสต์${post && !post.isAnonymous ? `ของ ${post.authorName}` : ''}`
    }
    return prefix + (last.text ?? '')
  }

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack} title="กลับ" aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <span className="story-subpage__title">แชท</span>
      </div>

      {conversations.length === 0 && (
        <div className="story-empty-state story-empty-state--compact">ยังไม่มีการสนทนา — ส่งโพสต์ให้เพื่อน หรือเลือกเพื่อนด้านล่างเพื่อเริ่มแชท</div>
      )}

      <div className="story-chat-list">
        {conversations.map((t) => (
          <button key={t.friendId} className="story-chat-list__row" onClick={() => onOpenChat(t.friendId, t.friendName)}>
            <div className="story-avatar story-avatar--sm">{t.friendName.trim().charAt(0).toUpperCase()}</div>
            <span className="story-chat-list__body">
              <span className="story-chat-list__name">{t.friendName}</span>
              <span className="story-chat-list__preview">{preview(t.friendId)}</span>
            </span>
            <span className="story-chat-list__time">{timeShort(lastMessageAt(t))}</span>
          </button>
        ))}
      </div>

      {newChatFriends.length > 0 && (
        <>
          <div className="story-activity-group-label">เริ่มแชทกับเพื่อน</div>
          <div className="story-chat-new">
            {newChatFriends.map((p) => (
              <button key={p.id} className="story-chat-new__item" onClick={() => onOpenChat(p.id, p.username)}>
                <div className="story-avatar">{p.username.trim().charAt(0).toUpperCase()}</div>
                <span>{p.username}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {friends.length === 0 && (
        <div className="story-empty-state story-empty-state--compact">แชทได้เฉพาะเพื่อน (ติดตามกันทั้งสองฝ่าย)</div>
      )}
    </div>
  )
}
