import { useState } from 'react'
import type { PostData } from '../../types'
import { usePosts } from '../../context/PostContext'
import { useSocial } from '../../context/SocialContext'
import { useUser } from '../../context/UserContext'
import CommentsModal from './CommentsModal'
import LikersModal from './LikersModal'
import SharePostModal from './SharePostModal'
import EditPostModal from './EditPostModal'

/*============================================================================*\
  PostCard — [แก้รอบนี้] การ์ดโพสต์ที่ใช้ซ้ำทุกที่ (ฟีดหลัก/โปรไฟล์/โพสต์ปิดโปรไฟล์/
  ที่ถูกใจ/หน้าโปรไฟล์คนอื่น) — เรียก usePosts()/useSocial()/useUser() ตรงๆ เหมือนเดิม
  ────────────────────────────────────────────────────────────────────────────
  [ข้อ 12] ตัดปุ่มรีโพสต์ออก เหลือ 3 ไอคอนหลัก: ไลค์/คอมเมนต์/แชร์ ขยายพื้นที่กดเป็น
  อย่างน้อย 44x44px ทุกปุ่ม (ดู .story-action-btn ใน Story.css)
  [ข้อ 9/10] คอมเมนต์/ไลค์ เปิดเป็น popup แยก ไม่ใช่ inline expand แบบเดิม
  [ข้อ 13] ปุ่มแชร์เปิด popup เลือกเพื่อนในแอป ไม่ใช้ navigator.share (อันนั้นเฉพาะปุ่มแชร์
  ต้นไม้ที่ Dashboard หลักเท่านั้น)
  [ข้อ 6] โพสต์ของตัวเอง (post.userId === ของเรา) มีปุ่ม ⋯ เปิดแก้ไขได้
  [ข้อ 8] รูปในโพสต์ใช้ width:100%;height:auto เสมอ (ดู Story.css .story-post-card__image)
  ไม่ครอบ/ตัด aspect ratio ไม่ว่ารูปจะเป็นแนวตั้ง/แนวนอน/สัดส่วนไหนก็ตาม
\*============================================================================*/

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  const days = Math.floor(hours / 24)
  return `${days} วันที่แล้ว`
}

export default function PostCard({ post }: { post: PostData }) {
  const { toggleLike } = usePosts()
  const { isFollowing, toggleFollow } = useSocial()
  const { userData } = useUser()

  const [showComments, setShowComments] = useState(false)
  const [showLikers, setShowLikers] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showOwnerMenu, setShowOwnerMenu] = useState(false)

  const isMe = post.userId === userData.id
  const showFollowBadge = !post.isAnonymous && !isMe && !isFollowing(post.userId)

  return (
    <div className="story-post-card">
      <div className="story-post-card__head">
        <div className={`story-avatar${post.isAnonymous ? ' story-avatar--anon' : ''}`}>
          {post.isAnonymous ? '?' : initialOf(post.authorName)}
          {showFollowBadge && (
            <button
              className="story-avatar__follow-btn"
              title={`ติดตาม ${post.authorName}`}
              onClick={() => toggleFollow(post.userId)}
            >
              +
            </button>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="story-post-card__name">{post.isAnonymous ? 'ไม่ระบุตัวตน' : post.authorName}</div>
          <div className="story-post-card__time">{timeAgo(post.createdAt)}</div>
        </div>
        {isMe && (
          <div style={{ position: 'relative' }}>
            <button className="story-post-card__menu-btn" title="ตัวเลือกโพสต์" onClick={() => setShowOwnerMenu((v) => !v)}>⋯</button>
            {showOwnerMenu && (
              <>
                <div className="story-post-card__menu-scrim" onClick={() => setShowOwnerMenu(false)} />
                <div className="story-post-card__menu">
                  <button onClick={() => { setShowOwnerMenu(false); setShowEdit(true) }}>✏️ แก้ไขโพสต์</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="story-post-card__content">{post.content}</div>

      {post.imageUrl && post.imageUrl.startsWith('data:') && (
        <img className="story-post-card__image" src={post.imageUrl} alt="" />
      )}
      {post.imageUrl && !post.imageUrl.startsWith('data:') && (
        <div className="story-post-card__image-placeholder">🖼️</div>
      )}

      <div className="story-post-card__actions">
        <button
          className={`story-action-btn story-action-btn--like${post.likedByMe ? ' story-action-btn--active' : ''}`}
          onClick={() => toggleLike(post.id)}
        >
          {post.likedByMe ? '❤️' : '🤍'}
        </button>
        {/* [ข้อ 10] ตัวเลขแยกจากไอคอนหัวใจ — กดตัวเลขเปิด popup รายชื่อคนไลค์ กดไอคอนคือ toggle ไลค์ของเรา */}
        <button className="story-action-btn story-action-btn--count" onClick={() => setShowLikers(true)} disabled={post.likeCount === 0}>
          {post.likeCount}
        </button>
        <button className="story-action-btn story-action-btn--comment" onClick={() => setShowComments(true)}>
          💬 {post.comments.length}
        </button>
        <button className="story-action-btn story-action-btn--share" onClick={() => setShowShare(true)}>➤</button>
      </div>

      {showComments && <CommentsModal post={post} onClose={() => setShowComments(false)} />}
      {showLikers && <LikersModal post={post} onClose={() => setShowLikers(false)} />}
      {showShare && <SharePostModal post={post} onClose={() => setShowShare(false)} />}
      {showEdit && <EditPostModal post={post} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
