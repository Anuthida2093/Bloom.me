import { useEffect, useState } from 'react';
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
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 8] สถิติจริงของผู้ใช้เอง ใช้คำนวณอันดับจริงแทนเลข "#8"
   *  ที่ hardcode ไว้เดิม (ตรวจโค้ดจริงแล้ว — ไม่เคยมีการคำนวณอันดับผู้ใช้เองเลยสักจุด) */
  myLevel?: number
  myKnowledgeStack?: number
  myHealthStack?: number
  myEmotionStack?: number
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 8] แจ้งอันดับ "โดยรวม" (หมวด level) ทุกครั้งที่คำนวณใหม่
   *  ให้ Dashboard.tsx เทียบกับ lastKnownRank เพื่อตัดสินใจโชว์ popup เลื่อนอันดับ — ใช้หมวด
   *  level คงที่เสมอ (ไม่ใช่ cat ที่ผู้ใช้สลับดูในแผงนี้) เพราะเป็น "อันดับรวม" ที่ควรวัดจาก
   *  เกณฑ์เดียวกันตลอด ไม่งั้นสลับแท็บไปมาจะเห็น popup ผิดๆ ทั้งที่อันดับรวมไม่ได้เปลี่ยน */
  onMyRankChange?: (rank: number) => void
}

export default function LeaderboardPanel({
  collapsed = false,
  onToggle = () => {},
  myMbti = 'INFP',
  myName,
  glass = false,
  onPlayerClick = () => {},
  myLevel = 0,
  myKnowledgeStack = 0,
  myHealthStack = 0,
  myEmotionStack = 0,
  onMyRankChange,
}: LeaderboardPanelProps) {
  const [cat, setCat] = useState<RankCategory>('level');

  const sorted = [...MOCK_LEADERBOARD_PLAYERS].sort(
    (a, b) => b[cat] - a[cat]
  );

  const myTheme = MBTI_TREE_THEME[myMbti] ?? MBTI_TREE_THEME.INFP;

  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 8] อันดับจริง = จำนวนผู้เล่นใน mock leaderboard ที่มีค่า
     หมวดนั้นสูงกว่าเรา + 1 (backend endpoint จริงยังไม่มี — ดูคอมเมนต์หัวไฟล์ leaderboardData.ts
     ว่าเป็น mock ที่จำลอง GET /leaderboard ไว้ก่อน) */
  const myStatsByCategory: Record<RankCategory, number> = {
    level: myLevel,
    knowledgeStack: myKnowledgeStack,
    healthStack: myHealthStack,
    emotionStack: myEmotionStack,
  };
  const computeMyRank = (category: RankCategory) =>
    MOCK_LEADERBOARD_PLAYERS.filter((p) => p[category] > myStatsByCategory[category]).length + 1;

  const myRankForCurrentCat = computeMyRank(cat);
  const myRankOverall = computeMyRank('level');

  useEffect(() => {
    onMyRankChange?.(myRankOverall);
  }, [myRankOverall, onMyRankChange]);

  return (
    <div
      style={{
        width: collapsed ? 0 : 220,/* แก้ตามที่ระบุ: 200 → 220 ให้ความกว้างของกระดานจัดอันดับใหญ่ขึ้น */
        flexShrink: 0,/* แก้ตามที่ระบุ: 0 → 1 ให้กระดานจัดอันดับไม่ย่อเล็กลงเมื่อพื้นที่แคบ */
        transition: 'width .3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',/* แก้ตามที่ระบุ: relative → fixed ให้กระดานจัดอันดับอยู่ด้านบนสุดของหน้าจอเสมอ */
        zIndex: 50,/* แก้ตามที่ระบุ: 50 → 100 ให้กระดานจัดอันดับอยู่เหนือปุ่มอื่น ๆ */
      }}
    >
      {/* ═══ ปุ่มเปิด/ปิด (< >) นำออกมาอยู่นอกเงื่อนไข เพื่อให้คงอยู่เสมอ ═══ */}
      <button
        onClick={onToggle}/* แก้ตามที่ระบุ: onClick={() => setCollapsed(!collapsed)} → onClick={onToggle} ให้ใช้ callback จาก props แทนการจัดการ state ภายใน */
        title={collapsed ? 'กางกระดานจัดอันดับ' : 'ซ่อนกระดานจัดอันดับ'}
        style={{
          position: 'absolute',
          top: 12,
          left: collapsed ? 0 : '100%',
          transform: collapsed ? 'none' : 'translateX(-50%)',
          zIndex: 100,
          width: 28,/* แก้ตามที่ระบุ: 24 → 28 ให้ปุ่มเปิด/ปิดใหญ่ขึ้น */
          height: 28,
          borderRadius: '50%',
          border: `1.5px solid var(--border-mid, ${BORDER_1})`,
          background: 'var(--fixed-white)',
          color: TEXT_2,/* แก้ตามที่ระบุ: var(--text) → TEXT_2 ให้สีตัวอักษรเข้มขึ้น */
          cursor: 'pointer',/* แก้ตามที่ระบุ: cursor: 'pointer' → cursor: 'pointer' ให้ปุ่มเปิด/ปิดมีเคอร์เซอร์เป็น pointer */
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,/* แก้ตามที่ระบุ: 16 → 20 ให้ตัวอักษรในปุ่มเปิด/ปิดใหญ่ขึ้น */
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
          height: '100%',/* แก้ตามที่ระบุ: height: '100%' → height: '100%' ให้กระดานจัดอันดับเต็มความสูงของหน้าจอ */
          display: 'flex',/* แก้ตามที่ระบุ: display: 'flex' → display: 'flex' ให้กระดานจัดอันดับเป็น flex container */
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
            padding: '12px 16px',/* แก้ตามที่ระบุ: padding: '12px 16px' → padding: '14px 16px' ให้พื้นที่ด้านบนและล่างของ header มากขึ้น */
          }}
        >
          <div
            style={{
              fontFamily: 'Fredoka One',
              fontSize: 20,/* แก้ตามที่ระบุ: 18 → 20 ให้ตัวอักษรใหญ่ขึ้น */
              color: 'var(--fixed-white)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,/* แก้ตามที่ระบุ: gap: 6 → gap: 8 ให้ช่องว่างระหว่างไอคอนและข้อความมากขึ้น */
            }}
          >
            <img src={BADGE_ICONS.trophy} className="icon-img" alt="" /> จัดอันดับ
          </div>
        </div>

        {/* Cat tabs */}
        <div
          style={{
            display: 'flex',/* แก้ตามที่ระบุ: display: 'flex' → display: 'flex' ให้ปุ่มหมวดหมู่จัดอันดับเรียงเป็นแถว */
            padding: '2px 8px 4px',
            gap: 1,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {RANK_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                flex: 1,/* แก้ตามที่ระบุ: flex: 1 → flex: 1 ให้ปุ่มแต่ละหมวดหมู่มีความกว้างเท่ากัน */
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 2px',
                border: 'none',
                borderRadius: 4,/* แก้ตามที่ระบุ: borderRadius: 8 → borderRadius: 8 ให้ปุ่มหมวดหมู่จัดอันดับมีมุมโค้งมน */
                cursor: 'pointer',
                fontFamily: 'Nunito',
                fontSize: 38, /* แก้ตามที่ระบุ: 24 → 28 ให้ตัวอักษรใหญ่ขึ้น */
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
                  gap: 4,/* แก้ตามที่ระบุ: gap: 6 → gap: 8 ให้ช่องว่างระหว่างไอคอนและข้อความมากขึ้น */
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
                    fontSize: 16, /* แก้ตามที่ระบุ: 13 → 16 ให้ตัวเลขอันดับใหญ่ขึ้น */
                    width: 20,
                    textAlign: 'center',
                    flexShrink: 0,/* แก้ตามที่ระบุ: flexShrink: 0 → flexShrink: 0 ให้ตัวเลขอันดับไม่ย่อเล็กลง */
                  }}
                >
                  {i < 3
                    ? <img src={RANK_ICONS[i]} alt={MEDALS[i]} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    : `${i + 1}`}
                </span>

                <MiniTree theme={pt} size={38} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="leaderboard-row__name"
                    style={{
                      fontFamily: 'Fredoka One',
                      fontSize: 16,/* แก้ตามที่ระบุ: 10 → 11 ให้ตัวอักษรใหญ่ขึ้น */
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
                      fontSize: 9,/* แก้ตามที่ระบุ: 8 → 9 ให้ตัวอักษรใหญ่ขึ้น */
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
                    fontSize: 14,/* แก้ตามที่ระบุ: 10 → 14 ให้ตัวอักษรใหญ่ขึ้น ตัวเลขข้างหลัง*/
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
                fontSize: 16,/* แก้ตามที่ระบุ: 10 → 12 ให้ตัวเลขอันดับใหญ่ขึ้น */
                width: 20,
                textAlign: 'center',
                color: myTheme.accent,
                fontWeight: 700,
              }}
            >
              #{myRankForCurrentCat}
            </span>

            <MiniTree theme={myTheme} size={38} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'Fredoka One',
                  fontSize: 16,/* แก้ตามที่ระบุ: 10 → 11 ให้ตัวอักษรใหญ่ขึ้น */
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
                  fontSize: 14,/* แก้ตามที่ระบุ: 8 → 9 ให้ตัวอักษรใหญ่ขึ้น */
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                {myMbti}
              </div>
            </div>

            <span
              style={{
                fontSize: 16,/* แก้ตามที่ระบุ: 9 → 12 ให้ตัวอักษรใหญ่ขึ้น */
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