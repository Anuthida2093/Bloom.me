import { useState, type ReactNode } from 'react'
import type { QuestDef } from '../../../config/questCatalog'
import type { QuestPlayPayload } from '../../../types.mental'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'
import { BADGE_ICONS } from '../../../config/iconAssets'
import './GameShell.css'

/*============================================================================*\
  GameShell — "ห้องเล่นเควสเต็มกรอบเขียว"   [แทนที่การ์ดเล็กกลางจอแบบเดิม]
  ────────────────────────────────────────────────────────────────────────────
  ตามที่ระบุ: ป๊อปอัพที่เล่นเกมต้องเป็นแบบเต็มจอ "ในกรอบเขียว" เท่านั้น ไม่ทะลุจอทั้งหมด
  → ทั้ง shell ใช้ position:absolute; inset:0 ซึ่งจะไปยึดกับ .gameplay-frame ที่เป็น
    position:relative อยู่แล้ว จึงครอบเต็มกรอบเขียวพอดี ไม่ล้นออกไปทับ Navbar/Sidebar

  ของเดิม (QuestPlayModal) เป็นการ์ด maxWidth:460px ลอยกลางจอ ทำให้เกมทุกเควสถูกบีบ
  อยู่ในกล่องแคบๆ เขียนมินิเกมจริงไม่ได้ — shell นี้เปิดพื้นที่เต็มกรอบให้แต่ละเควส
  ไปออกแบบหน้าตาของตัวเองได้อิสระ (ดูไฟล์เกมแต่ละอันใน games/learning, games/physical)

  หน้าที่ของ shell: หัวเรื่อง + ทฤษฎีอ้างอิง + ปุ่มปิด + ฉากรับรางวัลหลังเล่นจบ
  หน้าที่ของไฟล์เกม: เนื้อในล้วนๆ เรียก finish(payload) เมื่อเล่นจบ
\*============================================================================*/

interface GameShellApi {
  finish: (payload?: QuestPlayPayload) => void
  accent: string
  accentBg: string
  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] ดู src/types.mental.ts */
  strictMode: boolean
  skip: (payload?: QuestPlayPayload) => void
  /** [เพิ่มรอบนี้] ให้เกมลูกเรียกออกเองได้ตรงๆ — จำเป็นสำหรับเกมที่เนื้อหาตัวเอง (เช่น
   *  CameraCapture แบบเต็มจอ) บังปุ่ม "✕" ของ header ด้านล่างนี้จนกดไม่ถึง ดู types.mental.ts */
  exit: () => void
}

interface GameShellProps {
  quest: QuestDef
  accent: string
  accentBg: string
  /** เรียกตอนเล่นจบจริง (ก่อนหน้ารับรางวัล) — ผู้เรียกใช้เอาไปอัปเดต state/backend */
  onComplete: (questCode: string, payload?: QuestPlayPayload) => void
  onClose: () => void
  /** true = เควสบังคับ (ความเสี่ยงปานกลาง/สูง) ต้องยืนยันก่อนออกกลางคัน */
  forced?: boolean
  /** [แก้รอบนี้ — feedback รอบ 2] true = แสดงชื่อเควสเป็นปุ่ม pill ลอย (สไตล์เดียวกับปุ่ม
   *  "เควสด้านการเรียนรู้"/quest-section-title-pill ใน QuestSection.tsx — พื้นหลังโปร่งแสงเข้ม
   *  ขอบโค้งมนเต็ม ไอคอนเล็กหน้าข้อความ ขนาดพอดีตัวไม่เต็มความกว้างจอ) แทน header ปกติ
   *  (ไอคอน+ชื่อ+คำบรรยายเต็มแถบ) ไม่แสดงกล่อง howTo/theory และ .game-shell__stage เต็มพื้นที่
   *  ทั้งหมดของ .game-shell จริงๆ (ปุ่ม pill + ปุ่มปิดลอยทับด้านบนด้วย z-index แยกจากกันเหมือน
   *  quest-section-title-pill/quest-section-close-btn ต้นแบบ ไม่ใช่แถบเต็มความกว้างที่กิน
   *  พื้นที่ layout เหมือนรอบก่อน) — ใช้กับเกมที่ต้องแสดงภาพ/แผนที่เต็มจอจริงๆ เท่านั้น ไม่ใส่ =
   *  พฤติกรรมเดิมทุกประการ */
  fullscreenGame?: boolean
  children: (api: GameShellApi) => ReactNode
}

export default function GameShell({ quest, accent, accentBg, onComplete, onClose, forced = false, fullscreenGame = false, children }: GameShellProps) {
  useLockBodyScroll()
  const { settings } = useAppContext()
  const sfxOpts = { volume: settings.sfxVolume, enabled: settings.soundEnabled }

  const [stage, setStage] = useState<'playing' | 'reward'>('playing')
  const [confirmExit, setConfirmExit] = useState(false)
  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] จำไว้ว่ารอบนี้จบแบบ "ข้ามตัวจับเวลา" หรือจบเต็มรูปแบบ
   *  เพื่อให้หน้ารับรางวัลแสดงตัวเลขที่ตรงกับที่ quest.api.ts จ่ายจริง (ดูที่นั่นสำหรับสูตรครึ่งรางวัล) */
  const [awardedSkipped, setAwardedSkipped] = useState(false)

  // [แก้] รีเซ็ต stage/confirmExit ระหว่าง render ทันทีที่ quest.code เปลี่ยน แทนการ setState
  // ใน effect (react-hooks/set-state-in-effect) — แพทเทิร์น "ปรับ state เมื่อ prop เปลี่ยน"
  const [prevQuestCode, setPrevQuestCode] = useState(quest.code)
  if (quest.code !== prevQuestCode) {
    setPrevQuestCode(quest.code)
    setStage('playing')
    setConfirmExit(false)
    setAwardedSkipped(false)
  }

  const requestClose = () => {
    if (stage === 'playing' && forced) {
      setConfirmExit(true)
      return
    }
    onClose()
  }

  useEscapeKey(() => {
    if (confirmExit) setConfirmExit(false)
    else requestClose()
  })

  const finish = (payload?: QuestPlayPayload) => {
    playSfx('QUEST_SUCCESS', sfxOpts)
    setAwardedSkipped(false)
    onComplete(quest.code, payload)
    setStage('reward')
  }

  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] ให้เกมจับเวลาเรียกแทน finish() เมื่อผู้เล่นกด "ข้าม" —
   *  จบเควสทันทีด้วยรางวัลครึ่งเดียว (ตายตัว ไม่คิดตามสัดส่วนเวลาที่ทำจริง) ผ่าน payload.skipped
   *  ซึ่ง quest.api.ts อ่านค่านี้ไปคำนวณเหรียญ/EXP/stack ที่ให้จริงครึ่งเดียวเช่นกัน */
  const skip = (payload?: QuestPlayPayload) => {
    playSfx('QUEST_SUCCESS', sfxOpts)
    setAwardedSkipped(true)
    onComplete(quest.code, { ...payload, skipped: true })
    setStage('reward')
  }

  const claim = () => {
    playSfx('REWARD_CLAIM', sfxOpts)
    onClose()
  }

  return (
    <div className="game-shell" style={{ '--game-accent': accent, '--game-accent-bg': accentBg } as React.CSSProperties}>
      <div className="game-shell__scenery" aria-hidden="true" />

      {fullscreenGame ? (
        <>
          <div className="game-shell__pill-header">
            <span className="game-shell__pill-icon" aria-hidden="true">{quest.icon}</span>
            <span className="game-shell__pill-title">{quest.titleTh}</span>
          </div>
          <button
            className="game-shell__close game-shell__close--floating"
            onClick={requestClose}
            title="ปิด"
            aria-label={`ปิดเควส ${quest.titleTh}`}
          >
            ✕
          </button>
        </>
      ) : (
        <header className="game-shell__header">
          <div className="game-shell__heading">
            <span className="game-shell__icon">{quest.icon}</span>
            <div>
              <div className="game-shell__title">{quest.titleTh}</div>
              <div className="game-shell__subtitle">{quest.title}</div>
            </div>
          </div>
          <button className="game-shell__close" onClick={requestClose} title="ปิด" aria-label={`ปิดเควส ${quest.titleTh}`}>✕</button>
        </header>
      )}

      {stage === 'playing' ? (
        <div className={`game-shell__body${fullscreenGame ? ' game-shell__body--fullscreen' : ''}`}>
          {!fullscreenGame && (
            <div className="game-shell__brief">
              <p className="game-shell__howto">{quest.howTo}</p>
              {quest.theory && <p className="game-shell__theory">อ้างอิง: {quest.theory}</p>}
            </div>
          )}

          <div className="game-shell__stage">
            {children({ finish, accent, accentBg, strictMode: settings.strictMode, skip, exit: requestClose })}
          </div>
        </div>
      ) : (
        <div className="game-shell__reward">
          {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 3 "ยังไม่ถูกแก้จริง"] จุดนี้คือ root cause จริงที่ทำให้
              ดูเหมือนยังไม่ได้แก้ — หน้ารางวัลนี้มี "ฝนอีโมจิ" ⭐/💧 ตกลงมา 14 จุด ซึ่งเด่นกว่า
              การ์ดตัวเลขรางวัลด้านล่างที่แก้ไปแล้วรอบก่อนมาก (คนละจุดกัน รอบก่อนแก้แค่การ์ด
              ด้านล่าง ไม่ได้เห็นจุดนี้เพราะ grep รอบก่อนจำกัดแค่ "จุดแสดงจำนวนรางวัล" ไม่รวม
              เอฟเฟกต์ตกแต่งที่ไม่มีตัวเลข) เปลี่ยนเป็นรูปจริงสลับ coins/exp แทน */}
          <div className="game-shell__reward-drops" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <img
                key={i}
                src={i % 2 === 0 ? BADGE_ICONS.coins : BADGE_ICONS.exp}
                alt=""
                style={{ left: `${(i * 7.1) % 100}%`, animationDelay: `${i * 0.09}s` }}
              />
            ))}
          </div>
          <div className="game-shell__reward-icon">🎉</div>
          <div className="game-shell__reward-title">เควสสำเร็จแล้ว</div>
          <p className="game-shell__reward-text">
            {awardedSkipped
              ? 'คุณข้ามตัวจับเวลากลางคัน — ได้รับรางวัลครึ่งเดียว'
              : 'ต้นไม้ของคุณเพิ่งได้รับพลังจากสิ่งที่คุณทำเมื่อครู่'}
          </p>
          <div className="game-shell__reward-cards">
            {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 7] ตัวเลขไว้หน้ารูป + รูปใหญ่ชัดเจนขึ้น */}
            <div><strong>+{awardedSkipped ? Math.round(quest.coinReward / 2) : quest.coinReward}</strong><img src={BADGE_ICONS.coins} className="icon-img--reward" alt="" />เหรียญละอองดาว</div>
            <div><strong>+{awardedSkipped ? Math.round(quest.expReward / 2) : quest.expReward}</strong><img src={BADGE_ICONS.exp} className="icon-img--reward" alt="" />EXP</div>
          </div>
          <button className="game-shell__claim" onClick={claim}>รับรางวัล</button>
        </div>
      )}

      {confirmExit && (
        <div className="game-shell__confirm">
          <div className="game-shell__confirm-card">
            <div className="game-shell__confirm-icon">🥀</div>
            <p>เควสนี้เป็นเควสฟื้นฟูที่ระบบเลือกไว้ให้ ถ้าออกตอนนี้จะยังไม่นับว่าสำเร็จนะ</p>
            <div className="game-shell__confirm-actions">
              <button className="is-primary" onClick={() => setConfirmExit(false)}>ทำต่อ</button>
              <button onClick={onClose}>ออกก่อน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}