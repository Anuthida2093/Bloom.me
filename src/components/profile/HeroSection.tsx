import { useState } from 'react';
import {
  MBTI_TREE_THEME,
  DEFAULT_USER_DATA,
  DEFAULT_TREE_STATS,
  EXP_PER_LEVEL,
  type UserData,
  type TreeStats,
  type QuestLogEntry,
  type MbtiType,
} from '../../types';
import TreeOfLife from '../tree/TreeOfLife';
import GameAlert from '../ui/GameAlert';

const C_1 = '#B58A00'
const C_2 = 'rgba(255,214,10,.5)'
const C_3 = '#FFE8EE'
const C_4 = '#FFD0DC'
const C_5 = '#C23B6A'
const C_6 = '#E87EA0'

const TEXT_1 = C_1
const SHADOW_2 = C_2
const BG_3 = C_3
const BG_4 = C_4
const TEXT_5 = C_5
const TEXT_6 = C_6

/**
 * HeroSection
 * -----------
 * ส่วนหัวของ Dashboard: แสดงต้นไม้ (TreeOfLife, layered pre-drawn image) + สรุปสถิติ
 * ผู้ใช้แบบย่อ + ปุ่ม action หลัก
 *
 * props (backend-ready shape ตาม docs/DATA_DICTIONARY.md):
 *  - userData   : object ตรงกับ response ของ GET /users/me (ดู DEFAULT_USER_DATA)
 *  - treeStats  : object ตรงกับ response ของ GET /tree/me (ดู DEFAULT_TREE_STATS)
 *  - questLogs  : QuestLog[] ที่แนบ quest object มาด้วย (include: quest) ใช้นับ
 *                 เควสที่ทำสำเร็จวันนี้แยกตามหมวด (KNOWLEDGE / HEALTH / EMOTION)
 *  - onOpenLeaderboard / onOpenInventory / onOpenMood : เปิด modal ต่างๆ — เดิมรวมเป็น
 *    onUpdateState(partial: LegacyStateUpdate) ก้อนเดียว (พึ่ง type ที่ไม่มีอยู่แล้วหลังตัด
 *    LegacyState ทิ้งทั้งระบบ) ตอนนี้แยกเป็น callback เฉพาะทางให้ตรงเจตนาแต่ละปุ่มชัดเจนกว่า
 */
interface HeroSectionProps {
  userData?: UserData
  treeStats?: TreeStats
  questLogs?: QuestLogEntry[]
  onOpenLeaderboard?: () => void
  onOpenInventory?: () => void
  onOpenMood?: () => void
}

interface StatCard {
  icon: string
  label: string
  val: string
  color: string
}

interface GrowthBar {
  label: string
  val: number
  color: string
}

export default function HeroSection({
  userData = DEFAULT_USER_DATA,
  treeStats = DEFAULT_TREE_STATS,
  questLogs = [],
  onOpenLeaderboard = () => {},
  onOpenInventory = () => {},
  onOpenMood = () => {},
}: HeroSectionProps) {
  const theme = MBTI_TREE_THEME[userData.mbtiType as keyof typeof MBTI_TREE_THEME] ?? MBTI_TREE_THEME.INFP;
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // exp ที่ backend ส่งมาเป็นค่าสะสมรวม ไม่ใช่ exp เฉพาะเลเวลปัจจุบัน — คำนวณ
  // ส่วนที่เหลือใน "เลเวลนี้" ฝั่ง frontend เอง (EXP_PER_LEVEL = 100 คงที่)
  const expIntoLevel = userData.exp % EXP_PER_LEVEL;
  const expPct = Math.min(100, (expIntoLevel / EXP_PER_LEVEL) * 100);

  const completedKnowledge = questLogs.filter(
    (l) => l.status === 'COMPLETED' && l.quest?.category === 'KNOWLEDGE'
  ).length;
  const completedHealth = questLogs.filter(
    (l) => l.status === 'COMPLETED' && l.quest?.category === 'HEALTH'
  ).length;
  const completedEmotion = questLogs.filter(
    (l) => l.status === 'COMPLETED' && l.quest?.category === 'EMOTION'
  ).length;

  // สเกล stack (คะแนนสะสมดิบ) ให้เป็นเปอร์เซ็นต์แสดงผลแบบ 0-100 — เป็นการ
  // แปลงค่าเพื่อ "แสดงผล" ในฝั่ง frontend เท่านั้น ไม่ได้แก้ไขค่าที่ backend
  // เก็บจริง (STACK_PER_VISUAL_LEVEL = 50 คะแนนต่อ 1 level ภาพ, สมมติแคป
  // แถบที่ 5 level แรกเพื่อให้แถบเต็มพอดีสวยงาม ปรับตัวเลขนี้ได้ตามต้องการ)
  const toBarPct = (stack: number): number => Math.min(100, (stack / (50 * 5)) * 100);

  const statCards: StatCard[] = [
    { icon: '📚', label: 'ความรู้', val: userData.knowledgeStack.toLocaleString(), color: 'var(--g600)' },
    { icon: '💪', label: 'สุขภาพกาย', val: userData.healthStack.toLocaleString(), color: 'var(--b500)' },
    { icon: '🔥', label: 'Streak', val: `${userData.streak} วัน`, color: 'var(--orange)' },
    { icon: '🪙', label: 'Coins', val: userData.coins.toLocaleString(), color: TEXT_1 },
  ];

  const growthBars: GrowthBar[] = [
    { label: '📖 ลำต้น (ความรู้)', val: toBarPct(userData.knowledgeStack), color: 'var(--b500)' },
    { label: '🍃 ใบไม้ (จิตใจ)', val: toBarPct(userData.emotionStack), color: 'var(--purple)' },
    { label: '🌱 หญ้า/ดิน (สุขภาพ)', val: toBarPct(userData.healthStack), color: 'var(--g600)' },
  ];

  return (
    <section
      style={{
        background: `linear-gradient(160deg, ${theme.leaves[2] ?? theme.leaves[0]}33 0%, var(--g100) 50%, var(--b50) 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs (z-index ต่ำสุด ไม่ชนกับอะไร เพราะ pointerEvents none) */}
      <div
        style={{
          position: 'absolute', top: -80, right: -80, width: 280, height: 280,
          borderRadius: '50%', background: `${theme.leaves[0]}18`, pointerEvents: 'none', zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: 40, left: -60, width: 200, height: 200,
          borderRadius: '50%', background: `${theme.leaves[0]}12`, pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* เนื้อหาหลัก: ใช้ CSS grid แบบ responsive แทน flex + absolute เดิม
          เพื่อไม่ให้ panel/ปุ่มซ้อนทับกันในจอเล็ก — เรียงเป็นคอลัมน์เดียวบนมือถือ
          แล้วขยายเป็น 3 คอลัมน์ (สถิติ / ต้นไม้ / วันนี้) บนจอ lg ขึ้นไป */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_220px]"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '24px 20px 32px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* คอลัมน์ซ้าย: สรุประดับต้นไม้ + สถิติด่วน */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: '16px 18px', border: `2px solid ${theme.accent ?? theme.trunk}33` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n300)', marginBottom: 6 }}>
              ต้นไม้ของคุณ
            </div>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 22, color: theme.accent ?? 'var(--g700)' }}>
              {treeStats.treeType}
            </div>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 16, color: 'var(--n700)', marginBottom: 10 }}>
              ระดับ {treeStats.level}
            </div>
            <div style={{ height: 10, background: 'var(--g100)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
              <div
                style={{
                  height: '100%', width: `${expPct}%`,
                  background: `linear-gradient(90deg, ${theme.accent ?? theme.trunk}, var(--exp))`,
                  borderRadius: 99, boxShadow: `0 0 8px ${SHADOW_2}`, transition: 'width .6s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--n300)', fontWeight: 700 }}>
              {expIntoLevel} / {EXP_PER_LEVEL} EXP (เลเวล {userData.level})
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {statCards.map((s) => (
              <div key={s.label} className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Fredoka One', fontSize: 15, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--n300)', fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n500)', marginBottom: 10 }}>การเติบโต</div>
            {growthBars.map((g) => (
              <div key={g.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--n700)', marginBottom: 4 }}>
                  <span>{g.label}</span>
                  <span style={{ color: g.color }}>{Math.round(g.val)}%</span>
                </div>
                <div style={{ height: 7, background: 'var(--n100)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.val}%`, background: g.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* คอลัมน์กลาง: ต้นไม้ + ปุ่ม action (แถวเดียวใต้ต้นไม้ ไม่ลอยทับกันแล้ว) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          {/* [รีไรท์ TreeOfLife.tsx] เปลี่ยนจาก canvas (p5.js) เป็น layered image — signature
              prop เดิมยังตรงกันอยู่ (mbtiType/trunkBranchLevel/leafFlowerLevel/grassSoilLevel/
              riskLevel) จึงไม่ต้องแก้อะไรเพิ่มตรงนี้ นอกจาก import path ด้านบน */}
          <TreeOfLife
            mbtiType={userData.mbtiType as MbtiType}
            trunkBranchLevel={treeStats.trunkBranchLevel}
            leafFlowerLevel={treeStats.leafFlowerLevel}
            grassSoilLevel={treeStats.grassSoilLevel}
            riskLevel={userData.currentRiskLevel}
          />

          <div
            className="flex flex-wrap"
            style={{ gap: 10, justifyContent: 'center', width: '100%' }}
          >
            <button
              onClick={onOpenLeaderboard}
              style={heroBtnStyle('var(--g200)')}
            >
              🏆 จัดอันดับ
            </button>
            <button
              onClick={onOpenInventory}
              style={heroBtnStyle('var(--b100)')}
            >
              🪴 ตกแต่ง
            </button>
            <button
              onClick={() => setAlertMessage('แชร์ลิงก์ต้นไม้ของคุณ!')}
              style={{
                ...heroBtnStyle(theme.accent ?? theme.trunk),
                background: `linear-gradient(135deg, ${theme.accent ?? theme.trunk}, ${theme.accent ?? theme.trunk}CC)`,
                color: 'var(--fixed-white)', border: 'none',
              }}
            >
              🌲 แชร์ต้นไม้
            </button>
          </div>
        </div>

        {/* คอลัมน์ขวา: สรุปเควสวันนี้ + ปุ่มเช็คอินอารมณ์ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 16, color: 'var(--g800)', marginBottom: 12 }}>
              📋 วันนี้
            </div>
            {[
              { icon: '📚', label: 'ความรู้', done: completedKnowledge, total: 5, color: 'var(--g600)' },
              { icon: '💪', label: 'สุขภาพกาย', done: completedHealth, total: 4, color: 'var(--orange)' },
              { icon: '🌸', label: 'สุขภาพจิต', done: completedEmotion, total: 2, color: 'var(--purple)' },
            ].map((q) => (
              <div key={q.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--n700)' }}>{q.icon} {q.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: q.color }}>{q.done}/{q.total}</span>
                </div>
                <div style={{ height: 6, background: 'var(--n100)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(q.done / q.total) * 100}%`, background: q.color, borderRadius: 99, transition: 'width .4s' }} />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onOpenMood}
            style={{
              background: `linear-gradient(135deg, ${BG_3}, ${BG_4})`, border: '2px solid var(--pink)',
              borderRadius: 'var(--r-md)', padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            }}
          >
            <span style={{ fontSize: 26 }}>🌤️</span>
            <div>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 14, color: TEXT_5 }}>เช็คอินอารมณ์</div>
              <div style={{ fontSize: 11, color: TEXT_6, fontWeight: 600 }}>บอกต้นไม้ว่าวันนี้เป็นยังไง</div>
            </div>
          </button>
        </div>
      </div>

      {/* Wave bottom */}
      <svg viewBox="0 0 1440 50" preserveAspectRatio="none" style={{ display: 'block', marginTop: -1, width: '100%', position: 'relative', zIndex: 1 }}>
        <path d="M0 25 Q360 50 720 25 Q1080 0 1440 25 L1440 50 L0 50 Z" fill="var(--n50)" />
      </svg>

      <GameAlert open={alertMessage !== null} message={alertMessage ?? ''} icon="🌲" onClose={() => setAlertMessage(null)} />
    </section>
  );
}

function heroBtnStyle(borderColor: string): React.CSSProperties {
  return {
    background: 'var(--glass-w-92)',
    backdropFilter: 'blur(8px)',
    border: `2px solid ${borderColor}`,
    borderRadius: 16,
    padding: '10px 16px',
    cursor: 'pointer',
    boxShadow: 'var(--sh-card)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'Fredoka One',
    fontSize: 13,
    color: 'var(--g700)',
    transition: 'transform .15s',
  };
}