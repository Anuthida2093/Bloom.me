import { useEffect, useRef, useState } from 'react'
import type { MbtiType } from '../../types'
import { buildTreeModel } from '../../components/tree/procedural/buildTreeModel'
import { drawBranches, drawFoliage, fitTree } from '../../components/tree/procedural/drawTree2D'
import { BAMBOO_SKELETON, CHERRY_SKELETON, HEART_SKELETON, growthOf, stageOf, type SpeciesSpec } from '../../components/tree/procedural/speciesSkeleton'

/*============================================================================*\
  [dev only] /dev/species-sheet — โครงลำต้น+กิ่งจากข้อมูล 3 สายพันธุ์ (ซากุระ · ต้นใบหัวใจ · ไผ่) รออนุมัติ
  ────────────────────────────────────────────────────────────────────────────
  ต่อสายพันธุ์: 3 ขั้นการเติบโต × ขนาด 1×/2× · ช่องภาพอ้างอิง · เช็คลิสต์ตามสเปก (ติ๊กตามจริง)
  ใบ/ดอกเป็นของ MBTI เดิม (ซากุระ = INFJ · ไผ่ = ISTP · ต้นใบหัวใจ = ใบมาตรฐานชั่วคราว รอเลือก MBTI)
  ?seed=abc หรือช่องกรอก seed — พิสูจน์ว่าแต่ละ seed ต่างกันแต่ยังอยู่ในสเปก
\*============================================================================*/

type Status = 'yes' | 'partial' | 'no' | 'na'
interface Entry { spec: SpeciesSpec; mbti: MbtiType | null; leafNote: string; checklist: [string, Status, string?][] }

/** เลเวลตัวอย่างของแต่ละขั้น + เลเวลใบ (ใบผูกกับเควสจิตใจ แยกจากลำต้น) */
const STAGES: { label: string; level: number; leaf: number }[] = [
  { label: 'ต้นกล้า', level: 4, leaf: 8 },
  { label: 'กำลังโต', level: 22, leaf: 40 },
  { label: 'โตเต็มที่', level: 100, leaf: 100 },
]

const ENTRIES: Entry[] = [
  {
    spec: CHERRY_SKELETON, mbti: 'INFJ', leafNote: 'ใบ/ดอกเดิมของ INFJ (กลุ่มดอกซากุระ)',
    checklist: [
      ['แตกง่ามต่ำ (0.15–0.22 H)', 'yes'],
      ['กิ่งหลัก 3–5 กิ่ง', 'yes'],
      ['กางทรงแจกัน 30–60° จากแนวตั้ง', 'yes'],
      ['ตาข่ายกิ่งเล็กเห็นได้ (แตกต่อ 3 ชั้น ×0.7)', 'yes'],
      ['พุ่มกว้างกว่าสูง (1.15–1.25 H)', 'yes'],
      ['ขอบดอกฟูไม่เรียบ', 'na', 'ใบ/ดอกเป็นของ INFJ เดิม'],
      ['กลุ่มดอกห้อยใต้ขอบ', 'na', 'ใบ/ดอกเป็นของ INFJ เดิม'],
      ['กลีบดอกปลิว', 'na', 'ใบ/ดอกเป็นของ INFJ เดิม'],
      ['เปลือกน้ำตาลเทา แสงด้านเดียว + ขีด lenticel', 'yes'],
    ],
  },
  {
    spec: HEART_SKELETON, mbti: null, leafNote: 'ใบมาตรฐานชั่วคราว — รอเลือก MBTI (ใบจะเป็นของ MBTI นั้น)',
    checklist: [
      ['ลำต้นสูงก่อนแตกง่าม (0.40–0.45 H)', 'yes'],
      ['รากค้ำ 5–7 รากแผ่บนพื้น (กว้าง 0.28–0.32 H)', 'yes'],
      ['สันเปลือกแนวตั้ง + ขอบแสงชมพู', 'yes'],
      ['กิ่ง 3–4 กิ่ง แตกต่อเป็นพัด เห็นเงากิ่งในพุ่ม', 'yes'],
      ['เนินดินเล็กสีเข้ม', 'yes'],
      ['ใบหัวใจไล่สีตามความสูง / หัวใจลอย', 'na', 'ใบเป็นของ MBTI ที่จะเลือก'],
    ],
  },
  {
    spec: BAMBOO_SKELETON, mbti: 'ISTP', leafNote: 'ใบเดิมของ ISTP (ใบไผ่เรียว) — จัดเป็นพัดตามโครงใหม่',
    checklist: [
      ['6–8 ลำ ชิดที่โคน เอนออก ±12° โค้งเล็กน้อย', 'yes'],
      ['ข้อปล้องทุก 0.10–0.14 H เป็นแถบเข้มนูน', 'yes'],
      ['แถบสว่างด้านข้างลำ', 'yes'],
      ['กว้างโคน 0.05 H → ยอด 0.035 H · สูงไม่เท่ากัน', 'yes'],
      ['พัดใบที่ข้อช่วงบน 40–50% บนกิ่งแขนงสั้น', 'yes'],
      ['ใบหอกยาว 0.22–0.30 H ลายเส้นขนาน', 'na', 'ใช้ใบเดิมของ ISTP (สั้นกว่าและไม่มีลาย)'],
      ['เงาพุ่มใบจางด้านหลังกอ', 'na', 'เป็นส่วนของพุ่มใบ — ไม่ได้ทำตามที่กำหนดให้ใบคงเดิม'],
    ],
  },
]

const MARK: Record<Status, string> = { yes: '✅', partial: '🟡', no: '❌', na: '➖' }
const BG = '#e8ece3'

function TreeCell({ entry, level, leaf, seed, scale }: { entry: Entry; level: number; leaf: number; seed: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ms, setMs] = useState<{ build: number; draw: number } | null>(null)
  const w = 200 * scale, h = 240 * scale
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = window.devicePixelRatio || 1
    cv.width = w * dpr; cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h)
    const t0 = performance.now()
    const model = buildTreeModel({ mbtiType: entry.mbti, trunkBranchLevel: level, leafFlowerLevel: leaf, userSeed: seed, skeleton: entry.spec })
    const t1 = performance.now()
    const fit = fitTree(model, w, h)
    drawBranches(ctx, model, fit)
    // ชั้นใบวาดบนแคนวาสใสแยก (เหมือนหน้า Home) — แสงแดดบนพุ่มทาเฉพาะบนใบ ไม่เลอะพื้นหลัง
    const leaves = document.createElement('canvas')
    leaves.width = cv.width; leaves.height = cv.height
    const lctx = leaves.getContext('2d')
    if (lctx) {
      drawFoliage(lctx, model, fit, dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(leaves, 0, 0)
    }
    setMs({ build: t1 - t0, draw: performance.now() - t1 })
  }, [entry, level, leaf, seed, w, h])
  return (
    <div>
      <canvas ref={ref} style={{ width: w, height: h, display: 'block', borderRadius: 8 }} data-species={entry.spec.id} data-level={level} data-scale={scale} />
      {ms && <div style={{ fontSize: 11, opacity: 0.6 }}>สร้าง {ms.build.toFixed(1)} ms · วาด {ms.draw.toFixed(1)} ms</div>}
    </div>
  )
}

function SpeciesBlock({ entry, seed }: { entry: Entry; seed: string }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>{entry.spec.name}</h2>
      <p style={{ fontSize: 13, margin: '0 0 10px', opacity: 0.75 }}>{entry.leafNote}</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: 200, height: 240, borderRadius: 8, border: '2px dashed #9aa894', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 12, padding: 10, boxSizing: 'border-box', opacity: 0.7 }}>
          ภาพอ้างอิง<br />(ยังไม่ได้แนบมา — ใส่ไว้เทียบเคียงเมื่อได้รับ ไม่ commit ลง repo)
        </div>
        {STAGES.map((s) => (
          <figure key={s.label} style={{ margin: 0 }}>
            <figcaption style={{ fontSize: 12, marginBottom: 4 }}>{s.label} · เลเวล {s.level} (g = {growthOf(s.level, entry.spec.growthK).toFixed(2)}, {stageOf(growthOf(s.level, entry.spec.growthK))}) · 1×</figcaption>
            <TreeCell entry={entry} level={s.level} leaf={s.leaf} seed={seed} scale={1} />
          </figure>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
        {STAGES.map((s) => (
          <figure key={s.label} style={{ margin: 0 }}>
            <figcaption style={{ fontSize: 12, marginBottom: 4 }}>{s.label} · 2×</figcaption>
            <TreeCell entry={entry} level={s.level} leaf={s.leaf} seed={seed} scale={2} />
          </figure>
        ))}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', fontSize: 13, lineHeight: 1.7 }}>
        {entry.checklist.map(([item, st, note]) => (
          <li key={item}>{MARK[st]} {item}{note ? <span style={{ opacity: 0.65 }}> — {note}</span> : null}</li>
        ))}
      </ul>
    </section>
  )
}

export default function SpeciesSheetPage() {
  const [seed, setSeed] = useState(() => new URLSearchParams(window.location.search).get('seed') ?? 'sample-1')
  const only = new URLSearchParams(window.location.search).get('species')
  return (
    <div style={{ background: '#f6f7f2', color: '#1f3326', minHeight: '100vh', padding: 16, fontFamily: 'system-ui' }}>
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginBottom: 16, fontSize: 14 }}>
        seed
        <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #9aa894' }} />
      </label>
      <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 12 }}>✅ ตรงสเปก · 🟡 ได้บางส่วน · ❌ ยังไม่ได้ · ➖ ไม่ได้ทำตามที่ตกลง (ใบคงเดิม)</span>
      {ENTRIES.filter((e) => !only || e.spec.id === only).map((e) => <SpeciesBlock key={e.spec.id} entry={e} seed={seed} />)}
    </div>
  )
}
