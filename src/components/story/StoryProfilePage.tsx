import { useMemo, useState } from 'react'
import { useUser } from '../../context/UserContext'
import { usePosts } from '../../context/PostContext'
import PostCard from './PostCard'

/*============================================================================*\
  StoryProfilePage — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] หน้า 7 ของ wireframe
  ────────────────────────────────────────────────────────────────────────────
  ปุ่ม "แชร์โปรไฟล์" ใช้ pattern เดียวกับปุ่มแชร์ที่ Dashboard.tsx ทำไว้แล้ว (navigator.share
  ก่อน ตกไป copy link) ไม่ได้สร้าง deep-link เฉพาะโปรไฟล์จริง (แอปนี้เป็น SPA หน้าเดียว
  ไม่มี route ต่อ user คนอื่นแยกจริง) — แชร์ลิงก์หน้าแอปตรงๆ เหมือนปุ่มแชร์เดิมทุกประการ

  [แก้รอบนี้ — ข้อ 5] ปุ่ม "แก้ไขโปรไฟล์" ไม่เปิด modal bio ของตัวเองอีกต่อไป (ไฟล์
  EditProfileModal.tsx ถูกลบไปแล้ว) — เปิด "หน้าตั้งค่าโปรไฟล์กลาง" ของทั้งเว็บแทน (SettingsModal
  ตัว activeSubModal==='profile') ผ่าน prop onEditProfile ที่ Dashboard.tsx เป็นคนสั่งเปิดจริง
  (เห็น avatar/bio/username/ปิดโปรไฟล์ ครบในที่เดียว ไม่ต้องมีฟอร์มโปรไฟล์ซ้ำสองที่)
\*============================================================================*/

type PostFilter = 'public' | 'anonymous'

interface StoryProfilePageProps {
  onBack: () => void
  onEditProfile: () => void
  /** [ใหม่ — ข้อ 15] "ดูต้นไม้" ของตัวเอง — reuse viewingPlayer pattern เดิมของ Dashboard
   *  (null = ต้นไม้ตัวเอง ซึ่งเป็นค่าเริ่มต้นของ Dashboard อยู่แล้วเวลาไม่มี viewingPlayer)
   *  [หมายเหตุ] ยังไม่ทำระบบตั้งค่าความเป็นส่วนตัวของ "ต้นไม้" แยกในรอบนี้ตามที่ระบุ — ใครก็
   *  ดูต้นไม้ใครได้เหมือนหน้าจัดอันดับปัจจุบันทุกประการ ค่อยทำ privacy toggle แยกทีหลัง */
  onViewTree: () => void
}

export default function StoryProfilePage({ onBack, onEditProfile, onViewTree }: StoryProfilePageProps) {
  const { userData } = useUser()
  const { posts } = usePosts()
  const [filter, setFilter] = useState<PostFilter>('public')

  const myPosts = useMemo(
    () => posts.filter((p) => p.userId === userData.id && (filter === 'public' ? !p.isAnonymous : p.isAnonymous)),
    [posts, userData.id, filter],
  )

  const handleShareProfile = async () => {
    const shareData = { title: 'ARBOR HORIZON — โปรไฟล์สตอรี่', text: `ดูโปรไฟล์ของ ${userData.username} บน ARBOR HORIZON`, url: window.location.href }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* ผู้ใช้ยกเลิกเอง */ }
      return
    }
    try { await navigator.clipboard.writeText(shareData.url) } catch { /* ไม่รองรับ ปล่อยผ่าน */ }
  }

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack}>←</button>
        <span className="story-subpage__title">โปรไฟล์</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div className="story-avatar story-avatar--lg">
          {userData.avatarUrl ? (
            <img src={userData.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (userData.username.trim().charAt(0).toUpperCase() || '?')}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', color: 'var(--g800)' }}>{userData.username}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>รายละเอียด</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{userData.bio || 'ยังไม่มีรายละเอียด — กด "แก้ไขโปรไฟล์" เพื่อเพิ่ม'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <button className="story-btn-outline" style={{ padding: '9px 18px', borderRadius: 999 }} onClick={onEditProfile}>แก้ไขโปรไฟล์</button>
        <button className="story-btn-outline" style={{ padding: '9px 18px', borderRadius: 999 }} onClick={handleShareProfile}>แชร์โปรไฟล์</button>
        <button className="story-btn-outline" style={{ padding: '9px 18px', borderRadius: 999 }} onClick={onViewTree}>🌳 ดูต้นไม้</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 'var(--fs-md)' }}>โพสต์ของฉัน</span>
        <select className="story-filter-select" value={filter} onChange={(e) => setFilter(e.target.value as PostFilter)}>
          <option value="public">โพสต์สาธารณะ</option>
          <option value="anonymous">โพสต์แบบไม่ระบุตัวตน</option>
        </select>
      </div>

      {myPosts.length === 0 ? (
        <div className="story-empty-state">ยังไม่มีโพสต์ในหมวดนี้</div>
      ) : (
        <div className="story-feed__list">
          {myPosts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
