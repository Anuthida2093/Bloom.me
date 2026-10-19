import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MBTI_TREE_THEME, type MbtiType } from '../../types'
import MiniTree from '../tree/MiniTree'
import { RANK_CATEGORIES, type LeaderboardPlayer, type RankCategory } from '../../config/leaderboardData'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import { BADGE_ICONS, RANK_CATEGORY_ICONS } from '../../config/iconAssets'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useLanguage } from '../../context/LanguageContext'
import './LeaderboardFullscreen.css'

/*============================================================================*\
  LeaderboardFullscreen — [ใหม่ตามที่ระบุ] กดชื่อตัวเอง (แถบ "อันดับของฉัน") ในกระดานจัดอันดับ
  → ตารางจัดอันดับเต็มจอ เห็นผู้เล่นทุกคนว่าอยู่อันดับไหน แถวของเราเป็นสีฟ้า + เลื่อนไปหาแถวเราเอง
  ใช้ได้ทั้งมือถือ / iPad / โน้ตบุ๊ก (กล่องกว้างสุด 720px กึ่งกลางจอ) — แตะผู้เล่นคนอื่น = ดูต้นไม้คนนั้น
  อันดับของเราคิดสูตรเดียวกับ LeaderboardPanel (จำนวนคนที่คะแนนมากกว่า + 1 → เสมอกันเราอยู่ก่อน)
\*============================================================================*/

const ME_ID = '__me__'
const RANK_ICONS = [BADGE_ICONS.rank1, BADGE_ICONS.rank2, BADGE_ICONS.rank3]

interface LeaderboardFullscreenProps {
  initialCategory: RankCategory
  me: LeaderboardPlayer
  onClose: () => void
  onPlayerClick: (player: LeaderboardPlayer) => void
}

export default function LeaderboardFullscreen({ initialCategory, me, onClose, onPlayerClick }: LeaderboardFullscreenProps) {
  const { t } = useLanguage()
  const [cat, setCat] = useState<RankCategory>(initialCategory)
  const players = useLeaderboard(cat)
  useEscapeKey(onClose)
  useLockBodyScroll()

  const rows = [...players.filter((p) => p.id !== ME_ID), { ...me, id: ME_ID }].sort((a, b) => {
    const diff = b[cat] - a[cat]
    if (diff !== 0) return diff
    return a.id === ME_ID ? -1 : b.id === ME_ID ? 1 : 0
  })

  // เปิดมา/สลับหมวด → เลื่อนให้แถวของเราอยู่กลางรายการ
  const meRowRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    const t = window.setTimeout(() => meRowRef.current?.scrollIntoView({ block: 'center' }), 60)
    return () => window.clearTimeout(t)
  }, [cat])

  return createPortal(
    <div className="lb-full" role="dialog" aria-modal="true" aria-label={t('lb.title')} onClick={onClose}>
      <div className="lb-full__box lb-frame" onClick={(e) => e.stopPropagation()}>
        <div className="lb-frame__banner">
          <img src={BADGE_ICONS.trophy} className="icon-img" alt="" /> {t('lb.title')}
        </div>
        <button type="button" className="lb-full__close" onClick={onClose} aria-label="ปิด" title="ปิด">
          <img src={BADGE_ICONS.close} alt="" />
        </button>

        <div className="lb-frame__sheet lb-full__sheet">
          <div className="lb-frame__tabs lb-full__tabs">
            {RANK_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`lb-frame__tab lb-full__tab${cat === c.id ? ' lb-frame__tab--active' : ''}`}
              >
                {RANK_CATEGORY_ICONS[c.id] && <img src={RANK_CATEGORY_ICONS[c.id]} className="icon-img" alt="" />}
                <span>{t(`lb.cat.${c.id}`)}</span>
              </button>
            ))}
          </div>

          <div className="lb-full__list">
            {rows.map((p, i) => {
              const isMe = p.id === ME_ID
              const theme = MBTI_TREE_THEME[p.mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP
              return (
                <button
                  key={p.id}
                  ref={isMe ? meRowRef : undefined}
                  type="button"
                  className={`lb-full__row${isMe ? ' lb-full__row--me' : ''}${i < 3 ? ` lb-full__row--top${i + 1}` : ''}`}
                  onClick={isMe ? undefined : () => onPlayerClick(p)}
                  aria-current={isMe ? 'true' : undefined}
                >
                  <span className="lb-full__rank">
                    {i < 3 ? <img src={RANK_ICONS[i]} alt={`${i + 1}`} /> : i + 1}
                  </span>
                  <MiniTree theme={theme} size={34} />
                  <span className="lb-full__who">
                    <span className="lb-full__name">{isMe ? `${p.username || t('lb.you')} (${t('lb.me')})` : p.username}</span>
                    <span className="lb-full__mbti">{p.mbtiType}</span>
                  </span>
                  <span className="lb-full__score">{p[cat]}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
