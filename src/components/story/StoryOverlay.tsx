import { useMemo, useState } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { usePosts } from '../../context/PostContext'
import { useUser } from '../../context/UserContext'
import { useSocial } from '../../context/SocialContext'
import type { LeaderboardPlayer } from '../../config/leaderboardData'
import GameAlert from '../ui/GameAlert'
import StoryHeader from './StoryHeader'
import StoryFeed from './StoryFeed'
import StorySidebar, { type StoryView } from './StorySidebar'
import ActivityPanel from './ActivityPanel'
import ComposeStoryModal from './ComposeStoryModal'
import StoryProfilePage from './StoryProfilePage'
import OtherProfileView from './OtherProfileView'
import FriendsListPanel from './FriendsListPanel'
import ContentSettingsPage from './ContentSettingsPage'
import PostListPage from './PostListPage'
import PostCard from './PostCard'
import './Story.css'

/*============================================================================*\
  StoryOverlay — [แก้รอบนี้] หน้าหลักของฟีเจอร์ "สตอรี่"
  ────────────────────────────────────────────────────────────────────────────
  เปิดจากปุ่ม 📖 มุมซ้ายล่างของ Dashboard → เริ่มที่ฟีดหลักเสมอ (view='feed') แล้วนำทางไป
  หน้าอื่นภายในตัวเอง (search อยู่ที่ sidebar เสมอ, กิจกรรม/เพื่อน/โปรไฟล์ ฯลฯ เป็น view
  เต็มจอแบบเดียวกันหมดแล้ว — ข้อ 14 เลิกทำกิจกรรมเป็น popup ลอย)

  [แก้ข้อ 4] เอาปุ่ม Home ลอยกลางจอออกแล้ว ปิดผ่านปุ่ม ✕ มาตรฐานใน StoryHeader แทน — กลับ
  หน้าแรกจริงๆ ใช้ปุ่ม "หน้าแรก" ของ ActionMenuBar หลักที่ลอยทับ Story อยู่แล้ว (z-index สูง
  กว่า) ไม่ต้องมี logic ซ้ำในนี้ — onGoHome prop เดิมจึงถูกตัดออก

  [ใหม่ — ข้อ 15] onViewTree/onEditProfile รับมาจาก Dashboard.tsx ตรงๆ (เหมือน onClose)
  เพื่อ reuse viewingPlayer pattern + หน้าตั้งค่าโปรไฟล์กลางที่มีอยู่แล้ว ไม่สร้างซ้ำในนี้
\*============================================================================*/

interface StoryOverlayProps {
  onClose: () => void
  onViewTree: (player: LeaderboardPlayer | null) => void
  onEditProfile: () => void
  /** [เพิ่มตามที่ระบุ] เปิด Story ไปที่โพสต์นี้ทันที (กดแจ้งเตือนไลค์/คอมเมนต์/แชร์) —
   *  โชว์เป็น popup เล็กลอยทับฟีด reuse pattern เดียวกับที่ ActivityPanel.tsx ใช้เปิด
   *  โพสต์จากรายการกิจกรรม (openedPostId + story-modal-backdrop + PostCard) แค่ยกขึ้นมา
   *  ไว้ระดับ StoryOverlay เพื่อให้เปิดได้ทันทีตั้งแต่ mount โดยไม่ต้องผ่านหน้ากิจกรรมก่อน */
  initialPostId?: string | null
}

export default function StoryOverlay({ onClose, onViewTree, onEditProfile, initialPostId = null }: StoryOverlayProps) {
  useLockBodyScroll()

  const { posts } = usePosts()
  const { userData } = useUser()
  // [แก้] ค้นหาต้องอยู่ที่ SocialContext ตัวเดียว (ไม่ใช่ local state ในนี้) เพราะ
  // searchResults/isSearching ผูก useQuery ไว้กับ searchQuery ของ context นั้นโดยตรง —
  // ถ้าใช้ local state คนละตัวกัน พิมพ์คำค้นแล้ว sidebar จะไม่มีวันเห็นผลลัพธ์เลย
  const {
    searchQuery, setSearchQuery,
    viewProfileTarget, clearViewProfileTarget, showPrivacyToast, dismissPrivacyToast,
  } = useSocial()

  // [แก้บั๊กจากการทดสอบจริง] viewProfileTarget อยู่ใน SocialContext (คงอยู่ข้าม mount/unmount
  // ของ StoryOverlay) — ถ้าปิด Story ระหว่างเปิดดูโปรไฟล์คนอื่นค้างอยู่ (เช่นกด "ดูต้นไม้" ซึ่ง
  // ปิด Story ทิ้งเลย) โดยไม่ได้กด "←" ย้อนกลับก่อน ค่านี้จะค้างและเปิด Story รอบถัดไปจะเจอ
  // หน้าโปรไฟล์เดิมทันที กด sidebar อะไรก็ไม่ขยับ (เงื่อนไข viewProfileTarget เช็คก่อน view
  // เสมอ) ต้อง clear ทุกครั้งที่ปิด Story จริงๆ ด้วย ไม่ใช่แค่ตอนกดย้อนกลับในหน้าโปรไฟล์
  const handleClose = () => {
    clearViewProfileTarget()
    onClose()
  }
  useEscapeKey(handleClose)

  const [view, setView] = useState<'feed' | StoryView>('feed')
  const [showCompose, setShowCompose] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [openedPostId, setOpenedPostId] = useState(initialPostId)
  const openedPost = openedPostId ? posts.find((p) => p.id === openedPostId) ?? null : null

  const anonymousPosts = useMemo(
    () => posts.filter((p) => p.userId === userData.id && p.isAnonymous),
    [posts, userData.id],
  )
  const likedPosts = useMemo(() => posts.filter((p) => p.likedByMe), [posts])

  // เหตุผลเดียวกับ handleClose ด้านบน — นำทางผ่าน sidebar จริงๆ ก็ถือว่าผู้ใช้ตั้งใจออกจาก
  // โหมด "ดูโปรไฟล์คนอื่น" แล้วเช่นกัน ต้อง clear ก่อนเปลี่ยน view ทุกครั้ง
  const handleNavigate = (next: StoryView) => {
    clearViewProfileTarget()
    setView(next)
    setMobileSidebarOpen(false)
  }
  const backToFeed = () => setView('feed')

  // "ดูต้นไม้" ปิด Story ทิ้งไปเลย (เหมือน handleClose) — clear เหตุผลเดียวกันเป๊ะ
  const handleViewTree = (player: LeaderboardPlayer | null) => {
    clearViewProfileTarget()
    onViewTree(player)
  }

  return (
    <div className="story-overlay">
      <StoryHeader
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        onOpenActivity={() => handleNavigate('activity')}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        onClose={handleClose}
      />

      <div className="story-body">
        {viewProfileTarget ? (
          viewProfileTarget.userId === userData.id ? (
            <StoryProfilePage onBack={clearViewProfileTarget} onEditProfile={onEditProfile} onViewTree={() => handleViewTree(null)} />
          ) : (
            <OtherProfileView
              userId={viewProfileTarget.userId}
              username={viewProfileTarget.username}
              onBack={clearViewProfileTarget}
              onViewTree={handleViewTree}
            />
          )
        ) : (
          <>
            {view === 'feed' && <StoryFeed onCompose={() => setShowCompose(true)} />}
            {view === 'profile' && <StoryProfilePage onBack={backToFeed} onEditProfile={onEditProfile} onViewTree={() => handleViewTree(null)} />}
            {view === 'friends' && <FriendsListPanel onBack={backToFeed} />}
            {view === 'activity' && <ActivityPanel onBack={backToFeed} />}
            {view === 'contentSettings' && <ContentSettingsPage onBack={backToFeed} />}
            {view === 'anonymousPosts' && (
              <PostListPage title="โพสต์ปิดโปรไฟล์" posts={anonymousPosts} emptyMessage="ยังไม่มีโพสต์แบบไม่ระบุตัวตน" onBack={backToFeed} />
            )}
            {view === 'likedPosts' && (
              <PostListPage title="ที่ถูกใจ" posts={likedPosts} emptyMessage="ยังไม่ได้กดถูกใจโพสต์ไหนเลย" onBack={backToFeed} />
            )}
          </>
        )}

        {mobileSidebarOpen && <div className="story-sidebar__scrim" onClick={() => setMobileSidebarOpen(false)} />}
        <div className={`story-sidebar${mobileSidebarOpen ? ' story-sidebar--open' : ''}`}>
          <button className="story-subpage__back story-sidebar__close-mobile" onClick={() => setMobileSidebarOpen(false)}>✕ ปิดเมนู</button>
          <StorySidebar
            query={searchQuery}
            searchFocused={searchFocused}
            onNavigate={handleNavigate}
          />
        </div>

        <button className="story-compose-fab" title="สร้างสตอรี่ใหม่" onClick={() => setShowCompose(true)}>+</button>
      </div>

      {showCompose && <ComposeStoryModal onClose={() => setShowCompose(false)} />}

      {/* [เพิ่มตามที่ระบุ] popup โพสต์ที่เปิดจากแจ้งเตือน — pattern เดียวกับ ActivityPanel.tsx */}
      {openedPost && (
        <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpenedPostId(null) }}>
          <div className="story-modal-card" style={{ maxWidth: 520, padding: 0 }}>
            <PostCard post={openedPost} />
            <div style={{ padding: 16 }}>
              <button className="story-btn-ghost" style={{ width: '100%', padding: '10px 0', borderRadius: 999 }} onClick={() => setOpenedPostId(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* [ข้อ 11] toast กลางจอตอนพยายามดูโปรไฟล์คนที่ปิดไว้ */}
      <GameAlert open={showPrivacyToast} message="โพสต์ปิดโปรไฟล์" icon="🔒" onClose={dismissPrivacyToast} />
    </div>
  )
}
