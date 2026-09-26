import { useEffect, useMemo, useRef, useState } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useSocial } from '../../context/SocialContext'
import { MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer } from '../../config/leaderboardData'
import './FriendsPage.css'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  FriendsPage — [ไฟล์ใหม่ — ข้อ B] หน้า "เพื่อน" เปิดจากปุ่มมุมขวาล่างของ Dashboard (👥)
  ────────────────────────────────────────────────────────────────────────────
  ตั้งใจให้เรียบง่ายที่สุดตามที่ระบุ: ปุ่มกลับ + หัวข้อ + ตัวกรองเรียง + ช่องค้นหา + list
  รายชื่อ — ไม่มีเมนูลัด ไม่มีกริดฟีเจอร์แบบหน้าสตอรี่ (นี่คือคนละหน้ากับ FriendsListPanel.tsx
  ที่อยู่ใน sidebar ของ StoryOverlay — อันนั้นเป็นเมนูย่อยของสตอรี่ ส่วนอันนี้คือปุ่มลัดตรงจาก
  Dashboard เอง)

  คลิกที่แถวจะเปิด "ต้นไม้" ของคนนั้น — reuse viewingPlayer pattern เดิมของ Dashboard.tsx
  (เหมือนที่ Leaderboard/Story ใช้อยู่แล้ว) ผ่าน onViewPlayer prop

  [TODO ต่อของจริงทีหลัง] ระบบ follow จริงตอนนี้ (SocialContext.following) เป็นแค่ string[]
  ทางเดียว (เราติดตามใคร) — ยังไม่มี endpoint ที่ให้ "createdAt" ของความสัมพันธ์ หรือบอกว่า
  "ใครติดตามเรากลับ" (mutual/reverse follow) เลย ฟังก์ชัน mockRelationshipMeta() ด้านล่างจึง
  จำลองสอง field นี้ชั่วคราว (deterministic hash จาก player.id ไม่ใช่ข้อมูลจริง) แค่ให้พอมี
  อะไรโชว์ในตัวกรอง "ใหม่สุด/เก่าสุด" และสถานะ "เพื่อน/กำลังติดตาม" ได้ — พอ backend มี endpoint
  follow relationship จริง (มี createdAt + follower/following ทั้งสองทาง) ให้ตัดฟังก์ชันนี้ทิ้ง
  แล้วอ่านค่าจริงจาก response แทน
\*============================================================================*/

type SortOrder = 'newest' | 'oldest'

const SORT_LABEL: Record<SortOrder, string> = { newest: 'ใหม่สุด', oldest: 'เก่าสุด' }

function mockRelationshipMeta(playerId: string) {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0
  const daysAgo = hash % 60
  const createdAt = Date.now() - daysAgo * 24 * 60 * 60 * 1000
  const isMutual = hash % 2 === 0
  return { createdAt, isMutual }
}

interface FriendsPageProps {
  onBack: () => void
  onViewPlayer: (player: LeaderboardPlayer) => void
}

export default function FriendsPage({ onBack, onViewPlayer }: FriendsPageProps) {
  useLockBodyScroll()
  useEscapeKey(onBack)

  const { following } = useSocial()
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [query, setQuery] = useState('')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // ปิดเมนูดรอปดาวน์เมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!sortMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setSortMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [sortMenuOpen])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = MOCK_LEADERBOARD_PLAYERS
      .filter((p) => following.includes(p.id))
      .map((p) => ({ player: p, ...mockRelationshipMeta(p.id) }))
      .filter((r) => r.player.username.toLowerCase().includes(q))
    list.sort((a, b) => (sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt))
    return list
  }, [following, query, sortOrder])

  return (
    <div className="friends-page">
      <div className="friends-page__head">
        <button className="friends-page__back" onClick={onBack} aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <h1 className="friends-page__title">เพื่อน</h1>

        <div className="friends-page__sort" ref={sortMenuRef}>
          <button
            type="button"
            className="friends-page__sort-toggle"
            aria-haspopup="listbox"
            aria-expanded={sortMenuOpen}
            onClick={() => setSortMenuOpen((v) => !v)}
          >
            {SORT_LABEL[sortOrder]} <span className="friends-page__sort-caret" aria-hidden="true">▾</span>
          </button>
          {sortMenuOpen && (
            <div className="friends-page__sort-menu" role="listbox">
              {(Object.keys(SORT_LABEL) as SortOrder[]).map((order) => (
                <button
                  key={order}
                  type="button"
                  role="option"
                  aria-selected={sortOrder === order}
                  className={`friends-page__sort-option${sortOrder === order ? ' friends-page__sort-option--active' : ''}`}
                  onClick={() => { setSortOrder(order); setSortMenuOpen(false) }}
                >
                  {SORT_LABEL[order]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="friends-page__controls">
        <input
          className="friends-page__search"
          type="text"
          placeholder="ค้นหาเพื่อน..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="friends-page__list">
        {rows.length === 0 ? (
          <div className="friends-page__empty">
            {following.length === 0 ? 'ยังไม่มีเพื่อน — ลองติดตามคนอื่นในหน้าสตอรี่ก่อนนะ' : 'ไม่พบเพื่อนที่ตรงกับคำค้นหา'}
          </div>
        ) : (
          rows.map(({ player, isMutual }) => (
            <button key={player.id} type="button" className="friends-page__row" onClick={() => onViewPlayer(player)}>
              <div className="friends-page__avatar">{player.username.trim().charAt(0).toUpperCase()}</div>
              <div className="friends-page__row-info">
                <span className="friends-page__row-name">{player.username}</span>
                <span className={`friends-page__row-status${isMutual ? ' friends-page__row-status--mutual' : ''}`}>
                  {isMutual ? 'เพื่อน' : 'กำลังติดตาม'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
