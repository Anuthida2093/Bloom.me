import { useEffect, useRef, useState } from 'react'
import { useUser } from '../../context/UserContext'
import { usePosts } from '../../context/PostContext'
import { useSocial } from '../../context/SocialContext'
import { BADGE_ICONS } from '../../config/iconAssets'
import { sendChatMessage, useChatThreads } from '../../utils/chatStore'
import PostPreviewMini from './PostPreviewMini'
import { ShareIcon } from './storyIcons'

/*============================================================================*\
  ChatThreadPage — [ใหม่ตามที่ระบุ] ห้องแชทกับเพื่อน 1 คน (แสดงแทนที่หน้าฟีด)
  ฟองข้อความของเรา = เขียวอ่อนชิดขวา · ของเพื่อน = การ์ดครีมชิดซ้าย · โพสต์ที่แชร์ = การ์ดย่อ แตะเปิดโพสต์
\*============================================================================*/
interface ChatThreadPageProps {
  friendId: string
  friendName: string
  onBack: () => void
  onOpenPost: (postId: string) => void
}

export default function ChatThreadPage({ friendId, friendName, onBack, onOpenPost }: ChatThreadPageProps) {
  const { userData } = useUser()
  const { posts } = usePosts()
  const { isFriend, requestViewProfile } = useSocial()
  const threads = useChatThreads(userData.id)
  const messages = threads[friendId]?.messages ?? []
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  const canChat = isFriend(friendId)
  const handleSend = () => {
    if (!text.trim() || !canChat) return
    sendChatMessage(userData.id, friendId, friendName, { text: text.trim() })
    setText('')
  }

  return (
    <div className="story-chat">
      <div className="story-chat__head">
        <button className="story-subpage__back" onClick={onBack} title="กลับไปหน้าแชท" aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <button className="story-chat__who" onClick={() => requestViewProfile(friendId, friendName)}>
          <div className="story-avatar story-avatar--sm">{friendName.trim().charAt(0).toUpperCase()}</div>
          <span className="story-chat__name">{friendName}</span>
        </button>
      </div>

      <div className="story-chat__messages">
        {messages.length === 0 && <div className="story-empty-state">เริ่มพูดคุยกับ {friendName} ได้เลย 🌱</div>}
        {messages.map((m) => {
          const mine = m.from === 'me'
          const post = m.postId ? posts.find((p) => p.id === m.postId) : null
          return (
            <div key={m.id} className={`story-chat__msg${mine ? ' story-chat__msg--me' : ''}`}>
              {m.postId ? (
                post
                  ? <PostPreviewMini post={post} onClick={() => onOpenPost(post.id)} />
                  : <div className="story-chat__bubble story-chat__bubble--muted">โพสต์นี้ถูกลบไปแล้ว</div>
              ) : (
                <div className="story-chat__bubble">{m.text}</div>
              )}
              <span className="story-chat__time">{new Date(m.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="story-chat__composer">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
          placeholder={canChat ? `ส่งข้อความถึง ${friendName}...` : 'แชทได้เฉพาะเพื่อน (ติดตามกันทั้งสองฝ่าย)'}
          disabled={!canChat}
        />
        <button onClick={handleSend} disabled={!text.trim() || !canChat} aria-label="ส่ง" title="ส่ง"><ShareIcon /></button>
      </div>
    </div>
  )
}
