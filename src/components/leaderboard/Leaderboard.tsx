import { useState } from 'react';
import { MBTI_TREE_THEME, type MbtiType } from '../../types';
import MiniTree from '../tree/MiniTree';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { RANK_CATEGORIES, MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer, type RankCategory } from '../../config/leaderboardData';
import './leaderboardRow.css';

const C_1 = '#FFF9C4'
const C_2 = '#FFF0A0'
const C_3 = '#F5F5F5'
const C_4 = '#E8E8E8'
const C_5 = '#FFF4EE'
const C_6 = '#FFE8DA'

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
  onClose?: () => void
  myMbti?: MbtiType
  myName?: string
  /** [ข้อกำหนดข้อ 2] คลิกที่แถวผู้เล่นคนไหน ก็จะได้ข้อมูลเต็มของคนนั้นกลับมา —
   *  ผู้เรียกใช้ (เช่น Dashboard.tsx) เอาไปเปิด modal สถิติเชิงลึก/ต้นไม้เต็มตัวต่อได้เลย */
  onPlayerClick?: (player: LeaderboardPlayer) => void
}

export default function Leaderboard({ onClose = () => {}, myMbti = 'INFP', myName, onPlayerClick = () => {} }: LeaderboardProps) {
  useLockBodyScroll();
  useEscapeKey(onClose);
  const [cat, setCat] = useState<RankCategory>('level');

  const sorted = [...MOCK_LEADERBOARD_PLAYERS].sort(
    (a, b) => b[cat] - a[cat]
  );

  const myTheme = MBTI_TREE_THEME[myMbti] ?? MBTI_TREE_THEME.INFP;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--glass-b-50)',
        backdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--fixed-white)',
          borderRadius: 28,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          // [แก้ขอบแหว่ง] เดิมใช้ overflow:'hidden' ที่ container หลักเพื่อครอบมุมโค้งของ
          // header/list ข้างใน — วิธีนี้มีบั๊กที่รู้จักกันดีใน Chromium: พอ container มี
          // border-radius + overflow:hidden แล้ว child มี background/gradient เป็นของตัวเอง
          // (เช่น header ไล่สีเขียวด้านล่าง) บางจังหวะ (โดยเฉพาะจอที่ DPI ไม่ลงตัว/ตอน scroll)
          // จะเห็นเป็นเส้นแหว่ง/รอยหยักบางๆ ตรงมุมโค้ง เพราะ browser rasterize clip-path
          // กับ gradient คนละรอบกัน ไม่ sub-pixel align กันเป๊ะ
          //
          // แก้โดยตัด overflow:hidden ออกจาก container หลัก แล้วให้ "ตัวลูกที่ชนขอบจริง"
          // (header ชนขอบบน, list ชนขอบล่าง) ปัดมุมของตัวเองแทน — ไม่มี clip-path มาเกี่ยว
          // เลยไม่มีรอยแหว่งให้เห็นอีก มุมโค้งของลูกตรงกับมุมโค้งของ container พอดีอยู่แล้ว
          // เพราะใช้ค่าเดียวกัน (28px)
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 0px var(--glass-b-22)',
        }}
      >
        {/* Header — ปัดมุมบนเองตรงๆ (borderTopLeftRadius/borderTopRightRadius) แทนที่จะพึ่ง
            overflow:hidden ของ container แม่ */}
        <div
          style={{
            background:
              'linear-gradient(135deg, var(--g800), var(--g700))',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'Fredoka One',
                fontSize: 24,
                color: 'var(--fixed-white)',
              }}
            >
              🏆 กระดานจัดอันดับ
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--g300)',
                marginTop: 2,
              }}
            >
              ต้นไม้ที่แข็งแกร่งที่สุดใน ARBOR HORIZON
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--glass-w-15)',
              border: 'none',
              borderRadius: 99,
              width: 36,
              height: 36,
              color: 'var(--fixed-white)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Category selector */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--n50)',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
          }}
          className="no-scroll"
        >
          {RANK_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                border: 'none',
                borderRadius: 'var(--r-pill)',
                background:
                  cat === c.id ? 'var(--g700)' : 'var(--fixed-white)',
                color:
                  cat === c.id ? 'var(--fixed-white)' : 'var(--n700)',
                fontFamily: 'Fredoka One',
                fontSize: 13,
                cursor: 'pointer',
                boxShadow:
                  cat === c.id
                    ? 'var(--sh-btn)'
                    : 'var(--sh-card)',
                transition: 'all .18s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Leaderboard list — ปัดมุมล่างเอง (borderBottomLeftRadius/borderBottomRightRadius)
            เป็นตัวลูกตัวสุดท้ายที่ชนขอบล่างของ container จริง */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          {sorted.map((player, i) => {
            const ptheme = MBTI_TREE_THEME[player.mbtiType];

            return (
              <div
                key={player.id}
                className="leaderboard-row"
                onClick={() => onPlayerClick(player)}
                title={`ดูรายละเอียดของ ${player.username}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  marginBottom: 6,
                  background:
                    i === 0
                      ? `linear-gradient(135deg, ${C_1}, ${C_2})`
                      : i === 1
                      ? `linear-gradient(135deg, ${C_3}, ${C_4})`
                      : i === 2
                      ? `linear-gradient(135deg, ${C_5}, ${C_6})`
                      : 'var(--n50)',
                  border: `1.5px solid ${
                    i === 0
                      ? 'var(--coin)'
                      : i < 3
                      ? 'var(--n100)'
                      : 'transparent'
                  }`,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Fredoka One',
                    fontSize: 20,
                    width: 32,
                    textAlign: 'center',
                  }}
                >
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </div>

                <MiniTree theme={ptheme} size={36} />

                <div style={{ flex: 1 }}>
                  <div
                    className="leaderboard-row__name"
                    style={{
                      fontFamily: 'Fredoka One',
                      fontSize: 15,
                      color: 'var(--n900)',
                    }}
                  >
                    {player.username}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--n300)',
                      fontWeight: 700,
                    }}
                  >
                    {player.mbtiType} · Lv.{player.level}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'Fredoka One',
                      fontSize: 18,
                      color: 'var(--g700)',
                    }}
                  >
                    {cat === 'level'
                      ? player.level
                      : player[cat].toLocaleString()}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--n300)',
                      fontWeight: 700,
                    }}
                  >
                    {cat === 'level' ? 'ระดับ' : 'คะแนน'}
                  </div>
                </div>
              </div>
            );
          })}

          {/* My position separator */}
          <div
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: myTheme.accent + '18',
              border: `2px solid ${myTheme.accent}55`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'Fredoka One',
                fontSize: 16,
                color: myTheme.accent,
                width: 32,
                textAlign: 'center',
              }}
            >
              #8
            </div>

            <MiniTree theme={myTheme} size={36} />

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'Fredoka One',
                  fontSize: 15,
                  color: myTheme.accent,
                }}
              >
                {myName || 'คุณ'} (ฉัน)
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--n300)',
                  fontWeight: 700,
                }}
              >
                {myMbti}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}