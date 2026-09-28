import { useEffect, useMemo } from 'react'
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
  ลำดับ (ms):
     0  ต้นกล้าปรากฏกลางจอ + แสงหมุนด้านหลัง + ป้าย "ได้รับต้นกล้า …" + เสียงได้รับไอเทม
  1500  ฉากหรี่ค่อยๆ สว่างขึ้น พื้นหญ้าจริงของหน้า Home ค่อยๆ ขึ้นมา (PlantIntro.css → .dashboard--intro)
  2300  ต้นกล้าลอยขึ้นนิดหนึ่ง แล้วค่อยๆ ลงไปปักที่โคนต้น (เล็กลงจนเท่าต้นจริง)
  3200  แตะพื้น → ฝุ่นดินฟุ้งเบาๆ + เงาที่โคน
  3550  แสงออร่า + เสียงวิ้ง · ต้นจริงค่อยๆ ปรากฏตรงตำแหน่งเดิม ต้นกล้าจางออก (ซ้อนกันพอดี)
  4300  ปุ่มต่างๆ ของหน้า Home ค่อยๆ เลื่อนขึ้นมาพร้อมกัน (Dashboard ดูแลผ่าน onReveal)
  5000  จบ — กลายเป็นหน้า Home ปกติ (onDone)
  ใช้แค่ transform/opacity ทั้งหมด (ลื่น ไม่กระตุก)
\*============================================================================*/

interface PlantIntroProps {
  mbtiType: MbtiType | null
  /** เลเวลลำต้น/ใบปัจจุบัน — ต้นกล้าในฉากหน้าตาเดียวกับต้นที่ปลูกบนหน้า Home */
  trunkBranchLevel: number
  leafFlowerLevel?: number
  /** ถึงจังหวะให้ปุ่มของหน้า Home ค่อยๆ ปรากฏ */
  onReveal: () => void
  onDone: () => void
}

const T_FLASH = 3550
const T_REVEAL = 4300
const T_DONE = 5000

export default function PlantIntro({ mbtiType, trunkBranchLevel, leafFlowerLevel = 0, onReveal, onDone }: PlantIntroProps) {
  const { settings } = useAppContext()
  const compact = useIsSmallScreen()
  const species = speciesOf(mbtiType)

  useEffect(() => {
    const sfx = { volume: settings.sfxVolume, enabled: settings.soundEnabled }
    playSfx('REWARD_CLAIM', sfx)
    const t1 = window.setTimeout(() => playSfx('WING', sfx), T_FLASH)
    const t2 = window.setTimeout(onReveal, T_REVEAL)
    const t3 = window.setTimeout(onDone, T_DONE)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3) }
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
  const landScale = useMemo(() => {
    const model = seedlingModel(mbtiType, trunkBranchLevel, leafFlowerLevel, compact)
    const home = fitTree(model, vw, vh).scale
    const seed = fitTree(model, seedW, seedH, SEEDLING_BASE_Y, SEEDLING_HEIGHT_RATIO / Math.max(model.growth, 0.1)).scale
    return seed > 0 ? Math.min(1.5, home / seed) : 0.4
  }, [mbtiType, trunkBranchLevel, leafFlowerLevel, compact, vw, vh, seedW, seedH])

  return createPortal(
    <div className="plant-intro" aria-live="polite">
      <div className="plant-intro__dim" aria-hidden="true" />

      {/* แสงหมุนด้านหลังต้นกล้า (ฟีลได้รับไอเทมพิเศษ) */}
      <div className="plant-intro__rays" aria-hidden="true" />

      {/* ป้ายชื่อต้นกล้าที่ได้รับ */}
      <div className="plant-intro__title lb-banner">ได้รับต้นกล้า{species.name.replace('ต้น', '')}!</div>
      <p className="plant-intro__subtitle">{mbtiType ?? ''} · {species.meaning}</p>

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
          <SeedlingCanvas mbtiType={mbtiType} trunkBranchLevel={trunkBranchLevel} leafFlowerLevel={leafFlowerLevel} compact={compact} width={seedW} height={seedH} />
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
    </div>,
    document.body,
  )
}
