import { useEffect, useState } from 'react';
import { MBTI_TREE_THEME, type MbtiType } from '../../types';
import MiniTree from '../tree/MiniTree';
import { RANK_CATEGORIES, MOCK_LEADERBOARD_PLAYERS, type LeaderboardPlayer, type RankCategory } from '../../config/leaderboardData';
import { BADGE_ICONS, RANK_CATEGORY_ICONS } from '../../config/iconAssets';
import './leaderboardRow.css';

const C_3 = 'rgba(244,196,48,.12)'
const C_4 = 'rgba(180,180,180,.1)'
const C_5 = 'rgba(244,132,95,.1)'

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

  /* [ย่อขนาด + กรอบใหม่ — Part D] กรอบเขียวเข้มขอบทอง + ป้ายหัวข้อแบบม้วนกระดาษลอยทับขอบบน
     + แผ่นเนื้อหาสีครีมขอบบาง + ป้ายชื่อ "อันดับของฉัน" แยกเป็นแถบล่าง (สไตล์อยู่ใน
     leaderboardRow.css — .lb-frame*) ภาพกรอบประดับจริงตามภาพอ้างอิงยังไม่มีไฟล์ใน
     public/assets/images/ui/frames/ นี่คือเวอร์ชัน CSS ที่ใกล้เคียงที่สุดไปก่อน */
  return (
    <div
      style={{
        // จอแคบ: .dashboard__panel จำกัดไว้ที่ 44vw — ย่อตามไม่ให้กรอบล้นช่อง (ชื่อยาวตัด … เอง)
        width: collapsed ? 0 : 'min(190px, 44vw)',
        flexShrink: 0,
        transition: 'width .3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* ปุ่มเปิด/ปิด (‹ ›) — อยู่นอกเงื่อนไข collapsed เพื่อให้คงอยู่เสมอ */}
      <button
        onClick={onToggle}
        title={collapsed ? 'กางกระดานจัดอันดับ' : 'ซ่อนกระดานจัดอันดับ'}
        aria-label={collapsed ? 'กางกระดานจัดอันดับ' : 'ซ่อนกระดานจัดอันดับ'}
        className="lb-toggle"
        style={{
          top: 24,
          left: collapsed ? 0 : '100%',
          transform: collapsed ? 'none' : 'translateX(-50%)',
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      <div
        className="lb-frame"
        style={{
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : 'auto',
          visibility: collapsed ? 'hidden' : 'visible',
        }}
      >
        {/* ป้ายหัวข้อแบบม้วนกระดาษ ลอยทับขอบบนของกรอบ */}
        <div className="lb-frame__banner">
          <img src={BADGE_ICONS.trophy} className="icon-img" alt="" /> จัดอันดับ
        </div>

        {/* แผ่นเนื้อหาสีครีม: แท็บหมวด + รายชื่อ */}
        <div className="lb-frame__sheet">
          <div className="lb-frame__tabs">
            {RANK_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                title={c.label}
                aria-label={c.label}
                aria-pressed={cat === c.id}
                className={`lb-frame__tab${cat === c.id ? ' lb-frame__tab--active' : ''}`}
              >
                {RANK_CATEGORY_ICONS[c.id] ? <img src={RANK_CATEGORY_ICONS[c.id]} className="icon-img" alt="" /> : c.icon}
              </button>
            ))}
          </div>

          <div className="lb-frame__list no-scroll">
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
                    gap: 5,
                    padding: '3px 5px',
                    borderRadius: 8,
                    marginBottom: 2,
                    background: i < 3 ? [C_3, C_4, C_5][i] : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0, color: 'var(--text-sub)' }}>
                    {i < 3
                      ? <img src={RANK_ICONS[i]} alt={MEDALS[i]} style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }} />
                      : `${i + 1}`}
                  </span>

                  <MiniTree theme={pt} size={28} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="leaderboard-row__name"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 13,
                        lineHeight: 1.2,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {p.username}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.2 }}>
                      {p.mbtiType}
                    </div>
                  </div>

                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--g600)', flexShrink: 0 }}>
                    {cat === 'level' ? p.level : p[cat]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ป้ายชื่อด้านล่าง: อันดับของฉัน */}
        <div className="lb-frame__plate" style={{ borderColor: myTheme.accent + '88' }}>
          <span style={{ fontSize: 12, width: 22, textAlign: 'center', color: myTheme.accent, fontWeight: 800, flexShrink: 0 }}>
            #{myRankForCurrentCat}
          </span>

          <MiniTree theme={myTheme} size={26} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                lineHeight: 1.2,
                color: myTheme.accent,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {myName || 'คุณ'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.2 }}>
              {myMbti}
            </div>
          </div>

          <span style={{ fontSize: 11, color: myTheme.accent, fontWeight: 800, flexShrink: 0 }}>ฉัน</span>
        </div>
      </div>
    </div>
  );
}
