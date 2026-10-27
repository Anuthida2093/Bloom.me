import { useMemo, useState } from 'react'
import type { ActivityItem } from '../../types'
import { useSocial } from '../../context/SocialContext'
import { usePosts } from '../../context/PostContext'
import PostCard from './PostCard'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  ActivityPanel — [แก้รอบนี้ — ข้อ 14] หน้ากิจกรรมเต็มจอ (ไม่ใช่ popup ลอยกลางจอแบบเดิม)
  ────────────────────────────────────────────────────────────────────────────
  ใช้ pattern เดียวกับหน้า "เพื่อน" (.story-subpage — แถบบนมีปุ่มย้อนกลับ+หัวข้อ) ตามที่
  ระบุ ตัดแท็บ 5 อันออกทั้งหมด เหลือ list เดียวรวมทุกประเภท (ติดตามใหม่/ไลค์/คอมเมนต์/
  แชร์มาให้เรา) เรียงใหม่สุดก่อน จัดกลุ่ม "7 วันที่ผ่านมา"/"30 วันที่ผ่านมา" เหมือนเดิม

  กดแถวที่มี postId (ไลค์/คอมเมนต์/แชร์) → เปิดโพสต์นั้นในป็อบอัพเล็กทันที (ข้อ 13/14)
\*============================================================================*/

const ICON_FOR: Record<ActivityItem['type'], string> = {
  NEW_FOLLOWER: '👤',
  LIKE_POST: '❤️',
  COMMENT_POST: '💬',
  SHARED_POST_TO_YOU: '↗️',
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'วันนี้'
  return `${days} วันที่ผ่านมา`
}

function bucketOf(iso: string): '7d' | '30d' | 'older' {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 7) return '7d'
  if (days <= 30) return '30d'
  return 'older'
}
const BUCKET_LABEL: Record<'7d' | '30d' | 'older', string> = {
  '7d': '7 วันที่ผ่านมา', '30d': '30 วันที่ผ่านมา', older: 'เก่ากว่านี้',
}

export default function ActivityPanel({ onBack }: { onBack: () => void }) {
  const { activity, isLoadingActivity, isFollowing, toggleFollow } = useSocial()
  const { posts } = usePosts()
  const [openedPostId, setOpenedPostId] = useState<string | null>(null)

  const sorted = useMemo(() => [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [activity])
  const groups: { key: '7d' | '30d' | 'older'; items: ActivityItem[] }[] = (['7d', '30d', 'older'] as const)
    .map((key) => ({ key, items: sorted.filter((i) => bucketOf(i.createdAt) === key) }))
    .filter((g) => g.items.length > 0)

  const openedPost = openedPostId ? posts.find((p) => p.id === openedPostId) ?? null : null

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack} title="กลับ" aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <span className="story-subpage__title">กิจกรรม</span>
      </div>

      {isLoadingActivity ? (
        <div className="story-empty-state">กำลังโหลด...</div>
      ) : groups.length === 0 ? (
        <div className="story-empty-state">ยังไม่มีกิจกรรม</div>
      ) : (
        groups.map((group) => (
          <div key={group.key}>
            <div className="story-activity-group-label">{BUCKET_LABEL[group.key]}</div>
            {group.items.map((item) => {
              const alreadyFollowing = isFollowing(item.actorId)
              const showFollowBtn = item.type === 'NEW_FOLLOWER' && !alreadyFollowing
              const clickable = !!item.postId
              return (
                <div
                  key={item.id}
                  className={`story-activity-row${clickable ? ' story-activity-row--clickable' : ''}`}
                  onClick={clickable ? () => setOpenedPostId(item.postId ?? null) : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                >
                  <div className="story-activity-row__avatar-wrap">
                    <div className="story-avatar story-avatar--sm">{initialOf(item.actorName)}</div>
                    <span className="story-activity-row__badge">{ICON_FOR[item.type]}</span>
                  </div>
                  <div className="story-activity-row__body">
                    <span className="story-activity-row__name">{item.actorName}</span>
                    <span className="story-activity-row__time">{timeAgo(item.createdAt)}</span>
                    <div className="story-activity-row__excerpt">{item.excerpt}</div>
                  </div>
                  {showFollowBtn && (
                    <button
                      className="story-follow-btn"
                      onClick={(e) => { e.stopPropagation(); toggleFollow(item.actorId) }}
                    >
                      ติดตามกลับ
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}

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
    </div>
  )
}
