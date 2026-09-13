import { useState } from 'react';
import { MBTI_TREE_THEME, type MbtiType } from '../../types';
import MiniTree from '../tree/MiniTree';
import { RANK_CATEGORIES, MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer, type RankCategory } from '../../config/leaderboardData';
import { BADGE_ICONS, RANK_CATEGORY_ICONS } from '../../config/iconAssets';
import './leaderboardRow.css';

const C_1 = '#ccc'
const C_2 = '#333333'
const C_3 = 'rgba(244,196,48,.12)'
const C_4 = 'rgba(180,180,180,.1)'
const C_5 = 'rgba(244,132,95,.1)'

const BORDER_1 = C_1
const TEXT_2 = C_2

export type PanelPlayer = LeaderboardPlayer

const MEDALS = ['🥇', '🥈', '🥉'];
// [แก้ตามที่ระบุ] แทนเหรียญอันดับ 1-3 ด้วยไฟล์รูปจริง — MEDALS (emoji) ยังเก็บไว้ใช้เป็น
// alt text เท่านั้น ไม่ได้ลบทิ้ง
const RANK_ICONS = [BADGE_ICONS.rank1, BADGE_ICONS.rank2, BADGE_ICONS.rank3];

interface LeaderboardPanelProps {
  collapsed?: boolean
  onToggle?: () => void
  myMbti?: MbtiType
  myName?: string
  glass?: boolean
  onPlayerClick?: (player: PanelPlayer) => void
}

export default function LeaderboardPanel({
  collapsed = false,
  onToggle = () => {},
  myMbti = 'INFP',
  myName,
  glass = false,
  onPlayerClick = () => {},
}: LeaderboardPanelProps) {
  const [cat, setCat] = useState<RankCategory>('level');

  const sorted = [...MOCK_LEADERBOARD_PLAYERS].sort(
    (a, b) => b[cat] - a[cat]
  );

  const myTheme = MBTI_TREE_THEME[myMbti] ?? MBTI_TREE_THEME.INFP;

  return (
    <div
      style={{
        width: collapsed ? 0 : 220,
        flexShrink: 0,
        transition: 'width .3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* ═══ ปุ่มเปิด/ปิด (< >) นำออกมาอยู่นอกเงื่อนไข เพื่อให้คงอยู่เสมอ ═══ */}
      <button
        onClick={onToggle}
        title={collapsed ? 'กางกระดานจัดอันดับ' : 'ซ่อนกระดานจัดอันดับ'}
        style={{
          position: 'absolute',
          top: 12,
          left: collapsed ? 0 : '100%',
          transform: collapsed ? 'none' : 'translateX(-50%)',
          zIndex: 100,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `1.5px solid var(--border-mid, ${BORDER_1})`,
          background: 'var(--fixed-white)',
          color: TEXT_2,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 'bold',
          boxShadow: '0 2px 8px var(--glass-b-25)',
          transition: 'left .3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* ═══ เนื้อหาการ์ด ═══ */}
      <div
        className={glass ? 'card glass' : 'card'}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : 'auto',
          transition: 'opacity .2s ease',
          visibility: collapsed ? 'hidden' : 'visible',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--g800), var(--g700))',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontFamily: 'Fredoka One',
              fontSize: 18,
              color: 'var(--fixed-white)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <img src={BADGE_ICONS.trophy} className="icon-img" alt="" /> จัดอันดับ
          </div>
        </div>

        {/* Cat tabs */}
        <div
          style={{
            display: 'flex',
            padding: '8px 8px 4px',
            gap: 4,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {RANK_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                flex: 1,
                padding: '5px 2px',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'Nunito',
                fontSize: 10,
                fontWeight: 700,
                background: cat === c.id ? 'var(--g700)' : 'transparent',
                color: cat === c.id ? 'var(--fixed-white)' : 'var(--text-sub)',
                transition: 'all .15s',
              }}
            >
              {RANK_CATEGORY_ICONS[c.id] ? <img src={RANK_CATEGORY_ICONS[c.id]} className="icon-img" alt={c.label} /> : c.icon}
            </button>
          ))}
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 8px',
          }}
          className="no-scroll"
        >
          {sorted.map((p, i) => {
            const pt = MBTI_TREE_THEME[p.mbtiType];

            return (
              <div
                key={p.id}
                className="leaderboard-row"
                onClick={() => onPlayerClick(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 6px',
                  borderRadius: 10,
                  marginBottom: 4,
                  background:
                    i < 3
                      ? [
                          C_3,
                          C_4,
                          C_5,
                        ][i]
                      : 'transparent',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    width: 20,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i < 3
                    ? <img src={RANK_ICONS[i]} alt={MEDALS[i]} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    : `${i + 1}`}
                </span>

                <MiniTree theme={pt} size={28} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="leaderboard-row__name"
                    style={{
                      fontFamily: 'Fredoka One',
                      fontSize: 11,
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.username}
                  </div>

                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {p.mbtiType}
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: 'Fredoka One',
                    fontSize: 13,
                    color: 'var(--g600)',
                    flexShrink: 0,
                  }}
                >
                  {cat === 'level' ? p.level : p[cat]}
                </span>
              </div>
            );
          })}

          {/* My rank */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 6px',
              borderRadius: 10,
              marginTop: 4,
              background: myTheme.accent + '18',
              border: `1.5px solid ${myTheme.accent}44`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                width: 20,
                textAlign: 'center',
                color: myTheme.accent,
                fontWeight: 700,
              }}
            >
              #8
            </span>

            <MiniTree theme={myTheme} size={28} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Fredoka One',
                  fontSize: 11,
                  color: myTheme.accent,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {myName || 'คุณ'}
              </div>

              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                {myMbti}
              </div>
            </div>

            <span
              style={{
                fontSize: 9,
                color: myTheme.accent,
                fontWeight: 700,
              }}
            >
              ฉัน
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}