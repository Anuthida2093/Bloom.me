import { motion, AnimatePresence } from 'framer-motion'
import type { QuestDef } from '../../config/questCatalog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Z_INDEX } from '../../config/zIndex'
import { uiSounds } from '../../utils/uiSounds'
import { playSfx } from '../../utils/audioPlayer'
import { useAppContext } from '../../context/AppContext'
import { BADGE_ICONS, QUEST_ICONS } from '../../config/iconAssets'

const C_1 = 'rgba(10,25,20,.55)'
const C_2 = '#FFF9C4'
const C_3 = '#8B6000'

const BG_1 = C_1
const BG_2 = C_2
const TEXT_3 = C_3

interface QuestConfirmModalProps {
  quest: QuestDef | null
  stageLabel?: string
  accent: string
  accentBg: string
  locked?: boolean
  completed?: boolean
  onStart: () => void
  onCancel: () => void
}

/**
 * QuestConfirmModal — [รีดีไซน์ธีม Fantasy ด้วย Framer Motion] หน้าจอ "ยืนยันก่อนเริ่ม"
 * ที่โผล่ขึ้นมาตอนกด node บนแผนที่หรือกดการ์ดเควสจากลิสต์
 *
 * [ใหม่รอบนี้] เดิมใช้ CSS keyframes ล้วนๆ ไม่มี exit animation ตอนปิด (แค่ unmount ทันที) —
 * ตอนนี้ห่อด้วย <AnimatePresence> ให้เล่น exit animation ตอนปิดด้วย (การ์ดหด+จางหายแบบ
 * นุ่มนวล ไม่ใช่หายวับไปทันที) เพิ่ม "aura" วงแหวนเรืองแสงเต้นจังหวะหลังไอคอนเควส และ
 * ประกายดาวลอยกระจายรอบการ์ดตอนเปิด ให้ความรู้สึกเวทมนตร์แบบ Ghibli มากขึ้นตามที่ขอ
 *
 * [3-Pane layout] position: 'absolute' (ไม่ใช่ 'fixed') — ครอบแค่พื้นที่ของ GameplayFrame
 * ("กรอบเขียว") ที่เป็นพ่อ (ต้องมี position:relative) เท่านั้น ไม่ใช่ทั้งจอ
 */
export default function QuestConfirmModal({ quest, stageLabel, accent, accentBg, locked, completed, onStart, onCancel }: QuestConfirmModalProps) {
  useEscapeKey(onCancel, !!quest)
  const { settings } = useAppContext()
  const sfxOpts = { volume: settings.sfxVolume, enabled: settings.soundEnabled }

  return (
    <AnimatePresence>
      {quest && (
        <motion.div
          className="quest-confirm-backdrop"
          style={{
            position: 'absolute', inset: 0, zIndex: Z_INDEX.confirmModal,
            background: BG_1, backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
          {/* ประกายดาวลอยกระจายรอบการ์ด — เล่นแค่ตอนเข้าฉากเดียว */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.span
              key={i}
              className="quest-confirm-sparkle"
              style={{ '--sparkle-angle': `${(360 / 8) * i}deg` } as React.CSSProperties}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.6] }}
              transition={{ duration: 1.1, delay: 0.15 + i * 0.04, ease: 'easeOut' }}
            >
              ✨
            </motion.span>
          ))}

          <motion.div
            className="quest-confirm-card"
            style={{
              background: 'var(--fixed-white)', borderRadius: 28, width: '100%', maxWidth: 380,
              overflow: 'hidden', boxShadow: `0 28px 70px var(--glass-b-35), 0 0 0 1.5px ${accent}33`,
              position: 'relative',
            }}
            initial={{ opacity: 0, scale: 0.82, y: 24, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 14, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header ไล่สีตาม accent ของหมวดเควส */}
            <div style={{ background: `linear-gradient(160deg, ${accent}, ${accent}CC)`, padding: '24px 20px 28px', position: 'relative', overflow: 'hidden' }}>
              <button
                onClick={() => { uiSounds.cancel(); onCancel() }}
                title="ปิด"
                style={{
                  position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 99,
                  border: 'none', background: 'var(--glass-w-22)', color: 'var(--fixed-white)', cursor: 'pointer',
                  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                }}
              >
                <img src={BADGE_ICONS.close} className="icon-img" alt="" />
              </button>

              <div style={{ textAlign: 'center', position: 'relative' }}>
                {stageLabel && <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--glass-w-80)', marginBottom: 2 }}>{stageLabel}</div>}

                {/* [ใหม่] Aura เรืองแสงเต้นจังหวะหลังไอคอน — วงกลมเบลอเรืองแสงขยาย-หดวน */}
                <div className="quest-confirm-icon-wrap">
                  <span className="quest-confirm-aura" />
                  <motion.span
                    className="quest-confirm-icon"
                    style={{ fontSize: 4, filter: 'drop-shadow(0 6px 12px var(--glass-b-25))', position: 'relative' }}
                    animate={{ y: [0, -6, 0], rotate: [0, -4, 4, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* [แก้ตามที่ระบุ] ใช้รูปจริงตามชื่อเควส (QUEST_ICONS[quest.code]) แทน
                        emoji เดิม — เควสที่ยังไม่มีไฟล์จริง (know-guardian-of-rest,
                        know-ten-year-forest) ยัง fallback เป็น quest.icon (emoji) เหมือนเดิม */}
                    {QUEST_ICONS[quest.code]
                      ? <img src={QUEST_ICONS[quest.code]} alt={quest.titleTh} style={{ width: 350, height: 160, objectFit: 'contain' }} />
                      : quest.icon}
                  </motion.span>
                </div>

                <div style={{ fontFamily: 'Fredoka One', fontSize: 20, color: 'var(--fixed-white)', marginTop: 4 }}>{quest.titleTh}</div>
                <div style={{ fontSize: 18, color: 'var(--glass-w-75)' }}>{quest.title}</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 22px 22px' }}>
              <p style={{ fontSize: 16, color: 'var(--n500)', lineHeight: 1.65, marginBottom: 10, textAlign: 'center' }}>{quest.desc}</p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
                {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 7] ย้ายตัวเลขไว้หน้ารูป + ขยายรูปให้ใหญ่ชัดเจน
                    ขึ้น (icon-img--reward) แทน icon-img ตัวเล็กเดิม */}
                <span className="tag" style={{ background: BG_2, color: TEXT_3, border: '1px solid var(--coin)' }}>+{quest.coinReward} <img src={BADGE_ICONS.coins} className="icon-img--reward" alt="" /></span>
                <span className="tag" style={{ background: accentBg, color: accent, border: `1px solid ${accent}55` }}>+{quest.expReward} EXP <img src={BADGE_ICONS.exp} className="icon-img--reward" alt="" /></span>
              </div>

              {locked ? (
                <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 16, color: 'var(--n300)', fontWeight: 400 }}>
                  🔒 ล็อกอยู่ — ทำเควสอื่นให้สำเร็จก่อน
                </div>
              ) : completed ? (
                <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 16, color: accent, fontWeight: 500 }}>
                  ✅ ทำสำเร็จแล้ววันนี้
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <motion.button
                    onClick={() => { playSfx('CLICK', sfxOpts); onStart() }}
                    style={{
                      width: '100%', padding: '13px', border: 'none', borderRadius: 16,
                      background: `linear-gradient(135deg, ${accent}, ${accent}CC)`, color: 'var(--fixed-white)',
                      fontFamily: 'Fredoka One', fontSize: 15, cursor: 'pointer', boxShadow: `0 8px 20px ${accent}44`,
                    }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ y: 1, scale: 0.98 }}
                  >
                    🚩 เริ่มทำภารกิจ
                  </motion.button>
                  <button
                    onClick={() => { uiSounds.cancel(); onCancel() }}
                    style={{
                      width: '100%', padding: '11px', border: '1.5px solid var(--n200)', borderRadius: 16,
                      background: 'var(--fixed-white)', color: 'var(--n500)', fontFamily: 'Nunito', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <style>{`
            .quest-confirm-sparkle {
              position: absolute; top: 50%; left: 50%; font-size: 16px;
              transform: translate(-50%, -50%) rotate(var(--sparkle-angle)) translateY(-160px);
              pointer-events: none;
            }

            .quest-confirm-icon-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
            .quest-confirm-aura {
              position: absolute; width: 90px; height: 90px; border-radius: 50%;
              background: radial-gradient(circle, var(--glass-w-55), transparent 70%);
              animation: questConfirmAuraPulse 2.4s ease-in-out infinite;
            }
            @keyframes questConfirmAuraPulse {
              0%, 100% { opacity: .5; transform: scale(1); }
              50% { opacity: .9; transform: scale(1.25); }
            }

            @media (prefers-reduced-motion: reduce) {
              .quest-confirm-aura { animation: none; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}