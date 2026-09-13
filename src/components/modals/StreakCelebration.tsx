import { useState, useEffect, type CSSProperties } from 'react'
import { type InventoryItem } from '../../types'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useAudio } from '../../context/AudioContext'

const C_1 = 'rgba(0,0,0,.75)'
const C_2 = 'rgba(244,196,48,.4)'
const C_3 = 'rgba(244,196,48,.15)'
const C_4 = 'rgba(244,196,48,.5)'
const C_5 = '#E8F5EC'
const C_6 = 'rgba(244,196,48,.5)'
const C_7 = 'rgba(244,196,48,.1)'
const C_8 = 'rgba(244,196,48,.4)'
const C_9 = 'rgba(244,196,48,.15)'
const C_10 = '#FF8C42'
const C_11 = '#1A1F1B'
const C_12 = 'rgba(244,196,48,.5)'

const BG_1 = C_1
const SHADOW_2 = C_2
const BG_3 = C_3
const BORDER_4 = C_4
const TEXT_5 = C_5
const SHADOW_6 = C_6
const BG_7 = C_7
const BORDER_8 = C_8
const BG_9 = C_9

const CONFETTI_COLORS = ['var(--coin)','var(--pink)','var(--g400)','var(--purple)','var(--blue)','var(--orange)','var(--exp)','var(--g600)',C_10,'var(--g200)']

interface Reward {
  item: string
  emoji: string
  label: string
  desc: string
}

const REWARDS: Record<number, Reward> = {
  7:  { item: 'golden-crown',        emoji: '👑', label: 'มงกุฎทอง', desc: 'ไอเทมตกแต่งพิเศษ — หาซื้อในร้านไม่ได้!' },
  30: { item: 'glowing-butterfly',  emoji: '🦋', label: 'ผีเสื้อเรืองแสง', desc: 'ตำนาน — รางวัลสำหรับผู้อุทิศตน 30 วัน!' },
}

// รางวัลสำรอง เผื่อ days ที่ส่งเข้ามาไม่ตรงกับ milestone ที่กำหนดไว้ (7 หรือ 30)
// ป้องกัน reward เป็น undefined แล้วพังตอนอ่าน reward.item
const FALLBACK_REWARD: Reward = { item: 'golden-crown', emoji: '🎁', label: 'ของขวัญพิเศษ', desc: 'รางวัลพิเศษสำหรับความมุ่งมั่นของคุณ!' }

interface StreakCelebrationProps {
  days: number
  /** [ตัวแปรตรง backend] เดิมรับ state.ownedItems (array ที่แปลงมาแล้ว) — ตอนนี้รับ
   *  InventoryItem[] ตรงจาก backend แล้วเช็ค shopItemId เองในนี้ */
  inventoryData?: InventoryItem[]
  onClaim?: (itemId: string) => void
  onClose?: () => void
}

export default function StreakCelebration({ days, inventoryData = [], onClaim = () => {}, onClose = () => {} }: StreakCelebrationProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)
  const { playGameSound } = useAudio()
  const reward = REWARDS[days] ?? FALLBACK_REWARD
  const [chestOpen, setChestOpen] = useState(false)
  const [claimed, setClaimed] = useState(inventoryData.some((i) => i.shopItemId === reward.item))
  const [confettiKey, setConfettiKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setChestOpen(true); setConfettiKey(k => k + 1) }, 600)
    return () => clearTimeout(t)
  }, [])

  const handleClaim = () => {
    if (claimed) return
    onClaim(reward.item)
    setClaimed(true)
    setConfettiKey(k => k + 1)
    // [ใหม่] เล่นเสียงตอนรับรางวัล/streak
    playGameSound('reward-claim')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: BG_1,
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Confetti rain */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} key={confettiKey}>
        {Array.from({ length: 36 }).map((_, i) => {
          const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
          const cx = (i * 2.78)  // spread 0-100%
          const csx = -30 + (i % 7) * 10
          const delay = i * 60
          const rot = (i % 2 === 0 ? 1 : -1) * (400 + (i % 5) * 80)
          const size = 6 + (i % 4) * 3
          const confettiStyle = {
            position: 'absolute',
            left: `${cx}%`,
            top: -20,
            width: size, height: size,
            borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
            background: color,
            '--cx': '0px',
            '--csx': `${csx}px`,
            '--cr': `${rot}deg`,
            animation: `confettiRain ${1200 + delay}ms ${delay}ms ease-in forwards`,
            transform: `rotate(${i * 20}deg)`,
          } as CSSProperties
          return <div key={i} style={confettiStyle} />
        })}
      </div>

      {/* Modal box */}
      <div style={{
        background: 'linear-gradient(160deg, var(--g800), var(--g900))',
        borderRadius: 32, padding: '40px 32px', maxWidth: 400, width: '100%',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        boxShadow: `0 32px 80px var(--glass-b-60), 0 0 0 1.5px ${SHADOW_2}`,
        animation: 'celebPop .65s cubic-bezier(.2,.8,.4,1) forwards',
      }}>
        {/* Gold accent top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, transparent, var(--coin), var(--exp), var(--coin), transparent)' }} />

        {/* Star burst radials */}
        {[0,45,90,135,180,225,270,315].map((a,i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 180, height: 2,
            background: `linear-gradient(90deg, transparent, rgba(244,196,48,${0.04 + (i%2)*0.03}), transparent)`,
            transform: `rotate(${a}deg)`,
            transformOrigin: 'left center',
          }} />
        ))}

        {/* Streak badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: BG_3, border: `1.5px solid ${BORDER_4}`, borderRadius: 99, padding: '6px 18px', marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <span style={{ fontFamily: 'Fredoka One', fontSize: 16, color: 'var(--coin)' }}>{days} วัน Streak!</span>
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: 'Fredoka One', fontSize: 28, color: TEXT_5, marginBottom: 8, lineHeight: 1.3 }}>
          ยอดเยี่ยมมาก! 🎉
        </h2>
        <p style={{ fontSize: 14, color: 'var(--g300)', lineHeight: 1.6, marginBottom: 28 }}>
          คุณรดน้ำต้นไม้แห่งความพยายาม<br />
          มาครบ <strong style={{ color: 'var(--coin)' }}>{days} วัน</strong> แล้ว ต้นไม้ของคุณ<br />
          เติบโตอย่างน่าภาคภูมิใจมาก!
        </p>

        {/* Treasure chest */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
          <div style={{ fontSize: 90, lineHeight: 1, filter: `drop-shadow(0 8px 24px ${SHADOW_6})` }}>
            {chestOpen ? '📦' : '🎁'}
          </div>
          {chestOpen && (
            <div style={{
              position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
              fontSize: 44,
              animation: 'celebPop .5s .15s cubic-bezier(.2,.8,.4,1) both',
            }}>
              {reward.emoji}
            </div>
          )}
        </div>

        {/* Reward info */}
        {chestOpen && (
          <div style={{ animation: 'slideUp .5s .3s ease both' }}>
            <div style={{ background: BG_7, border: `1.5px solid ${BORDER_8}`, borderRadius: 20, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 22, color: 'var(--coin)', marginBottom: 4 }}>{reward.emoji} {reward.label}</div>
              <div style={{ fontSize: 13, color: 'var(--g300)' }}>{reward.desc}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: BG_9, borderRadius: 99, padding: '4px 12px', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--coin)', fontWeight: 800 }}>✦ EXCLUSIVE</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaim}
              disabled={claimed}
              style={{
                width: '100%', padding: '14px', border: 'none',
                borderRadius: 'var(--r-pill)',
                background: claimed ? 'var(--glass-w-10)' : 'linear-gradient(135deg, var(--coin), var(--exp))',
                color: claimed ? 'var(--glass-w-40)' : C_11,
                fontFamily: 'Fredoka One', fontSize: 18,
                cursor: claimed ? 'default' : 'pointer',
                boxShadow: claimed ? 'none' : `0 6px 20px ${C_12}`,
                transition: 'all .2s', marginBottom: 12,
              }}>
              {claimed ? '✓ รับไอเทมแล้ว' : '🎁 รับไอเทม'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ width: '100%', padding: '10px', border: '1.5px solid var(--glass-w-15)', borderRadius: 'var(--r-pill)', background: 'transparent', color: 'var(--glass-w-50)', fontFamily: 'Nunito', fontSize: 14, cursor: 'pointer' }}>
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  )
}