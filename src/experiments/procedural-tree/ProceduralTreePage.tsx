import { useMemo, useState } from 'react'
import ProceduralTreeScene from './ProceduralTreeScene'
import { MBTI_TREE_THEME, type MbtiType } from '../../types'
import { MBTI_SHAPE_MAP, toGroundVariant, toTrunkVisualLevel } from '../../config/treeAssets'
import { GROUND_STAGE_LABEL, groundDryness, groundStage, knowledgeGrowthMultiplier } from '../../config/groundFertility'
import { buildTreeModel } from '../../components/tree/procedural/buildTreeModel'

/*============================================================================*\
  ProceduralTreePage — [experiment / dev only] พรีวิวต้นไม้ตาม MBTI + เลเวลการเติบโตจริง
  เข้าได้ทาง URL ตรงๆ /dev/procedural-tree ตอน `npm run dev` เท่านั้น — App.tsx ผูก route นี้ไว้หลัง
  import.meta.env.DEV ทำให้ build production ตัดทั้งหน้า (และ three.js ทั้งก้อน) ออกไปเอง
  แผงควบคุมใช้ "เลเวลเกมดิบ" ตัวเดียวกับที่แอปส่งเข้าต้นไม้ (floor(stack / 50) + 1 ไม่มีเพดาน)
  และแสดงผลที่เลเวลนั้นแปลงไปเป็น (ลำต้น ขั้น 1-8, จำนวนใบ/ดอก, ดิน ขั้น 1-3) ให้เห็นจุดตัดจริง
\*============================================================================*/

const MBTI_TYPES = Object.keys(MBTI_TREE_THEME) as MbtiType[]
const SHAPE_NAMES = { 1: 'NT ตั้งตรง', 2: 'NF แผ่อ่อนช้อย', 3: 'SJ ทรงโดม', 4: 'SP แผ่กว้าง' } as const

export default function ProceduralTreePage() {
  const [mbtiType, setMbtiType] = useState<MbtiType>('INFJ')
  const [trunkBranchLevel, setTrunk] = useState(60)
  const [leafFlowerLevel, setLeaf] = useState(60)
  const [grassSoilLevel, setSoil] = useState(30)
  const [dryDays, setDryDays] = useState(0)
  const dryness = groundDryness(dryDays)

  // สถิติของต้นที่กำลังแสดง (คำนวณชุดเดียวกับฉาก — แค่อ่านตัวเลขมาแสดงในแผง)
  const stats = useMemo(() => {
    const m = buildTreeModel({ mbtiType, trunkBranchLevel, leafFlowerLevel })
    return {
      branches: m.branches.length, leaves: m.leaves.length, flowers: m.flowers.length,
    }
  }, [mbtiType, trunkBranchLevel, leafFlowerLevel])

  const soilStep = toGroundVariant(grassSoilLevel)
  const soilPct = Math.min(100, grassSoilLevel)

  const sliders = [
    {
      label: 'ลำต้น (ความรู้)', value: trunkBranchLevel, set: setTrunk, max: 150, min: 1,
      detail: `ขั้นภาพ ${toTrunkVisualLevel(trunkBranchLevel)}/8 · กิ่ง ${stats.branches} · ใบ ${stats.leaves}`,
    },
    {
      label: 'ดอก (จิตใจ)', value: leafFlowerLevel, set: setLeaf, max: 150, min: 1,
      detail: `${stats.flowers} ดอก (ต้นเลเวล ≤ 20 ยังไม่ออกดอก)`,
    },
    {
      label: 'ทุ่งหญ้า (สุขภาพกาย)', value: grassSoilLevel, set: setSoil, max: 60, min: 1,
      detail: `ขั้น ${soilStep}/3 · ความหนาแน่นหญ้า ${Math.round(55 + soilPct * 0.45)}%`,
    },
    {
      label: 'วันที่ไม่ได้ทำเควสสุขภาพ', value: dryDays, set: setDryDays, max: 20, min: 0,
      detail: `${GROUND_STAGE_LABEL[groundStage(dryness)]} · ต้นไม้ได้คะแนนความรู้ ${Math.round(knowledgeGrowthMultiplier(dryness) * 100)}%`,
    },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#cfe4f1' }}>
      <ProceduralTreeScene
        mbtiType={mbtiType}
        trunkBranchLevel={trunkBranchLevel}
        leafFlowerLevel={leafFlowerLevel}
        grassSoilLevel={grassSoilLevel}
        daysSinceHealthQuest={dryDays}
      />

      <div
        style={{
          position: 'absolute', top: 12, left: 12, width: 250, padding: '10px 12px', borderRadius: 12,
          background: 'rgba(15, 22, 30, .72)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-body)',
          display: 'flex', flexDirection: 'column', gap: 8, backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13 }}>Procedural tree · dev only</div>

        <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6, alignItems: 'center' }}>
          <span>MBTI</span>
          <select
            value={mbtiType}
            onChange={(e) => setMbtiType(e.target.value as MbtiType)}
            style={{ padding: '3px 6px', borderRadius: 6, border: 'none' }}
          >
            {MBTI_TYPES.map((t) => (
              <option key={t} value={t}>{t} — {MBTI_TREE_THEME[t].treeName}</option>
            ))}
          </select>
          <span />
          <span style={{ opacity: 0.75 }}>รูปทรงกลุ่ม {SHAPE_NAMES[MBTI_SHAPE_MAP[mbtiType]]}</span>
        </label>

        {sliders.map((s) => (
          <label key={s.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0 6px' }}>
            <span>{s.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.min === 0 ? `${s.value} วัน` : `Lv.${s.value}`}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={1}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              style={{ gridColumn: '1 / -1' }}
            />
            <span style={{ gridColumn: '1 / -1', opacity: 0.75 }}>{s.detail}</span>
          </label>
        ))}

        <div style={{ opacity: 0.7, lineHeight: 1.5 }}>
          เลเวล = floor(คะแนนสะสม / 50) + 1 · ต้นและสีหญ้าชุดเดียวกับหน้า Home
          <br />ลากเพื่อหมุนกล้อง · สกรอลล์เพื่อซูม
        </div>
      </div>
    </div>
  )
}
