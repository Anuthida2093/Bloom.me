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
import { HeartLeafIcon, CommentIcon, ShareIcon, BookmarkIcon, VerifiedBadge } from './storyIcons'
import { BADGE_ICONS } from '../../config/iconAssets'
import { useSavedPost } from '../../utils/savedPosts'

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
  [แก้ตามที่ระบุ — เลย์เอาต์แบบ IG] หัวการ์ด (รูปโปรไฟล์มีวงแหวน · ชื่อ + Verified · ⋯) → รูปเต็มกว้าง
  กรอบ 4:5 (จุดบอกรูปอยู่ใต้รูป) → แถวไอคอน (ถูกใจ คอมเมนต์ แชร์ | บันทึก ขวาสุด) → "ถูกใจโดย…"
  → แคปชั่น (ชื่อตัวหนา) → ดูความคิดเห็นทั้งหมด → เวลาโพสต์
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
  const [saved, toggleSaved] = useSavedPost(userData.id, post.id)

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

  const displayName = post.isAnonymous ? 'ไม่ระบุตัวตน' : post.authorName
  /** "ถูกใจโดย X และคนอื่นๆ อีก N คน" — ชื่อแรกเลือกเพื่อน/คนอื่นก่อนตัวเอง */
  const firstLiker = post.likedBy.find((l) => l.userId !== userData.id) ?? post.likedBy[0]
  const likeAction = () => { if (!post.likedByMe) setLikeBurst((k) => k + 1); toggleLike(post.id) }

  return (
    <div className="story-post-card story-post-card--ig">
      <div className="story-post-card__head">
        <div className={`story-avatar-ring${post.isAnonymous ? ' story-avatar-ring--anon' : ''}`}>
          <div className={`story-avatar story-avatar--clickable${post.isAnonymous ? ' story-avatar--anon' : ''}`} onClick={openAuthorProfile}>
            {post.isAnonymous ? '?' : initialOf(post.authorName)}
          </div>
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
          <div className="story-post-card__name-row">
            <button type="button" className="story-post-card__name story-post-card__name-btn" onClick={openAuthorProfile}>
              {displayName}
            </button>
            {post.authorVerified && !post.isAnonymous && <VerifiedBadge />}
            {isFriendPost && <span className="story-post-card__friend-tag">เพื่อนของคุณ</span>}
            {status === 'following' && <span className="story-post-card__friend-tag story-post-card__friend-tag--pending">กำลังติดตาม</span>}
          </div>
          {moodInfo && (
            <div className="story-post-card__subline"><span aria-hidden="true">{moodInfo.emoji}</span> รู้สึก{moodInfo.label}</div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="story-post-card__menu-btn" title="ตัวเลือกโพสต์" aria-label="ตัวเลือกโพสต์" onClick={() => setShowOwnerMenu((v) => !v)}>⋯</button>
          {showOwnerMenu && (
            <>
              <div className="story-post-card__menu-scrim" onClick={() => setShowOwnerMenu(false)} />
              <div className="story-post-card__menu">
                {isMe && <button onClick={() => { setShowOwnerMenu(false); setShowEdit(true) }}>✏️ แก้ไขโพสต์</button>}
                {!isMe && <button onClick={() => { setShowOwnerMenu(false); openAuthorProfile() }}><img src={BADGE_ICONS.profile} className="icon-img" alt="" /> ดูโปรไฟล์</button>}
                <button onClick={() => { setShowOwnerMenu(false); toggleSaved() }}>{saved ? '🔖 เลิกบันทึก' : '🔖 บันทึกโพสต์'}</button>
                <button onClick={() => { setShowOwnerMenu(false); setShowShare(true) }}><img src={BADGE_ICONS.share} className="icon-img" alt="" /> ส่งให้เพื่อน</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* โพสต์ข้อความล้วน (ไม่มีรูป) — ข้อความเป็นเนื้อหาหลักเหนือแถวไอคอน */}
      {images.length === 0 && post.content && <div className="story-post-card__content">{post.content}</div>}

      {/* รูปเต็มความกว้างการ์ด กรอบ 4:5 สม่ำเสมอ — ปัดซ้าย-ขวาแบบ snap ดูหลายรูป จุดบอกรูปอยู่ใต้รูป */}
      <PostImageCarousel images={images} onDoubleTap={() => { if (!post.likedByMe) likeAction() }} />

      <div className="story-post-card__actions story-post-card__actions--ig">
        <button
          className={`story-ig-btn story-ig-btn--like${post.likedByMe ? ' is-active' : ''}`}
          onClick={likeAction}
          aria-pressed={post.likedByMe}
          aria-label={post.likedByMe ? 'เลิกถูกใจ' : 'ถูกใจ'}
          title={post.likedByMe ? 'เลิกถูกใจ' : 'ถูกใจ'}
        >
          <HeartLeafIcon filled={post.likedByMe} key={likeBurst} />
          {likeBurst > 0 && post.likedByMe && <span key={`b${likeBurst}`} className="story-action-pill__burst" aria-hidden="true" />}
        </button>
        <button className="story-ig-btn" onClick={() => setShowComments(true)} aria-label="คอมเมนต์" title="คอมเมนต์">
          <CommentIcon />
        </button>
        <button className="story-ig-btn" onClick={() => setShowShare(true)} aria-label="ส่งให้เพื่อน" title="ส่งให้เพื่อน">
          <ShareIcon />
        </button>
        <button
          className={`story-ig-btn story-ig-btn--save${saved ? ' is-active' : ''}`}
          onClick={toggleSaved}
          aria-pressed={saved}
          aria-label={saved ? 'เลิกบันทึก' : 'บันทึกโพสต์'}
          title={saved ? 'เลิกบันทึก' : 'บันทึก'}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>

      {post.likeCount > 0 && (
        <button type="button" className="story-post-card__likes" onClick={() => setShowLikers(true)} title="ดูคนที่ถูกใจ">
          {post.likeCount === 1 && firstLiker
            ? <>ถูกใจโดย <b>{firstLiker.username}</b></>
            : firstLiker
              ? <>ถูกใจโดย <b>{firstLiker.username}</b> และคนอื่นๆ อีก <b>{(post.likeCount - 1).toLocaleString()}</b> คน</>
              : <>ถูกใจ <b>{post.likeCount.toLocaleString()}</b> คน</>}
        </button>
      )}

      {images.length > 0 && post.content && (
        <div className="story-post-card__caption">
          <b className="story-post-card__caption-name">{displayName}</b> {post.content}
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="story-post-card__tags">
          {post.tags.map((tag) => <span key={tag} className="story-tag">#{tag}</span>)}
        </div>
      )}

      {post.comments.length > 0 && (
        <button type="button" className="story-post-card__view-comments" onClick={() => setShowComments(true)}>
          ดูความคิดเห็นทั้งหมด {post.comments.length} รายการ
        </button>
      )}

      <div className="story-post-card__timestamp">{timeAgo(post.createdAt)}</div>

      {showComments && <CommentsModal post={post} onClose={() => setShowComments(false)} />}
      {showLikers && <LikersModal post={post} onClose={() => setShowLikers(false)} />}
      {showShare && <SharePostModal post={post} onClose={() => setShowShare(false)} />}
      {showEdit && <EditPostModal post={post} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
