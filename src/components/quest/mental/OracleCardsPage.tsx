import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MoodEntryData } from '../../../types'
import { ORACLE_CARDS, selectOracleCards, type OracleCard } from './oracleCardData'
import { generateOracleMessage } from './oracleMessageGenerator'
import { useTypewriter } from '../../../hooks/useTypewriter'
import { useAppContext } from '../../../context/AppContext'
import { playSfx, stopSfx } from '../../../utils/audioPlayer'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import CameraCapture from '../shared/CameraCapture'
import { BADGE_ICONS } from '../../../config/iconAssets'
import './OracleCardsPage.css'

type Stage = 'intro' | 'spread' | 'reading' | 'camera' | 'done'

/** [เพิ่มรอบนี้] ถ่ายรูปยืนยันภารกิจสำเร็จได้รางวัลพิเศษ "หยดน้ำแห่งชีวิต" เท่านี้ตายตัว
 *  แยกจากเหรียญ/EXP ปกติของเควส — ถ้ากดข้ามภารกิจจะไม่ได้รางวัลนี้ (แต่เควสไพ่ทิพย์โดยรวม
 *  ยังนับว่าสำเร็จเหมือนเดิม ดู handleSkip/handleClaimReward ด้านล่าง) */
const WATER_DROP_REWARD = 20

// [แก้ไขตามการตรวจสอบ DATA_DICTIONARY.md] ขยายให้ครบ 8 ค่าจริงของ MoodType (เดิมมีแค่ 3)
const MOOD_EMOJI: Record<MoodEntryData['mood'], string> = {
  HAPPY: '😊', ENERGETIC: '⚡', FOCUSED: '🎯', CALM: '😐',
  SAD: '😔', ANXIOUS: '😰', TIRED: '😴', ANGRY: '😠',
}

interface OracleCardsPageProps {
  moodEntry: MoodEntryData
  onComplete: () => void
  onClose: () => void
}

export default function OracleCardsPage({ moodEntry, onComplete, onClose }: OracleCardsPageProps) {
  const { settings, userData, updateProfile } = useAppContext()
  // [แก้] ตรึง identity ของ sfxOpts ด้วย useMemo — เดิมสร้าง object ใหม่ทุก render ทำให้
  // effect ที่พึ่งพา sfxOpts (เล่น/หยุดเสียงพิมพ์ดีด) รีรันโดยไม่จำเป็นทุกครั้งที่คอมโพเนนต์วาดใหม่
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  const [stage, setStage] = useState<Stage>('intro')
  const [spreadDeck] = useState<OracleCard[]>(() => buildDeck(moodEntry))
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null)
  /** [เพิ่มรอบนี้] ใช้จับคู่ layoutId ระหว่างไพ่ใบที่ถูกกดในกองพัด กับไพ่ใบใหญ่ในหน้าอ่านคำทำนาย
   *  เพื่อให้ framer-motion เล่นแอนิเมชัน "ขยายจากตำแหน่งเดิม" อัตโนมัติ (shared layout transition) */
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // [เปลี่ยนรอบนี้] เดิมมีแค่ "ประโยคเปิด 1 แบบ/อารมณ์" ต่อด้วย affirmation ตายตัวของไพ่ —
  // ตอนนี้ปั้นข้อความจริงจากคลัง Combinatorics ที่ผูกกับอารมณ์ "ทั้งหมด 8 แบบ" ของผู้ใช้
  // (ดู oracleMessageGenerator.ts — เกิน 1,000 ชุดค่าผสมต่ออารมณ์) seedKey ผูกกับทั้งรอบ
  // เช็กอินอารมณ์และไพ่ที่จับได้ ทำให้ข้อความเดิมเป๊ะถ้าเปิดซ้ำ แต่ต่างกันทุกครั้งที่มู้ด/ไพ่เปลี่ยน
  const fullTextToType = selectedCard
    ? `${generateOracleMessage(selectedCard, moodEntry.mood, `${moodEntry.id}-${selectedCard.id}`)}\n\n⚡ ภารกิจ 2 นาทีวันนี้:\n${selectedCard.twoMinuteTask}`
    : ''

  const { displayedText, isDone: isTypewriterDone } = useTypewriter(fullTextToType, 25)

  /** [แก้ตามที่ระบุ — ข้อ 4] เดิมไฟล์นี้มีโค้ดกล้อง (getUserMedia/video/canvas/facingMode)
   *  แยกเป็นชุดของตัวเอง ซ้ำกับ CameraCapture.tsx ที่ phys-pure-water/phys-photosynthesis
   *  ใช้อยู่แล้ว ตอนนี้ตัดโค้ดกล้องซ้ำทั้งหมดออก เปลี่ยนไปเรียก <CameraCapture> ตัวเดียวกัน
   *  แทน (ดู JSX ด้านล่าง) — คง state/logic เฉพาะของเควสนี้ไว้: หลังถ่ายรูปยืนยันแล้ว ต้องมี
   *  ช่วง "สแกน" 1.4 วิ ก่อนขึ้น "สำเร็จ" แล้วค่อยให้รางวัลหยดน้ำ ซึ่ง CameraCapture ไม่รู้จัก
   *  concept นี้ (มันจบหน้าที่แค่ตอนได้ dataUrl ยืนยันแล้ว) จึงยังคุมช่วงต่อจากนั้นเองที่นี่ */
  const [cameraPhase, setCameraPhase] = useState<'capturing' | 'scanning' | 'success'>('capturing')
  const [gotWaterDrop, setGotWaterDrop] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)

  const handleConfirmPhoto = (dataUrl: string) => {
    setCapturedPhoto(dataUrl)
    setCameraPhase('scanning')
    window.setTimeout(() => {
      setCameraPhase('success')
      setGotWaterDrop(true)
      playSfx('WATER_DROP', sfxOpts)
      // [เพิ่มรอบนี้] ถ่ายรูปยืนยันภารกิจสำเร็จจริง → ได้รางวัลพิเศษ +20 หยดน้ำแห่งชีวิต
      // แยกจากเหรียญ/EXP ปกติของเควส อัปเดตเข้า global state จริง (ผ่าน userApi.updateProfile
      // ที่มีอยู่แล้ว) ไม่ใช่แค่ badge สวยๆ — ถ้ากดข้ามภารกิจ (handleSkip) จะไม่ได้รางวัลนี้
      updateProfile({ waterDrops: (userData.waterDrops ?? 0) + WATER_DROP_REWARD })
      window.setTimeout(() => setStage('done'), 1200)
    }, 1400)
  }

  useEscapeKey(() => {
    stopSfx('KEYPRESS')
    onClose()
  })

  // สั่งเล่นเสียงพิมพ์ข้อความ และสั่งตัดเสียงทันทีเมื่อพิมพ์จบหรือเปลี่ยนหน้า
  useEffect(() => {
    if (stage === 'reading') {
      if (isTypewriterDone) {
        stopSfx('KEYPRESS')
      } else if (displayedText.length > 0 && displayedText.length % 3 === 0) {
        playSfx('KEYPRESS', sfxOpts)
      }
    } else {
      stopSfx('KEYPRESS')
    }
  }, [displayedText, stage, isTypewriterDone, sfxOpts])

  const handleSelectCard = (card: OracleCard, index: number) => {
    playSfx('CARD_FLIP', sfxOpts)
    setSelectedCard(card)
    setSelectedIndex(index)
    setStage('reading')
  }

  const handleStartCamera = () => {
    stopSfx('KEYPRESS')
    setStage('camera')
    setCameraPhase('capturing')
    setCapturedPhoto(null)
  }

  const handleSkip = () => {
    stopSfx('KEYPRESS')
    setGotWaterDrop(false)
    setStage('done')
  }

  const handleClose = () => {
    stopSfx('KEYPRESS')
    onClose()
  }

  return (
    <div className="oracle-game-container">
      {/* ปุ่มปิดมุมขวาบน */}
      <button onClick={handleClose} title="ปิด" className="oracle-page__close">✕</button>

      {/* แบ็กกราวด์ดาว */}
      <div className="oracle-page__bg" />
      {Array.from({ length: 25 }).map((_, i) => (
        <span
          key={i}
          className="oracle-page__star"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 90}%`,
            animationDelay: `${(i % 10) * 0.3}s`,
          }}
        />
      ))}

      <div className="oracle-page__content">
        <div className="oracle-page__mood-recap">
          <span style={{ fontSize: 22 }}>{MOOD_EMOJI[moodEntry.mood]}</span>
          <span>วันนี้คุณรู้สึก{moodEntry.note ? `: "${moodEntry.note}"` : 'แบบนี้อยู่นะ'}</span>
        </div>

        {stage === 'intro' && (
          <div className="oracle-page__intro">
            <h1 className="oracle-page__title">🔮 ไพ่ทิพย์กระตุ้นพลัง</h1>
            <p className="oracle-page__subtitle">เปิดไพ่รับพลังบวก และทำภารกิจ 2 นาทีเพื่อกระตุ้นจิตใจ</p>
            <button
              className="oracle-page__deck"
              onClick={() => {
                playSfx('CARD_DRAW', sfxOpts)
                setStage('spread')
              }}
              title="แตะเพื่อกางไพ่"
            >
              <span className="oracle-page__deck-glow" />
              🔮
            </button>
            <p className="oracle-page__tap-hint">แตะที่กองไพ่เพื่อกางไพ่ออก</p>
          </div>
        )}

        {/* [แก้ตามที่ระบุ — กางไพ่สวยงามด้วยแอนิเมชัน + กดไพ่แล้วขยายจากตำแหน่งเดิม]
            ห่อ spread↔reading ด้วย AnimatePresence เดียวกัน เพื่อให้ framer-motion จับคู่
            layoutId ระหว่างไพ่ใบที่ถูกกด (ตอนกางพัด) กับไพ่ใบใหญ่ (ตอนอ่านคำทำนาย) ได้ถูกต้อง
            (ถ้าไม่มี AnimatePresence ห่อไว้ องค์ประกอบเก่าจะถูกถอดออกจาก DOM ทันทีในตอนที่
            องค์ประกอบใหม่เข้ามาแทนที่ framer-motion จะจับคู่ตำแหน่งเริ่ม-จบของ FLIP ไม่ได้) */}
        <AnimatePresence mode="sync">
          {stage === 'spread' && (
            <motion.div key="spread" className="oracle-page__spread-view" exit={{ opacity: 0 }}>
              <p className="oracle-page__hint">แตะเลือกไพ่ 1 ใบที่คุณรู้สึกสะดุดตา</p>
              <div className="oracle-page__fan">
                {spreadDeck.map((card, i) => {
                  const t = getFanTransform(i, spreadDeck.length)
                  return (
                    // เดิมตั้ง transform สุดท้ายตรงๆ ทันทีที่ mount ไม่มีอนิเมชันกางไพ่เลย ตอนนี้
                    // ใช้ framer-motion ไล่จากกองไพ่ตรงกลาง (scale 0) กระจายออกทีละใบ (delay
                    // ตาม index) เหมือนการ "แจกไพ่" จริง
                    <motion.button
                      key={card.id + i}
                      layoutId={`oracle-card-${card.id}-${i}`}
                      className="oracle-card"
                      style={{ zIndex: t.zIndex }}
                      initial={{ opacity: 0, scale: 0.3, x: 0, y: 40, rotate: 0 }}
                      animate={{ opacity: 1, scale: 1, x: t.x, y: t.y, rotate: t.rotate }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: i * 0.05 }}
                      whileHover={{ scale: 1.08, y: t.y - 10, transition: { duration: 0.15 } }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleSelectCard(card, i)}
                    >
                      <div className="oracle-card__inner">
                        <div className="oracle-card__face--back">🔮</div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {stage === 'reading' && selectedCard && (
            <div key="reading" className="oracle-page__reading-view">
              <motion.div
                layoutId={`oracle-card-${selectedCard.id}-${selectedIndex}`}
                className="oracle-card--large"
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              >
                <div className="oracle-card__header">
                  <span className="oracle-card__large-icon">{selectedCard.icon}</span>
                  <h2 className="oracle-card__large-title">{selectedCard.title}</h2>
                </div>

                <div className="oracle-card__large-body">
                  <p className="oracle-card__typewriter-text">
                    {displayedText}
                    {!isTypewriterDone && <span className="oracle-page__caret">▍</span>}
                  </p>
                </div>

                <AnimatePresence>
                  {isTypewriterDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="oracle-card__actions"
                    >
                      <button className="oracle-btn oracle-btn--ghost" onClick={handleSkip}>
                        ข้ามภารกิจ
                      </button>
                      <button className="oracle-btn oracle-btn--primary" onClick={handleStartCamera}>
                        📸 ทำภารกิจ (รับ <img src={BADGE_ICONS.water} className="icon-img" alt="" /> +{WATER_DROP_REWARD})
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* [แก้ตามที่ระบุ — ข้อ 4] ขั้นถ่ายรูปยืนยัน — ใช้ <CameraCapture> ตัวกลางร่วมกับ
            phys-pure-water/phys-photosynthesis แทนโค้ดกล้องแยกของตัวเอง (เต็มจอ/ปุ่มชัตเตอร์/
            ถ่ายใหม่-ยืนยัน หน้าตาเหมือนกันทุกเควสกล้องในระบบแล้ว) — onExit พาไปที่ handleClose
            (ปิดทั้งเควสไพ่ทิพย์เลย ไม่นับสำเร็จ) เพราะ CameraCapture เต็มจอจะบังปุ่ม "✕" มุมขวาบน
            ของหน้านี้จนกดไม่ถึง (ปัญหาเดียวกับที่ comment ใน CameraCapture.tsx อธิบายไว้) */}
        {stage === 'camera' && cameraPhase === 'capturing' && (
          <CameraCapture
            hint="ถ่ายรูปยืนยันว่าคุณทำภารกิจ 2 นาทีเสร็จแล้ว"
            onConfirm={handleConfirmPhoto}
            onSkip={handleSkip}
            skipLabel="ข้าม"
            onExit={handleClose}
          />
        )}

        {/* ช่วงสแกน/สำเร็จหลังยืนยันรูปแล้ว — เฉพาะของเควสนี้ (ดู comment เหนือ cameraPhase) */}
        {stage === 'camera' && cameraPhase !== 'capturing' && (
          <div className="oracle-page__camera">
            <div className={`oracle-page__viewfinder ${cameraPhase === 'scanning' ? 'oracle-page__viewfinder--scanning' : ''}`}>
              {capturedPhoto && <img src={capturedPhoto} alt="ภาพที่ถ่าย" className="oracle-page__captured-img" />}
              {cameraPhase === 'success' && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="oracle-page__capture-success-overlay"
                  style={{ fontSize: 60 }}
                >
                  ✅
                </motion.div>
              )}
              {cameraPhase === 'scanning' && <div className="oracle-page__scan-ring" />}
            </div>

            <p className="oracle-page__desc">
              {cameraPhase === 'scanning' && 'กำลังสแกนยืนยัน...'}
              {cameraPhase === 'success' && <>ยืนยันสำเร็จ! ได้รับ <img src={BADGE_ICONS.water} className="icon-img" alt="" /> หยดน้ำรดต้นไม้</>}
            </p>
          </div>
        )}

        {stage === 'done' && (
          <div className="oracle-page__done-box">
            <div style={{ fontSize: 52, marginBottom: 8 }}>🌟</div>
            <h2 className="oracle-page__summary-title">รับพลังใจเรียบร้อย!</h2>
            {gotWaterDrop ? (
              <div className="oracle-page__water-badge"><img src={BADGE_ICONS.water} className="icon-img" alt="" /> +{WATER_DROP_REWARD} หยดน้ำแห่งชีวิต</div>
            ) : (
              // [เพิ่มรอบนี้] กดข้ามภารกิจ → ไม่ได้หยดน้ำโบนัส แต่เควสไพ่ทิพย์โดยรวมยังสำเร็จปกติ
              // (ปุ่ม "เสร็จสิ้น" ด้านล่างเรียก onComplete() เหมือนกันทั้งสองเส้นทาง)
              <p className="oracle-page__skip-note">ข้ามภารกิจไปแล้ว — เควสไพ่ทิพย์วันนี้ยังสำเร็จอยู่นะ</p>
            )}
            <button
              className="oracle-btn oracle-btn--primary"
              style={{ width: '100%', marginTop: 20 }}
              onClick={() => {
                onComplete()
                handleClose()
              }}
            >
              เสร็จสิ้น
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function buildDeck(moodEntry: MoodEntryData): OracleCard[] {
  const answers = selectOracleCards(moodEntry, `${moodEntry.id}-oracle`)
  const answerIds = new Set(answers.map((c) => c.id))
  const rest = ORACLE_CARDS.filter((c) => !answerIds.has(c.id))
  const rng = seededShuffleRandom(`${moodEntry.id}-deck`)
  const shuffledRest = [...rest].sort(() => rng() - 0.5)

  const filler = shuffledRest.slice(0, 6)
  return [...answers, ...filler].sort(() => rng() - 0.5)
}

function seededShuffleRandom(seedKey: string): () => number {
  let seed = 0
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

/** [แก้รอบนี้] เดิมคืน CSS transform string ตรงๆ — framer-motion ต้องการค่า x/y/rotate
 *  แยกเป็นตัวเลข (motion values) เพื่อ animate แต่ละแกนอิสระได้ (ดูจุดใช้งานใน JSX) */
function getFanTransform(index: number, total: number): { x: number; y: number; rotate: number; zIndex: number } {
  const mid = (total - 1) / 2
  const rotate = (index - mid) * (60 / total)
  const y = -Math.abs(index - mid) * 8
  const x = (index - mid) * 32
  return { x, y, rotate, zIndex: 10 + index }
}