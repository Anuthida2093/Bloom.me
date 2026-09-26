import { useMemo, useState } from 'react'
import ProceduralTreeScene from './ProceduralTreeScene'
import { DEFAULT_TREE_PARAMS, type TreeParams } from '../../components/tree/procedural/generateTree'

/*============================================================================*\
  ProceduralTreePage — [experiment / dev only] หน้าทดลองต้นไม้ procedural 3D
  เข้าได้ทาง URL ตรงๆ /dev/procedural-tree ตอน `npm run dev` เท่านั้น — App.tsx ผูก route นี้ไว้หลัง
  import.meta.env.DEV ทำให้ build production ตัดทั้งหน้า (และ three.js ทั้งก้อน) ออกไปเอง
  ไม่ได้เชื่อมกับหน้า Home หรือระบบต้นไม้แบบรูปภาพเดิม (treeAssets.ts / TreeOfLife.tsx) เลย
\*============================================================================*/

type SliderKey = 'maxDepth' | 'branchAngle' | 'upwardBias' | 'lengthDecay' | 'gnarl' | 'leavesPerAnchor' | 'floorRoughness' | 'floorReflectivity'

type Slider = {
  key: SliderKey
  label: string
  min: number
  max: number
  step: number
}

const SLIDERS: Slider[] = [
  { key: 'maxDepth', label: 'ชั้นการแตกกิ่ง', min: 3, max: 7, step: 1 },
  { key: 'branchAngle', label: 'มุมกิ่งข้าง (°)', min: 15, max: 70, step: 1 },
  { key: 'upwardBias', label: 'แรงดึงขึ้นฟ้า', min: 0, max: 0.6, step: 0.01 },
  { key: 'lengthDecay', label: 'ความยาวกิ่งลูก', min: 0.6, max: 0.92, step: 0.01 },
  { key: 'gnarl', label: 'ความคดงอ', min: 0, max: 0.4, step: 0.01 },
  { key: 'leavesPerAnchor', label: 'ใบต่อพุ่ม', min: 2, max: 30, step: 1 },
  { key: 'floorRoughness', label: 'ความด้านของพื้น', min: 0, max: 0.8, step: 0.01 },
  { key: 'floorReflectivity', label: 'ความแรงเงาสะท้อน', min: 0, max: 1, step: 0.01 },
]

export default function ProceduralTreePage() {
  const [values, setValues] = useState<Record<SliderKey, number>>({
    maxDepth: DEFAULT_TREE_PARAMS.maxDepth,
    branchAngle: DEFAULT_TREE_PARAMS.branchAngle,
    upwardBias: DEFAULT_TREE_PARAMS.upwardBias,
    lengthDecay: DEFAULT_TREE_PARAMS.lengthDecay,
    gnarl: DEFAULT_TREE_PARAMS.gnarl,
    leavesPerAnchor: 14,
    floorRoughness: 0.14,
    floorReflectivity: 0.75,
  })
  const [seed, setSeed] = useState(DEFAULT_TREE_PARAMS.seed)

  const tree = useMemo<Partial<TreeParams>>(() => ({
    seed,
    maxDepth: values.maxDepth,
    branchAngle: values.branchAngle,
    upwardBias: values.upwardBias,
    lengthDecay: values.lengthDecay,
    gnarl: values.gnarl,
  }), [seed, values.maxDepth, values.branchAngle, values.upwardBias, values.lengthDecay, values.gnarl])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#b9c5d1' }}>
      <ProceduralTreeScene
        tree={tree}
        leavesPerAnchor={values.leavesPerAnchor}
        floorRoughness={values.floorRoughness}
        floorReflectivity={values.floorReflectivity}
      />

      <div
        style={{
          position: 'absolute', top: 12, left: 12, width: 230, padding: '10px 12px', borderRadius: 12,
          background: 'rgba(15, 22, 30, .72)', color: '#fff', fontSize: 12, fontFamily: 'var(--font-body)',
          display: 'flex', flexDirection: 'column', gap: 6, backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13 }}>Procedural tree · dev only</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>seed</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
            style={{ width: 70, padding: '2px 6px', borderRadius: 6, border: 'none' }}
          />
          <button
            type="button"
            onClick={() => setSeed(Math.floor(Math.random() * 100000))}
            style={{ padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
          >
            สุ่มใหม่
          </button>
        </div>
        {SLIDERS.map((s) => (
          <label key={s.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0 6px' }}>
            <span>{s.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{values[s.key]}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={values[s.key]}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }))}
              style={{ gridColumn: '1 / -1' }}
            />
          </label>
        ))}
        <div style={{ opacity: .7 }}>ลากเพื่อหมุนกล้อง · สกรอลล์เพื่อซูม</div>
      </div>
    </div>
  )
}
