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

/*============================================================================*\
  HomeBackgroundPicker — [เพิ่มตามที่ระบุ] ตั้งค่า → "ตั้งรูปพื้นหลัง" ของหน้า Home
  ────────────────────────────────────────────────────────────────────────────
  กดปุ่ม → แสดงวิดีโออนิเมชันทั้ง 5 แบบ (config/homeBackgrounds.ts) → กดที่รูป → [แก้ไข] [ตั้งเป็นรูปพื้นหลัง] [✕]
  [แก้ไข] = หน้า Home จำลอง (HomePreview): วิดีโอพื้นหลังจริง + ต้นไม้/พื้นดิน "ของเราจริง" (TreeOfLife ข้อมูลเดียวกับหน้า Home)
  ส่วนอื่นเป็นรูปทรงจำลอง — ปุ่มฝั่งขวา = วงกลมสีขาว · กระดานจัดอันดับ/แถบด้านบน = แถบสี่เหลี่ยมสีขาว
  ไม่มี ActionMenuBar · ✕ มุมขวาบน · ปุ่มล่าง [ยกเลิก] [ตั้งเป็นพื้นหลัง]
\*============================================================================*/

/** หน้า Home จำลอง — พื้นหลัง + ต้นไม้/พื้นดินจริง องค์ประกอบอื่นเป็นรูปทรงสีขาวแทน */
function HomePreview({ bg, onClose, onApply }: { bg: HomeBackground; onClose: () => void; onApply: () => void }) {
  useEscapeKey(onClose)
  const { userData, treeStats, placedItems, decorationPositions } = useAppContext()
  const rocks = getVisibleRocks(userData.id, computeCalorieTarget(userData))
  return createPortal(
    <div className="home-preview" role="dialog" aria-modal="true" aria-label={`ตัวอย่างหน้า Home — ${bg.label}`}>
      <video className="home-preview__video" src={bg.src} autoPlay muted loop playsInline aria-hidden="true" />
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
      aria-label={`${bg.label}${active ? ' (ใช้อยู่)' : ''}${missing ? ' — ยังไม่มีไฟล์' : ''}`}
    >
      {!missing && (
        <video
          className="home-bg-thumb__video"
          src={`${bg.src}#t=1`}
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

export default function HomeBackgroundPicker() {
  const { settings, updateSettings } = useUI()
  const current = settings.homeBackground ?? DEFAULT_HOME_BACKGROUND
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<HomeBackground | null>(null)
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
            </div>

            {/* กดที่รูป → แก้ไข / ตั้งเป็นรูปพื้นหลัง / ✕ */}
            {picked && (
              <div className="home-bg-actions" role="dialog" aria-label={picked.label} onClick={() => setPicked(null)}>
                <div className="home-bg-actions__card" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="home-bg-picker__x" onClick={() => setPicked(null)} aria-label="ปิด"><img src={BADGE_ICONS.close} alt="" /></button>
                  <video className="home-bg-actions__video" src={picked.src} autoPlay muted loop playsInline aria-hidden="true" />
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
          bg={picked}
          onClose={() => setPreviewing(false)}
          onApply={() => { updateSettings({ homeBackground: picked.id }); close() }}
        />
      )}
    </>
  )
}
