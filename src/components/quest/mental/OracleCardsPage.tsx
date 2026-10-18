import { useState, useEffect, useMemo } from 'react'
import type { MoodEntryData } from '../../../types'
import { requestHomeWatering } from '../../../utils/waterPrompt'
import { ORACLE_CARDS, selectOracleCards, type OracleCard } from './oracleCardData'
import { generateOracleMessage } from './oracleMessageGenerator'
import { useTypewriter } from '../../../hooks/useTypewriter'
import { useAppContext } from '../../../context/AppContext'
import { playSfx, stopSfx } from '../../../utils/audioPlayer'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import CameraCapture from '../shared/CameraCapture'
import { MOOD_TYPE_INFO } from '../../../config/moodTypes'
import './OracleCardsPage.css'
import '../../leaderboard/leaderboardRow.css'

import { BADGE_ICONS, QUEST_ICONS } from '../../../config/iconAssets'

/** กระดาษข้อความไพ่คลี่จนสุด (ms) — ต้องตรงกับแอนิเมชัน oracleUnroll ใน OracleCardsPage.css */
const ORACLE_UNROLL_MS = 1100

type Stage = 'intro' | 'spread' | 'reading' | 'camera'

const WATER_DROP_REWARD = 20

interface OracleCardsPageProps {
  moodEntry: MoodEntryData
  onComplete: () => void
  onClose: () => void
}

export default function OracleCardsPage({ moodEntry, onComplete, onClose }: OracleCardsPageProps) {
  const { settings, userData, updateProfile } = useAppContext()
  
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  const [stage, setStage] = useState<Stage>('intro')
  const [spreadDeck] = useState<OracleCard[]>(() => buildDeck(moodEntry))
  const [selectedCard, setSelectedCard] = useState<OracleCard | null>(null)

  const affirmationText = selectedCard
    ? generateOracleMessage(selectedCard, moodEntry.mood, `${moodEntry.id}-${selectedCard.id}`)
    : ''

  // เริ่มพิมพ์หลังกระดาษคลี่เสร็จ (ORACLE_UNROLL_MS) แล้วพิมพ์ไล่ทีละบรรทัด
  const { displayedText, isDone: isTypewriterDone } = useTypewriter(affirmationText, 25, ORACLE_UNROLL_MS, undefined, () => stopSfx('KEYPRESS'))

  useEscapeKey(() => {
    stopSfx('KEYPRESS')
    onClose()
  })

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

  const handleSelectCard = (card: OracleCard) => {
    playSfx('CARD_FLIP', sfxOpts)
    setSelectedCard(card)
    setStage('reading')
  }

  const handleStartCamera = () => {
    stopSfx('KEYPRESS')
    setStage('camera')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConfirmPhoto = (dataUrl: string) => {
    playSfx('WATER_DROP', sfxOpts)
    stopSfx('KEYPRESS')
    // [แก้บั๊ก] บันทึกเควสสำเร็จก่อนเสมอ แล้วค่อยให้หยดน้ำ — onComplete (handleCompleteSpecial)
    // ปิดหน้าเควสให้เองอยู่แล้ว ไม่เรียก onClose ซ้ำ
    onComplete()
    updateProfile({ waterDrops: (userData.waterDrops ?? 0) + WATER_DROP_REWARD })
    requestHomeWatering() // [แก้ตามที่ระบุ] ได้หยดน้ำ → กลับหน้า Home แล้วรดน้ำต้นไม้
  }

  const handleSkip = () => {
    stopSfx('KEYPRESS')
    onComplete()
  }

  const handleClose = () => {
    stopSfx('KEYPRESS')
    onClose()
  }

  return (
    <div className="oracle-game-container">
      <button onClick={handleClose} title="ปิด" className="oracle-page__close"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>

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
        
        <div className="oracle-page__mood-recap lb-banner lb-banner--purple">
          <span style={{ fontSize: 22 }}>{MOOD_TYPE_INFO[moodEntry.mood].emoji}</span>
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

        {stage === 'spread' && (
          <div className="oracle-page__spread-view">
            <p className="oracle-page__hint">แตะเลือกไพ่ 1 ใบที่คุณรู้สึกสะดุดตา</p>
            <div className="oracle-page__fan">
              {spreadDeck.map((card, i) => {
                const t = getFanTransform(i, spreadDeck.length)
                return (
                  <button
                    key={card.id + i}
                    className="oracle-card"
                    style={{ 
                      zIndex: t.zIndex,
                      transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg)`
                    }}
                    onClick={() => handleSelectCard(card)}
                  >
                    <div className="oracle-card__inner">
                      <div className="oracle-card__face--back">
                        {/* [แก้ตามที่ระบุ] หลังไพ่ใช้รูปเควสไพ่ทิพย์แทนอีโมจิ 🔮 */}
                        <img src={QUEST_ICONS['ment-oracle-activation']} alt="" className="oracle-card__back-img" draggable={false} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {stage === 'reading' && selectedCard && (
          <div className="oracle-page__reading-view">
            {/* [แก้ตามที่ระบุ] ป็อบอัพข้อความไพ่แบบกระดานจัดอันดับ — กรอบทอง/พื้นเขียว/ฟอนต์หน้า Welcome */}
            <div className="oracle-card--large lb-card">
              <div className="lb-banner oracle-card__banner">ไพ่ของคุณวันนี้</div>
              <div className="oracle-card__header">
                <span className="oracle-card__large-icon">{selectedCard.icon}</span>
                <h2 className="oracle-card__large-title">{selectedCard.title}</h2>
              </div>

              {/* กระดาษม้วนคลี่ออก (แบบเดียวกับม้วนรางวัลก้าวเพื่อสุขภาพ) แต่เป็นกระดาษเรียบ ไม่มีเส้นขอบ/บรรทัด
                  ข้อความพิมพ์ดีดไล่ทีละบรรทัดหลังกระดาษคลี่เสร็จ */}
              <div className="oracle-scroll">
                <div className="oracle-scroll__rod" aria-hidden="true" />
                <div className="oracle-scroll__paper">
                  <div className="oracle-scroll__inner">
                    <p className="oracle-scroll__text">
                      {displayedText}
                      {!isTypewriterDone && <span className="oracle-page__caret">▍</span>}
                    </p>
                    {isTypewriterDone && (
                      <div className="oracle-scroll__mission">
                        <span className="oracle-scroll__mission-label">⚡ ภารกิจ 2 นาทีวันนี้</span>
                        <p className="oracle-scroll__mission-text">{selectedCard.twoMinuteTask}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="oracle-scroll__rod oracle-scroll__rod--bottom" aria-hidden="true" />
              </div>

              {isTypewriterDone && (
                <div className="oracle-card__actions">
                  <button className="lb-btn lb-btn--ghost" style={{ flex: 1 }} onClick={handleSkip}>
                    ข้ามภารกิจ
                  </button>
                  <button className="lb-btn" style={{ flex: 1 }} onClick={handleStartCamera}>
                    ทำภารกิจ
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === 'camera' && (
          <CameraCapture
            onSave={handleConfirmPhoto}
            onCancel={() => setStage('reading')} 
          />
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

function getFanTransform(index: number, total: number): { x: number; y: number; rotate: number; zIndex: number } {
  const mid = (total - 1) / 2
  const rotate = (index - mid) * (60 / total)
  const y = -Math.abs(index - mid) * 8
  const x = (index - mid) * 32
  return { x, y, rotate, zIndex: 10 + index }
}