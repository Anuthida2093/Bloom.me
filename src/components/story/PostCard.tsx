import { useState } from 'react'
import type { PostData } from '../../types'
import { usePosts } from '../../context/PostContext'
import { useSocial } from '../../context/SocialContext'
import { useUser } from '../../context/UserContext'
import CommentsModal from './CommentsModal'
import LikersModal from './LikersModal'
import SharePostModal from './SharePostModal'
import EditPostModal from './EditPostModal'
import { MOOD_TYPE_INFO } from '../../config/moodTypes'
import { postImages } from '../../types'
import PostImageCarousel from './PostImageCarousel'
import { HeartLeafIcon, CommentIcon, ShareIcon } from './storyIcons'

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
  const { toggleFollow, followStatus, requestViewProfile, notifyPrivateProfile } = useSocial()
  const { userData } = useUser()

  const [showComments, setShowComments] = useState(false)
  const [showLikers, setShowLikers] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showOwnerMenu, setShowOwnerMenu] = useState(false)

  const isMe = post.userId === userData.id
  /* [แก้ตามที่ระบุ] เพื่อน = ติดตามกันทั้งสองฝ่าย · ติดตามแล้วแต่เขายังไม่ติดตามกลับ = "กำลังติดตาม" */
  const status = !post.isAnonymous && !isMe ? followStatus(post.userId) : null
  const showFollowBadge = status === 'none' || status === 'followsYou'
  const isFriendPost = status === 'friend'
  const [likeBurst, setLikeBurst] = useState(0)
  const images = postImages(post)
  const moodInfo = post.mood ? MOOD_TYPE_INFO[post.mood] : null

  /** [แก้ตามที่ระบุ] กดชื่อ/รูปผู้โพสต์ → เปิดโปรไฟล์เขา — ถ้าผู้โพสต์ปิดโปรไฟล์ (หรือโพสต์แบบ
   *  ไม่ระบุตัวตน) ขึ้นป็อปอัพแจ้งแทน (requestViewProfile เช็คสิทธิ์ให้เอง) */
  const openAuthorProfile = () => {
    if (post.isAnonymous && !isMe) { notifyPrivateProfile(); return }
    requestViewProfile(post.userId, post.authorName)
  }

  return (
    <div className="story-post-card">
      <div className="story-post-card__head">
        <div className={`story-avatar story-avatar--clickable${post.isAnonymous ? ' story-avatar--anon' : ''}`} onClick={openAuthorProfile}>
          {post.isAnonymous ? '?' : initialOf(post.authorName)}
          {showFollowBadge && (
            <button
              className="story-avatar__follow-btn"
              title={`ติดตาม ${post.authorName}`}
              onClick={(e) => { e.stopPropagation(); toggleFollow(post.userId) }}
            >
              +
            </button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button type="button" className="story-post-card__name story-post-card__name-btn" onClick={openAuthorProfile}>
            {post.isAnonymous ? 'ไม่ระบุตัวตน' : post.authorName}
          </button>
          <div className="story-post-card__time">
            {timeAgo(post.createdAt)}
            {isFriendPost && <span className="story-post-card__friend-tag">เพื่อนของคุณ</span>}
            {status === 'following' && <span className="story-post-card__friend-tag story-post-card__friend-tag--pending">กำลังติดตาม</span>}
          </div>
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

      {moodInfo && (
        <div className="story-post-card__mood">
          <span aria-hidden="true">{moodInfo.emoji}</span> รู้สึก{moodInfo.label}
        </div>
      )}
      {post.content && <div className="story-post-card__content">{post.content}</div>}

      {/* [แก้ตามที่ระบุ] รูปได้หลายรูป (สูงสุด 20) เลื่อนซ้าย-ขวาดูได้ — รูปเต็มขอบการ์ด ไม่ตัดรูป */}
      <PostImageCarousel images={images} />

      {post.tags && post.tags.length > 0 && (
        <div className="story-post-card__tags">
          {post.tags.map((tag) => <span key={tag} className="story-tag">#{tag}</span>)}
        </div>
      )}

      {/* [แก้ตามที่ระบุ] ปุ่มถูกใจ/คอมเมนต์/ส่งให้เพื่อน — ป้ายเม็ดยาวแบบกระดานจัดอันดับ ไอคอนวาดเอง
          หัวใจมีใบไม้งอกเป็นเอกลักษณ์ของแอป กดถูกใจแล้วหัวใจเด้ง + ประกายกระจาย */}
      <div className="story-post-card__actions">
        <div className={`story-action-pill story-action-pill--like${post.likedByMe ? ' is-active' : ''}`}>
          <button
            className="story-action-pill__icon-btn"
            onClick={() => { if (!post.likedByMe) setLikeBurst((k) => k + 1); toggleLike(post.id) }}
            aria-pressed={post.likedByMe}
            aria-label={post.likedByMe ? 'เลิกถูกใจ' : 'ถูกใจ'}
            title={post.likedByMe ? 'เลิกถูกใจ' : 'ถูกใจ'}
          >
            <HeartLeafIcon filled={post.likedByMe} key={likeBurst} />
            {likeBurst > 0 && post.likedByMe && <span key={`b${likeBurst}`} className="story-action-pill__burst" aria-hidden="true" />}
          </button>
          {/* [ข้อ 10] กดตัวเลขเปิดรายชื่อคนถูกใจ · กดหัวใจ = ถูกใจ/เลิกถูกใจ */}
          <button className="story-action-pill__count" onClick={() => setShowLikers(true)} disabled={post.likeCount === 0} title="ดูคนที่ถูกใจ">
            {post.likeCount}
          </button>
        </div>
        <button className="story-action-pill story-action-pill--comment" onClick={() => setShowComments(true)} title="คอมเมนต์">
          <CommentIcon />
          <span className="story-action-pill__label">{post.comments.length}</span>
        </button>
        <button className="story-action-pill story-action-pill--share" onClick={() => setShowShare(true)} title="ส่งให้เพื่อน">
          <ShareIcon />
          <span className="story-action-pill__label">ส่ง</span>
        </button>
      </div>

      {showComments && <CommentsModal post={post} onClose={() => setShowComments(false)} />}
      {showLikers && <LikersModal post={post} onClose={() => setShowLikers(false)} />}
      {showShare && <SharePostModal post={post} onClose={() => setShowShare(false)} />}
      {showEdit && <EditPostModal post={post} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
