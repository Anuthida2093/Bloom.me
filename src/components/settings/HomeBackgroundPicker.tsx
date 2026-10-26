import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useUI } from '../../context/UIContext'
import { BADGE_ICONS } from '../../config/iconAssets'
import { DEFAULT_HOME_BACKGROUND, HOME_BACKGROUNDS, type HomeBackground } from '../../config/homeBackgrounds'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useAppContext } from '../../context/AppContext'
import TreeOfLife from '../tree/TreeOfLife'
import { computeCalorieTarget, getVisibleRocks } from '../../utils/nutrition'
import type { MbtiType } from '../../types'
import './HomeBackgroundPicker.css'
import { posterOf } from '../../utils/videoPoster'
import { effectiveHomeBackground, HOME_SCENES, HOME_SCENES_SELECTABLE, homeSceneById, isHomeSceneUnlocked, type HomeSceneSpec } from '../../config/homeScenes'
import HomeSceneRenderer from '../scenery/homeScenes/HomeSceneRenderer'

/*============================================================================*\
  HomeBackgroundPicker — [เพิ่มตามที่ระบุ] ตั้งค่า → "ตั้งรูปพื้นหลัง" ของหน้า Home
  ────────────────────────────────────────────────────────────────────────────
  กดปุ่ม → แสดงวิดีโอ 2 แบบ (config/homeBackgrounds.ts) + ฉากวาดด้วยโค้ด 3-5 (config/homeScenes.ts —
  6 เปิดให้ทุกคน · 7-8 ปลดล็อกตามเลเวลต้นไม้) → กดที่รูป → [แก้ไข] [ตั้งเป็นรูปพื้นหลัง] [✕]
  [ใหม่] ปุ่ม "ใช้ฉาก 1" ข้างปุ่มตั้งค่าพื้นหลัง — สลับกลับวิดีโอเดิมได้ด้วยการแตะครั้งเดียว
  [แก้ไข] = หน้า Home จำลอง (HomePreview): วิดีโอพื้นหลังจริง + ต้นไม้/พื้นดิน "ของเราจริง" (TreeOfLife ข้อมูลเดียวกับหน้า Home)
  ส่วนอื่นเป็นรูปทรงจำลอง — ปุ่มฝั่งขวา = วงกลมสีขาว · กระดานจัดอันดับ/แถบด้านบน = แถบสี่เหลี่ยมสีขาว
  ไม่มี ActionMenuBar · ✕ มุมขวาบน · ปุ่มล่าง [ยกเลิก] [ตั้งเป็นพื้นหลัง]
\*============================================================================*/

/** พื้นหลัง 1 แบบ — วิดีโอ (1-2) หรือฉากวาดด้วยโค้ด (3-5) */
type BgItem = { kind: 'video'; id: number; label: string; bg: HomeBackground } | { kind: 'scene'; id: number; label: string; spec: HomeSceneSpec }

function itemById(id: number): BgItem | null {
  const spec = homeSceneById(id)
  if (spec) return { kind: 'scene', id, label: `ฉากที่ ${id} · ${spec.name}`, spec }
  const bg = HOME_BACKGROUNDS.find((b) => b.id === id)
  return bg ? { kind: 'video', id, label: bg.label, bg } : null
}

/** ภาพพื้นหลังเต็มกล่อง (วิดีโอเล่นวน / ฉากวาดด้วยโค้ด) */
function BgView({ item, className, animate = true }: { item: BgItem; className: string; animate?: boolean }) {
  const { userData } = useAppContext()
  if (item.kind === 'scene') return <div className={className} style={{ position: 'relative', overflow: 'hidden' }}><HomeSceneRenderer spec={item.spec} animate={animate} mbti={userData.mbtiType as MbtiType} /></div>
  return <video className={className} src={item.bg.src} autoPlay muted loop playsInline aria-hidden="true" />
}

/** หน้า Home จำลอง — พื้นหลัง + ต้นไม้/พื้นดินจริง องค์ประกอบอื่นเป็นรูปทรงสีขาวแทน */
function HomePreview({ item, onClose, onApply }: { item: BgItem; onClose: () => void; onApply: () => void }) {
  useEscapeKey(onClose)
  const { userData, treeStats, placedItems, decorationPositions } = useAppContext()
  const rocks = getVisibleRocks(userData.id, computeCalorieTarget(userData))
  return createPortal(
    <div className="home-preview" role="dialog" aria-modal="true" aria-label={`ตัวอย่างหน้า Home ${item.label}`}>
      <BgView item={item} className="home-preview__video" />
      {/* ต้นไม้ + พื้นดินของเราจริง (ดูอย่างเดียว ลาก/กดไม่ได้) */}
      <div className="home-preview__tree-layer" aria-hidden="true">
        <TreeOfLife
          userSeed={userData.id || null}
          bareGround={userData.healthStack <= 0}
          mbtiType={userData.mbtiType as MbtiType}
          trunkBranchLevel={treeStats.trunkBranchLevel}
          leafFlowerLevel={treeStats.leafFlowerLevel}
          grassSoilLevel={treeStats.grassSoilLevel}
          riskLevel={userData.currentRiskLevel}
          placedItems={placedItems}
          decorationPositions={decorationPositions}
          onDecorationMove={() => {}}
          groundRocks={rocks}
        />
      </div>
      <div className="home-preview__mock" aria-hidden="true">
        {/* แถบสถานะด้านบน (เลเวล/เหรียญ) */}
        <div className="home-preview__hud"><i /><i /><i /></div>
        {/* กระดานจัดอันดับ = แถบสี่เหลี่ยมสีขาว */}
        <div className="home-preview__board">
          <i className="home-preview__board-title" />
          {[0, 1, 2, 3, 4].map((k) => <i key={k} className="home-preview__board-row" />)}
        </div>
        {/* ปุ่มฝั่งขวา = วงกลมสีขาว */}
        <div className="home-preview__side">
          {[0, 1, 2, 3].map((k) => <i key={k} />)}
        </div>
      </div>
      <button type="button" className="home-preview__close" onClick={onClose} aria-label="ปิดตัวอย่าง">
        <img src={BADGE_ICONS.close} alt="" />
      </button>
      <div className="home-preview__actions">
        <button type="button" className="home-bg-btn home-bg-btn--ghost" onClick={onClose}>ยกเลิก</button>
        <button type="button" className="home-bg-btn" onClick={onApply}>ตั้งเป็นพื้นหลัง</button>
      </div>
    </div>,
    document.body,
  )
}

function Thumb({ bg, active, missing, onPick, onMissing }: {
  bg: HomeBackground; active: boolean; missing: boolean; onPick: () => void; onMissing: () => void
}) {
  return (
    <button
      type="button"
      className={`home-bg-thumb${active ? ' is-active' : ''}${missing ? ' is-missing' : ''}`}
      onClick={onPick}
      disabled={missing}
      aria-label={`${bg.label}${active ? ' (ใช้อยู่)' : ''}${missing ? ' ยังไม่มีไฟล์' : ''}`}
    >
      {!missing && (
        <video
          className="home-bg-thumb__video"
          src={`${bg.src}#t=1`}
          poster={posterOf(bg.src)}
          muted playsInline preload="metadata"
          onError={onMissing}
          onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}) }}
          onMouseLeave={(e) => e.currentTarget.pause()}
        />
      )}
      {missing && <span className="home-bg-thumb__empty">ยังไม่มีไฟล์<br /><small>hero-waterfall{bg.id}.mp4</small></span>}
      <span className="home-bg-thumb__label">{bg.label}{active ? ' ✓' : ''}</span>
    </button>
  )
}

/** การ์ดฉากวาดด้วยโค้ด — ภาพนิ่ง (ไม่วนแอนิเมชันหลายใบพร้อมกัน) · ล็อกอยู่ = แสดงเลเวลที่ต้องถึง */
function SceneThumb({ spec, active, locked, onPick }: { spec: HomeSceneSpec; active: boolean; locked: boolean; onPick: () => void }) {
  const { userData } = useAppContext()
  return (
    <button
      type="button"
      className={`home-bg-thumb${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
      onClick={onPick}
      disabled={locked}
      aria-label={`ฉากที่ ${spec.id} ${spec.name}${active ? ' (ใช้อยู่)' : ''}${locked ? ` ล็อกอยู่ ปลดล็อกที่เลเวล ${spec.unlockLevel}` : ''}`}
    >
      <HomeSceneRenderer spec={spec} animate={false} frozenT={2} mbti={userData.mbtiType as MbtiType} />
      {locked && <span className="home-bg-thumb__lock">🔒<br />ปลดล็อกที่ Lv.{spec.unlockLevel}</span>}
      <span className="home-bg-thumb__label">ฉากที่ {spec.id} · {spec.name}{active ? ' ✓' : ''}</span>
    </button>
  )
}

export default function HomeBackgroundPicker() {
  const { settings, updateSettings } = useUI()
  const { userData } = useAppContext()
  // ฉากที่ใช้จริง (ฉากที่ล็อกอยู่แสดงเป็นฉาก 1)
  const current = effectiveHomeBackground(settings.homeBackground ?? DEFAULT_HOME_BACKGROUND, userData.level)
  const [open, setOpen] = useState(false)
  const [pickedId, setPickedId] = useState<number | null>(null)
  const picked = pickedId === null ? null : itemById(pickedId)
  const setPicked = (b: { id: number } | null) => setPickedId(b ? b.id : null)
  const [previewing, setPreviewing] = useState(false)
  const [missing, setMissing] = useState<Set<number>>(new Set())
  const close = () => { setOpen(false); setPicked(null); setPreviewing(false) }
  // อยู่ในสแตก Esc เฉพาะตอนป็อปอัปเปิด (และไม่ได้ดูหน้า Home จำลองอยู่ — ตัวนั้นมี Esc ของตัวเอง)
  useEscapeKey(() => { if (picked) setPicked(null); else close() }, open && !previewing)

  return (
    <>
      <button type="button" className="settings-choice-btn home-bg-open" onClick={() => setOpen(true)}>
        ตั้งค่าพื้นหลัง
      </button>

      {open && createPortal(
        <div className="home-bg-picker" role="dialog" aria-modal="true" aria-labelledby="home-bg-title" onClick={close}>
          <div className="home-bg-picker__card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="home-bg-picker__x" onClick={close} aria-label="ปิด"><img src={BADGE_ICONS.close} alt="" /></button>
            <h2 id="home-bg-title" className="home-bg-picker__title">ตั้งรูปพื้นหลังหน้า Home</h2>
            <div className="home-bg-picker__grid">
              {HOME_BACKGROUNDS.map((bg) => (
                <Thumb
                  key={bg.id}
                  bg={bg}
                  active={bg.id === current}
                  missing={missing.has(bg.id)}
                  onPick={() => setPicked(bg)}
                  onMissing={() => setMissing((m) => new Set(m).add(bg.id))}
                />
              ))}
              {HOME_SCENES_SELECTABLE && HOME_SCENES.map((spec) => (
                <SceneThumb
                  key={spec.id}
                  spec={spec}
                  active={spec.id === current}
                  locked={!isHomeSceneUnlocked(spec, userData.level)}
                  onPick={() => setPicked(spec)}
                />
              ))}
            </div>

            {/* กดที่รูป → แก้ไข / ตั้งเป็นรูปพื้นหลัง / ✕ */}
            {picked && (
              <div className="home-bg-actions" role="dialog" aria-label={picked.label} onClick={() => setPicked(null)}>
                <div className="home-bg-actions__card" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="home-bg-picker__x" onClick={() => setPicked(null)} aria-label="ปิด"><img src={BADGE_ICONS.close} alt="" /></button>
                  <BgView item={picked} className="home-bg-actions__video" />
                  <div className="home-bg-actions__label">{picked.label}{picked.id === current ? ' · ใช้อยู่' : ''}</div>
                  <div className="home-bg-actions__buttons">
                    <button type="button" className="home-bg-btn home-bg-btn--ghost" onClick={() => setPreviewing(true)}>แก้ไข</button>
                    <button
                      type="button"
                      className="home-bg-btn"
                      onClick={() => { updateSettings({ homeBackground: picked.id }); setPicked(null) }}
                      disabled={picked.id === current}
                    >
                      ตั้งเป็นรูปพื้นหลัง
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {previewing && picked && (
        <HomePreview
          item={picked}
          onClose={() => setPreviewing(false)}
          onApply={() => { updateSettings({ homeBackground: picked.id }); close() }}
        />
      )}
    </>
  )
}
