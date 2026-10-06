import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { MbtiType } from '../../types'
import SeedlingCanvas from './SeedlingCanvas'
import { SEEDLING_BASE_Y, SEEDLING_HEIGHT_RATIO, seedlingModel } from './seedlingModel'
import { fitTree } from '../tree/procedural/drawTree2D'
import { speciesOf } from '../tree/procedural/species'
import { useAppContext } from '../../context/AppContext'
import { playSfx } from '../../utils/audioPlayer'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import '../leaderboard/leaderboardRow.css'
import './PlantIntro.css'

/*============================================================================*\
  PlantIntro — [ใหม่ตามที่ระบุ] ฉากรับต้นกล้าหลังเลือก MBTI เสร็จ (เล่นครั้งเดียวตอนเข้าหน้า Home ครั้งแรก)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ — ให้ต้นกล้ากับพื้นเป็นฉากเดียวกัน ไม่สะดุด] ไม่มีดินวาดแยกแล้ว ใช้ "พื้นจริง" ของหน้า Home
  (canvas พื้น/ทุ่งหญ้าใน TreeOfLife) ค่อยๆ ขึ้นมา แล้วต้นกล้าลงไปปักตรงโคนต้นจริงด้วยขนาดเท่าต้นจริงเป๊ะ
  (โมเดล/สูตรจัดขนาดเดียวกัน) จากนั้นต้นจริงค่อยๆ ปรากฏซ้อนแทนที่ใต้แสงออร่า — รอยต่อจึงมองไม่เห็น
  [แก้รอบนี้] ข้อความ "ได้รับต้นกล้า …" ไม่ขึ้นทับระหว่างปลูกอีกแล้ว — รอให้ต้นจริงโตเสร็จก่อน แล้วค่อย
  จางขึ้น "ข้างต้นไม้" (จอกว้าง: ด้านขวาของต้น · จอแคบ: ใต้เส้นพื้นดิน) อยู่ชั้นบนสุดของฉาก ไม่ถูกต้นบัง
  ลำดับ (ms):
     0  ต้นกล้าปรากฏกลางจอ + แสงหมุนด้านหลัง + เสียงได้รับไอเทม
  1500  ฉากหรี่ค่อยๆ สว่างขึ้น พื้นหญ้าจริงของหน้า Home ค่อยๆ ขึ้นมา (PlantIntro.css → .dashboard--intro)
  2300  ต้นกล้าลอยขึ้นนิดหนึ่ง แล้วค่อยๆ ลงไปปักที่โคนต้น (เล็กลงจนเท่าต้นจริง)
  3200  แตะพื้น → ฝุ่นดินฟุ้งเบาๆ + เงาที่โคน
  3550  แสงออร่า + เสียงวิ้ง · ต้นจริงค่อยๆ ปรากฏตรงตำแหน่งเดิม ต้นกล้าจางออก (ซ้อนกันพอดี)
  4300  ต้นจริงโตเสร็จ
  4450  ข้อความ "ได้รับต้นกล้า … / MBTI · ความหมาย" ค่อยๆ ขึ้นข้างต้นไม้ (ค้างให้อ่าน ~2.4 วิ)
  6900  ข้อความจางออก + ปุ่มต่างๆ ของหน้า Home เลื่อนขึ้นมาพร้อมกัน (Dashboard ดูแลผ่าน onReveal)
  7600  จบ — กลายเป็นหน้า Home ปกติ (onDone)
  ใช้แค่ transform/opacity ทั้งหมด (ลื่น ไม่กระตุก)
\*============================================================================*/

interface PlantIntroProps {
  mbtiType: MbtiType | null
  /** เลเวลลำต้น/ใบปัจจุบัน — ต้นกล้าในฉากหน้าตาเดียวกับต้นที่ปลูกบนหน้า Home */
  trunkBranchLevel: number
  leafFlowerLevel?: number
  /** id ผู้ใช้ — ต้นกล้าหน้าตาเดียวกับต้นของคนนี้บนหน้า Home */
  userSeed?: string | null
  /** ถึงจังหวะให้ปุ่มของหน้า Home ค่อยๆ ปรากฏ */
  onReveal: () => void
  onDone: () => void
}

/** วางการ์ดข้อความ "ข้างต้นไม้" จากขนาดต้นจริงบนหน้า Home (สูตร fitTree เดียวกัน) — ไม่ทับพุ่ม/ลำต้น
 *  ข้างขวามีที่พอ → ขวาของพุ่ม · ไม่พอ (จอแคบ) → แถบใต้เส้นพื้นดิน หรือเหนือยอดต้น แล้วแต่ฝั่งไหนกว้างกว่า */
const MESSAGE_GAP = 20
const MESSAGE_MIN_SIDE = 220
function placeMessageBesideTree(
  bounds: { minX: number; maxX: number; maxY: number },
  fit: { scale: number; baseX: number; baseY: number },
  vw: number, vh: number,
): CSSProperties {
  const halfPx = Math.max(-bounds.minX, bounds.maxX) * fit.scale
  const topPx = fit.baseY - bounds.maxY * fit.scale
  const sideSpace = vw - (fit.baseX + halfPx) - MESSAGE_GAP - 12
  if (sideSpace >= MESSAGE_MIN_SIDE) {
    const width = Math.min(320, sideSpace)
    return { left: fit.baseX + halfPx + MESSAGE_GAP, top: Math.max(16, (topPx + fit.baseY) / 2 - 70), width }
  }
  const below = vh - fit.baseY
  const above = topPx
  const width = Math.min(420, vw - 24)
  return below >= above
    ? { left: (vw - width) / 2, bottom: 12, width, maxHeight: Math.max(64, below - 20) }
    : { left: (vw - width) / 2, top: 12, width, maxHeight: Math.max(64, above - 20) }
}

const T_FLASH = 3550
/** ต้นจริงโตเสร็จ (ดีเลย์ 3.55 วิ + แอนิเมชันโต 0.7 วิ ใน PlantIntro.css) แล้วเว้นจังหวะนิดหนึ่ง */
const T_MESSAGE = 4450
const T_REVEAL = 6900
const T_DONE = 7600

export default function PlantIntro({ mbtiType, trunkBranchLevel, leafFlowerLevel = 0, userSeed = null, onReveal, onDone }: PlantIntroProps) {
  const { settings } = useAppContext()
  /** none → show (หลังต้นโตเสร็จ) → hide (ก่อนปุ่ม Home ขึ้น) */
  const [message, setMessage] = useState<'none' | 'show' | 'hide'>('none')
  const compact = useIsSmallScreen()
  const species = speciesOf(mbtiType)

  useEffect(() => {
    const sfx = { volume: settings.sfxVolume, enabled: settings.soundEnabled }
    playSfx('REWARD_CLAIM', sfx)
    const timers = [
      window.setTimeout(() => playSfx('WING', sfx), T_FLASH),
      window.setTimeout(() => { setMessage('show'); playSfx('SPARKLE_CHIME', sfx) }, T_MESSAGE),
      window.setTimeout(() => { setMessage('hide'); onReveal() }, T_REVEAL),
      window.setTimeout(onDone, T_DONE),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
    // เล่นครั้งเดียวตอนเปิดฉาก
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sparkles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    angle: (360 / 18) * i,
    dist: 110 + (i % 4) * 26,
    delay: (i % 6) * 110,
    size: 3 + (i % 3) * 1.5,
  })), [])

  // ฝุ่นดินตอนต้นกล้าแตะพื้น — ฟุ้งออกซ้าย/ขวาเตี้ยๆ
  const dust = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    return { dx: side * (18 + (i * 7) % 46), dy: -(6 + (i * 5) % 18), size: 4 + (i % 3) * 2, delay: (i % 4) * 30 }
  }), [])

  // ขนาดกรอบต้นกล้า — ตรงกับ --h ใน PlantIntro.css (min(62vmin, 440px)) กว้าง 0.75 เท่า
  const vw = window.innerWidth, vh = window.innerHeight
  const seedH = Math.min(Math.min(vw, vh) * 0.62, 440)
  const seedW = seedH * 0.75
  // [แก้ตามที่ระบุ] ขนาดตอนลงดิน = ขนาดจริงของต้นบนหน้า Home เป๊ะ — สูตรจัดขนาดเดียวกัน (fitTree) กับโมเดลเดียวกัน
  const { landScale, messageStyle } = useMemo(() => {
    const model = seedlingModel(mbtiType, trunkBranchLevel, leafFlowerLevel, compact, userSeed)
    const homeFit = fitTree(model, vw, vh)
    const seed = fitTree(model, seedW, seedH, SEEDLING_BASE_Y, SEEDLING_HEIGHT_RATIO / Math.max(model.growth, 0.1)).scale
    return {
      landScale: seed > 0 ? Math.min(1.5, homeFit.scale / seed) : 0.4,
      messageStyle: placeMessageBesideTree(model.bounds, homeFit, vw, vh),
    }
  }, [mbtiType, trunkBranchLevel, leafFlowerLevel, compact, userSeed, vw, vh, seedW, seedH])

  return createPortal(
    <div className="plant-intro" aria-live="polite">
      <div className="plant-intro__dim" aria-hidden="true" />

      {/* แสงหมุนด้านหลังต้นกล้า (ฟีลได้รับไอเทมพิเศษ) */}
      <div className="plant-intro__rays" aria-hidden="true" />


      {/* เงานุ่มๆ ที่โคนต้นบนพื้นจริง — ค่อยเข้มขึ้นตอนต้นกล้าลงมาใกล้พื้น */}
      <div className="plant-intro__contact-shadow" aria-hidden="true" />

      {/* ต้นกล้า: กลางจอ → ลอยขึ้นนิดหนึ่ง → ค่อยๆ ลงไปปักที่โคนต้นจริง (ขนาดเท่าต้นจริง) */}
      <div className="plant-intro__seedling-wrap" aria-hidden="true" style={{ ['--land-scale' as string]: landScale }}>
        <div className="plant-intro__glow" />
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="plant-intro__sparkle"
            style={{
              width: s.size, height: s.size,
              ['--a' as string]: `${s.angle}deg`,
              ['--d' as string]: `${s.dist}px`,
              animationDelay: `${s.delay}ms`,
            }}
          />
        ))}
        <div className="plant-intro__seedling">
          <SeedlingCanvas mbtiType={mbtiType} trunkBranchLevel={trunkBranchLevel} leafFlowerLevel={leafFlowerLevel} compact={compact} width={seedW} height={seedH} userSeed={userSeed} />
        </div>
      </div>

      {/* ฝุ่นดินฟุ้งตอนแตะพื้น */}
      <div className="plant-intro__dust" aria-hidden="true">
        {dust.map((d, i) => (
          <span
            key={i}
            className="plant-intro__dust-grain"
            style={{ width: d.size, height: d.size, ['--dx' as string]: `${d.dx}px`, ['--dy' as string]: `${d.dy}px`, animationDelay: `${d.delay}ms` }}
          />
        ))}
      </div>

      {/* แสงออร่าตอนต้นกล้าเข้าที่ — บังจังหวะสลับเป็นต้นจริง */}
      <div className="plant-intro__flash" aria-hidden="true" />

      {/* ข้อความรับต้นกล้า — ขึ้นหลังต้นโตเสร็จเท่านั้น วางข้างต้นไม้ (ไม่ทับ/ไม่อยู่หลังต้น) */}
      {message !== 'none' && (
        <div className={`plant-intro__message plant-intro__message--${message}`} role="status" style={messageStyle}>
          <div className="plant-intro__title lb-banner">ได้รับต้นกล้า{species.name.replace('ต้น', '')}!</div>
          <p className="plant-intro__subtitle">{mbtiType ?? ''} · {species.meaning}</p>
        </div>
      )}
    </div>,
    document.body,
  )
}
