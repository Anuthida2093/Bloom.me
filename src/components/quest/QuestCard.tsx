import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

const CONFETTI_COLORS = ['var(--coin)', 'var(--pink)', 'var(--g400)', 'var(--purple)', 'var(--blue)', 'var(--orange)', 'var(--exp)', 'var(--g600)']

function Confetti({ active }: { active: boolean }) {
  // [แก้] สุ่มมุมหมุนของกระดาษสีแค่ครั้งเดียวต่อการ "active" หนึ่งรอบ ด้วย useMemo([active])
  // แทนการเรียก Math.random() ตรงๆ ตอน render ทุกครั้ง (react-hooks/purity) — ยังต้อง disable
  // เพราะกฎนี้ห้ามเรียกฟังก์ชัน impure จากทุกจุดที่ reachable ระหว่าง render รวมถึงใน useMemo ด้วย
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      const x = -20 + (i / 17) * 140
      const delay = i * 55
      // eslint-disable-next-line react-hooks/purity
      const rot = (i % 2 === 0 ? 1 : -1) * (360 + Math.random() * 300)
      const skew = -15 + (i % 3) * 15

      const style = {
        position: 'absolute',
        left: `${x}%`,
        top: -8,
        width: 7 + (i % 3) * 2,
        height: 7 + (i % 2) * 3,
        borderRadius: i % 3 === 0 ? '50%' : 2,
        background: color,
        '--cr': `${rot}deg`,
        animation: `confettiFall ${900 + delay}ms ${delay}ms ease-in forwards`,
        transform: `skewX(${skew}deg)`,
      } as CSSProperties

      return { key: i, style }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (!active) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
      {particles.map((p) => <div key={p.key} style={p.style} />)}
    </div>
  )
}

/**
 * QuestCard — การ์ดสรุปเควส 1 ใบในลิสต์ (เวอร์ชันย่อ) เดิมมี mini-widget แบบอินไลน์อยู่ใน
 * การ์ด (นาฬิกาจับเวลา, ไมค์, ปฏิทิน ฯลฯ) ซึ่งซ้ำซ้อนกับสิ่งที่ QuestPlayModal.tsx ทำอยู่แล้ว
 * ตอนนี้เอา mini-widget ทั้งหมดออก การ์ดนี้ทำหน้าที่แค่ "สรุปเควส" คลิกที่ไหนของการ์ดก็ได้
 * (ยกเว้นตอน locked) → เรียก onToggle() ซึ่ง QuestSection.tsx ผูกไว้ให้เปิด QuestPlayModal
 * (หน้าจอ Gamification เต็มรูปแบบ) แทนที่จะติ๊กเสร็จเฉยๆ ตรงนี้
 *
 * [ปรับปรุง Minimalist] ย้าย style ส่วนใหญ่จาก inline object ไปเป็น CSS class ใน <style>
 * เพื่อให้คุม text overflow ด้วย line-clamp ได้ (inline style ทำ -webkit-line-clamp ไม่ได้
 * สะดวกเท่า class) — titleTh/title ตัดด้วย ellipsis บรรทัดเดียว, desc ใช้ line-clamp 2
 * บรรทัด ยาวกว่านั้นตัดด้วย "…" พร้อม title attribute (native tooltip) ให้ hover อ่านเต็มได้
 * ไม่ใช้สีพาสเทลใหม่ตามที่ขอตรงตัว เพราะโปรเจกต์นี้มี design token (--n*, --sh-card,
 * --r-md ฯลฯ ใน index.css) ที่ทั้งแอปใช้ร่วมกันอยู่แล้ว — เปลี่ยนแค่การ์ดนี้จะหลุดโทนจาก
 * ที่อื่น จึงใช้ token เดิมแต่จัดระเบียบ/ลดความอัดแน่นแทนเพื่อความ minimalist
 */
interface QuestCardProps {
  icon: string
  title: string
  titleTh: string
  desc: string
  theory?: string
  coins: number
  exp: number
  accent: string
  accentBg: string
  locked?: boolean
  completed: boolean
  onToggle?: () => void
}

export default function QuestCard({
  icon,
  title,
  titleTh,
  desc,
  theory,
  coins,
  exp,
  accent,
  accentBg,
  locked,
  completed,
  onToggle = () => {},
}: QuestCardProps) {
  const prevCompleted = useRef(completed)
  const [showFloat, setShowFloat] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (completed && !prevCompleted.current) {
      setShowFloat(true)
      setShowConfetti(true)
      setTimeout(() => setShowFloat(false), 1500)
      setTimeout(() => setShowConfetti(false), 2000)
    }
    prevCompleted.current = completed
  }, [completed])

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      className={`quest-card-btn${locked ? ' quest-card-btn--locked' : ''}${completed ? ' quest-card-btn--completed' : ''}`}
      style={{ '--card-accent': accent, '--card-accent-bg': accentBg } as CSSProperties}
    >
      <Confetti active={showConfetti} />

      {showFloat && (
        <div className="quest-card-float">
          <span className="quest-card-float__pill quest-card-float__pill--coin">🪙 +{coins}</span>
          <span className="quest-card-float__pill quest-card-float__pill--exp">⭐ +{exp} EXP</span>
        </div>
      )}

      {!locked && <div className="quest-card-top-bar" />}

      <div className="quest-card-row">
        <div className="quest-card-icon">{locked ? '🔒' : icon}</div>

        <div className="quest-card-body">
          <div className="quest-card-head">
            <div className="quest-card-titles">
              <div className="quest-card-title-th" title={titleTh}>{titleTh}</div>
              <div className="quest-card-title-en" title={title}>{title}</div>
            </div>
            {!locked && (
              <span className="quest-card-check">
                {completed ? <span className="quest-card-check__icon">✓</span> : <span className="quest-card-check__arrow">▶</span>}
              </span>
            )}
          </div>

          <p className="quest-card-desc" title={desc}>{desc}</p>

          {theory && (
            <span className="tag quest-card-theory" title={theory}>
              🔬 {theory}
            </span>
          )}

          <div className="quest-card-rewards">
            <span className="tag quest-card-reward-coin">🪙 +{coins}</span>
            <span className="tag quest-card-reward-exp">⭐ +{exp} EXP</span>
          </div>
        </div>
      </div>

      <style>{`
        .quest-card-btn {
          position: relative;
          display: block;
          width: 100%;
          text-align: left;
          background: var(--bg-card);
          border-radius: var(--r-md);
          border: 1px solid var(--border);
          box-shadow: var(--sh-card);
          padding: 16px 18px;
          cursor: pointer;
          overflow: visible;
          transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
        }
        .quest-card-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: var(--sh-hover);
        }
        .quest-card-btn--completed {
          border-color: var(--card-accent);
        }
        .quest-card-btn--locked {
          background: var(--n50);
          border: 1.5px dashed var(--border-mid);
          box-shadow: none;
          opacity: .6;
          cursor: default;
        }

        .quest-card-top-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--card-accent-bg);
          border-radius: var(--r-md) var(--r-md) 0 0;
        }
        .quest-card-btn--completed .quest-card-top-bar { background: var(--card-accent); }

        .quest-card-row { display: flex; gap: 14px; }

        .quest-card-icon {
          flex-shrink: 0; width: 42px; height: 42px; border-radius: 13px;
          background: var(--card-accent-bg); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center; font-size: 21px;
        }

        .quest-card-body { flex: 1; min-width: 0; }

        .quest-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .quest-card-titles { min-width: 0; flex: 1; }

        /* [Minimalist] ชื่อเควสตัดด้วย ellipsis บรรทัดเดียว กันการ์ดสูงไม่เท่ากันเวลาชื่อยาว */
        .quest-card-title-th {
          font-family: 'Fredoka One'; font-size: 14.5px; color: var(--text);
          line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .quest-card-title-en {
          font-size: 10.5px; color: var(--text-muted); font-weight: 600; margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .quest-card-check {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 999px;
          border: 2px solid var(--n200); display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
        .quest-card-btn--completed .quest-card-check { border-color: var(--card-accent); background: var(--card-accent); }
        .quest-card-check__icon { color: var(--fixed-white); font-size: 13px; }
        .quest-card-check__arrow { color: var(--text-muted); font-size: 11px; }

        /* [Minimalist] คำอธิบายจำกัด 2 บรรทัดด้วย line-clamp กันล้นการ์ด — hover ดูเต็มได้
           จาก title attribute (native browser tooltip) */
        .quest-card-desc {
          font-size: 12px; color: var(--text-sub); line-height: 1.5; margin-top: 6px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .quest-card-theory {
          display: -webkit-inline-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
          overflow: hidden; max-width: 100%;
          background: var(--card-accent-bg); color: var(--card-accent);
          margin-top: 6px;
        }

        .quest-card-rewards { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
        .quest-card-reward-coin {
  --lc-bg-4: #FFF9C4;
  background: var(--lc-bg-4);
  --lc-text-5: #8B6000;
  color: var(--lc-text-5);
  --lc-border-6: #F4C43055;
  border: 1px solid var(--lc-border-6);
}
        .quest-card-reward-exp { background: var(--card-accent-bg); color: var(--card-accent); border: 1px solid var(--card-accent); }

        .quest-card-float {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%); z-index: 15;
          pointer-events: none; display: flex; gap: 8px;
        }
        .quest-card-float__pill {
          font-family: 'Fredoka One'; font-size: 15px; border-radius: 999px; padding: 3px 10px;
        }
        .quest-card-float__pill--coin {
  --lc-text-1: #8B6000;
  color: var(--lc-text-1);
  --lc-bg-2: #FFF9C4;
  background: var(--lc-bg-2);
  border: 1.5px solid var(--coin);
  --lc-shadow-3: rgba(244,196,48,.35);
  box-shadow: 0 3px 10px var(--lc-shadow-3);
}
        .quest-card-float__pill--exp { color: var(--card-accent); background: var(--card-accent-bg); border: 1.5px solid var(--card-accent); box-shadow: 0 3px 10px var(--glass-b-12); }
      `}</style>
    </button>
  )
}