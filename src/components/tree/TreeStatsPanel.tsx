import {
  MBTI_TREE_THEME,
  DEFAULT_USER_DATA,
  DEFAULT_TREE_STATS,
  EXP_PER_LEVEL,
  STACK_PER_VISUAL_LEVEL,
  type UserData,
  type TreeStats,
  type MbtiType,
} from '../../types'
import TreeInfoPanel from './TreeInfoPanel'
import { useLanguage } from '../../context/LanguageContext'
import { BADGE_ICONS } from '../../config/iconAssets'

const C_3 = '#8B6000'

const TEXT_1 = C_3

interface TreeStatsPanelProps {
  userData?: UserData
  treeStats?: TreeStats
  onOpenMoodCheckin?: () => void
  /** วันที่ไม่ได้ทำเควสหมวดจิตใจ/สุขภาพกาย — ใช้แสดงคำเตือนใบเหี่ยว/ดินแห้ง */
  daysSinceLastMentalQuest?: number | null
  daysSinceLastPhysicalQuest?: number | null
  onClose?: () => void
}

// สเกล stack (คะแนนสะสมดิบ) ให้เป็นเปอร์เซ็นต์แสดงผล 0-100 — เหมือนที่ HeroSection.tsx ใช้
// (STACK_PER_VISUAL_LEVEL = 50 คะแนนต่อ 1 level ภาพ, แคปแถบที่ 5 level แรก) เป็นการแปลงค่า
// เพื่อ "แสดงผล" ฝั่ง frontend เท่านั้น ไม่ได้แก้ไขค่าที่ backend เก็บจริง
const toBarPct = (stack: number): number => Math.min(100, (stack / (STACK_PER_VISUAL_LEVEL * 5)) * 100)

export default function TreeStatsPanel({
  userData = DEFAULT_USER_DATA,
  treeStats = DEFAULT_TREE_STATS,
  onOpenMoodCheckin = () => {},
  daysSinceLastMentalQuest = null,
  daysSinceLastPhysicalQuest = null,
  onClose = () => {},
}: TreeStatsPanelProps) {
  const theme = MBTI_TREE_THEME[userData.mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP
  const { t } = useLanguage()
  const expIntoLevel = userData.exp % EXP_PER_LEVEL
  const expPct = Math.min(100, (expIntoLevel / EXP_PER_LEVEL) * 100)

  const growthStats = [
    { icon: '🧠', label: t('stats.learning'), sub: t('stats.subTrunk'), val: toBarPct(userData.knowledgeStack), color: 'var(--b500)' },
    { icon: '💪', label: t('stats.physical'), sub: t('stats.subMeadow'), val: toBarPct(userData.healthStack), color: 'var(--g600)' },
    { icon: '❤️', label: t('stats.mental'), sub: t('stats.subLeaves'), val: toBarPct(userData.emotionStack), color: 'var(--purple)' },
  ]

  // [ตัวแปรตรง backend] เดิมโชว์ learningHours/stepsTotal ซึ่งไม่มี field แบบนี้ใน backend
  // เลย (ไม่มีใน docs/VARIABLE_DICTIONARY.md) — เปลี่ยนมาโชว์ค่าที่มาจาก backend จริงแทน
  // [แก้ตามที่ระบุ] เพิ่ม field img ให้ 3 ตัวที่มีไฟล์รูปจริง (เลเวล/Streak/Coins) — "ต้นไม้"
  // (🌳) ไม่อยู่ในตารางแทนอีโมจิรอบนี้ (ไม่มีแถวระบุไว้ชัดเจน) ยังคง emoji เดิมไว้ก่อน
  const quickStats = [
    { icon: '⭐', img: BADGE_ICONS.exp, label: t('stats.level'), val: `Lv.${userData.level}`, color: 'var(--b500)' },
    { icon: '🌳', img: undefined as string | undefined, label: t('stats.tree'), val: `Lv.${treeStats.level}`, color: theme.accent },
    { icon: '🔥', img: BADGE_ICONS.streak, label: 'Streak', val: `${userData.streak}d`, color: 'var(--orange)' },
    { icon: '🪙', img: BADGE_ICONS.coins, label: 'Coins', val: userData.coins.toLocaleString(), color: TEXT_1 },
  ]

  return (
    /* [แก้ตามที่ระบุ] รวมเข้ากรอบ "ข้อมูลต้นไม้" (TreeInfoPanel) — กรอบ/สี/ฟอนต์แบบกระดานจัดอันดับ
       ข้อมูลต้นไม้อยู่บน สถิติการเติบโต/EXP/ปุ่มเช็คอินต่อท้ายในกรอบเดียวกัน จอเล็กเต็มจอ */
    <TreeInfoPanel
      mbtiType={(userData.mbtiType as MbtiType) ?? null}
      trunkBranchLevel={treeStats.trunkBranchLevel}
      leafFlowerLevel={treeStats.leafFlowerLevel}
      grassSoilLevel={treeStats.grassSoilLevel}
      riskLevel={userData.currentRiskLevel}
      daysSinceLastMentalQuest={daysSinceLastMentalQuest}
      daysSinceLastPhysicalQuest={daysSinceLastPhysicalQuest}
      onClose={onClose}
    >
      <div className="tree-stats-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* EXP */}
        <div className="tree-stats-panel__section" style={{ animationDelay: '60ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: 'var(--text-sub)', marginBottom: 5 }}>
            <span>EXP</span><span>{expIntoLevel.toLocaleString()} / {EXP_PER_LEVEL.toLocaleString()}</span>
          </div>
          <div className="tree-stats-panel__exp-track" style={{ height: 10, background: 'var(--g100)', borderRadius: 99, overflow: 'hidden' }}>
            <div className="tree-stats-panel__exp-fill" style={{ height: '100%', width: `${expPct}%`, background: `linear-gradient(90deg, ${theme.accent}, var(--exp))`, borderRadius: 99 }} />
          </div>
        </div>

        {/* 3 growth stats */}
        <div className="tree-stats-panel__section" style={{ animationDelay: '120ms' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-sub)', marginBottom: 10 }}>{t('stats.status')}</div>
          {growthStats.map(s => (
            <div key={s.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <div>
                  <span style={{ fontSize: 13 }}>{s.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginLeft: 4 }}>{s.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: s.color }}>{Math.round(s.val)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 7, background: 'var(--n100)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.val}%`, background: s.color, borderRadius: 99, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, width: 30, textAlign: 'right' }}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick stats (ปรับเป็น grid แบบ Responsive: บนมือถือเรียง 4 ใบแถวเดียว / บนคอมเรียงเป็น 2x2) */}
        <div className="tree-stats-panel__section grid grid-cols-4 md:grid-cols-2 gap-1.5" style={{ animationDelay: '180ms' }}>
          {quickStats.map(s => (
            <div key={s.label} className="tree-stats-panel__quick-stat" style={{ background: 'var(--bg)', borderRadius: 10, padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15 }}>{s.img ? <img src={s.img} className="icon-img" alt="" /> : s.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: s.color, wordBreak: 'break-word' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mood check-in button */}
        <button
          onClick={onOpenMoodCheckin}
          className="tree-stats-panel__section tree-stats-panel__mood-btn"
          style={{ animationDelay: '240ms', width: '100%', padding: '11px', border: '2px solid var(--ti-text, var(--text))', borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--fixed-white) 35%, transparent)', color: 'var(--ti-text, var(--text))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img src={BADGE_ICONS.checkin} className="icon-img" style={{ fontSize: 22 }} alt="" />
          <div style={{ textAlign: 'left' }}>
            {/* [แก้ตามที่ระบุ] ไม่ใช้ชมพูแล้ว — ดำ (ธีมสว่าง) / ขาว (ธีมมืด) ตามตัวหนังสือของแผง */}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13 }}>{t('stats.moodTitle')}</div>
            <div style={{ fontSize: 10, fontWeight: 600, opacity: .8 }}>{t('stats.moodSub')}</div>
          </div>
        </button>

        <style>{`
          @keyframes treeStatsSectionFadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .tree-stats-panel__section {
            animation: treeStatsSectionFadeUp .45s cubic-bezier(.22,1,.36,1) both;
          }
          .tree-stats-panel__exp-fill {
    --lc-shadow-2: rgba(255,214,10,.4);
    box-shadow: 0 0 6px var(--lc-shadow-2);
    transition: width .6s ease;
    animation: treeStatsExpGlow 2.4s ease-in-out infinite;
  }
          @keyframes treeStatsExpGlow {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.12); }
          }
          .tree-stats-panel__quick-stat {
            transition: transform .15s ease, box-shadow .15s ease;
          }
          .tree-stats-panel__quick-stat:hover {
            transform: translateY(-2px);
            box-shadow: var(--sh-card);
          }
          .tree-stats-panel__mood-btn {
            transition: transform .15s ease, box-shadow .15s ease;
          }
          .tree-stats-panel__mood-btn:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 6px 16px var(--glass-b-20);
  }
          @media (prefers-reduced-motion: reduce) {
            .tree-stats-panel__section, .tree-stats-panel__exp-fill { animation: none; }
          }
        `}</style>
      </div>
    </TreeInfoPanel>
  )
}