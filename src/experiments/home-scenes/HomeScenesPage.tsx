import { useEffect, useRef, useState } from 'react'
import type { MbtiType } from '../../types'
import { HOME_SCENES, type SceneWeather } from '../../config/homeScenes'
import { homeBackgroundSrc } from '../../config/homeBackgrounds'
import HomeSceneRenderer, { type HomeSceneStats } from '../../components/scenery/homeScenes/HomeSceneRenderer'
import { buildTreeModel } from '../../components/tree/procedural/buildTreeModel'
import { drawBranches, drawFoliage, fitTree } from '../../components/tree/procedural/drawTree2D'

/*============================================================================*\
  [dev only] /dev/home-scenes — Phase C: เทียบฉาก 1 (วิดีโอเดิม) กับฉากที่วาดด้วยโค้ด (3-5) ที่ 3 ขนาดจอ
  ────────────────────────────────────────────────────────────────────────────
  ปุ่มควบคุม: ฉาก · อากาศ (แดด/ฝน) · ความแรงลม · ทิศลม · ลดการเคลื่อนไหว · ต้นไม้ของผู้เล่น (สายพันธุ์/เลเวล)
  ?scene=3&weather=rain&vp=phone&freeze=2  แสดงจอเดียวเต็มหน้า เฟรมนิ่งที่ t=2 (ใช้กับเทสต์ screenshot)
\*============================================================================*/

const VIEWPORTS = [
  { id: 'phone', label: 'มือถือ (แนวตั้ง) 390×844', w: 390, h: 844 },
  { id: 'ipad', label: 'iPad (แนวนอน) 1024×768', w: 1024, h: 768 },
  { id: 'desktop', label: 'เดสก์ท็อป 1440×900', w: 1440, h: 900 },
] as const

const q = new URLSearchParams(window.location.search)
const SOLO_VP = q.get('vp')
const MBTIS: MbtiType[] = ['INFP', 'ENFP', 'INFJ', 'ENFJ', 'INTJ', 'ENTP', 'ISFP', 'ESFJ', 'ISTJ', 'ESTP', 'INTP', 'ENTJ', 'ISFJ', 'ESFP', 'ISTP', 'ESTJ']

/** ต้นไม้ของผู้เล่นวางกลางฉาก (ตำแหน่ง/สัดส่วนเดียวกับหน้า Home) — วาดครั้งเดียวบนแคนวาสใส */
function TreeLayer({ w, h, mbti, level }: { w: number; h: number; mbti: MbtiType; level: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = w * dpr; cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const model = buildTreeModel({ mbtiType: mbti, trunkBranchLevel: level, leafFlowerLevel: level, userSeed: 'preview' })
    const fit = fitTree(model, w, h)
    drawBranches(ctx, model, fit)
    const leaves = document.createElement('canvas')
    leaves.width = cv.width; leaves.height = cv.height
    const lc = leaves.getContext('2d')
    if (lc) { drawFoliage(lc, model, fit, dpr); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(leaves, 0, 0) }
  }, [w, h, mbti, level])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: w, height: h, pointerEvents: 'none' }} />
}

interface Ctl { sceneId: number; weather: SceneWeather; wind: number | null; dir: 1 | -1; still: boolean; tree: boolean; mbti: MbtiType; level: number }

function Frame({ vp, ctl, kind, scale, onStats }: { vp: (typeof VIEWPORTS)[number]; ctl: Ctl; kind: 'video' | 'code'; scale: number; onStats?: (s: HomeSceneStats) => void }) {
  const spec = HOME_SCENES.find((s) => s.id === ctl.sceneId)!
  const freeze = q.get('freeze')
  return (
    <div style={{ width: vp.w * scale, height: vp.h * scale, overflow: 'hidden', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,.25)', flexShrink: 0 }}>
      <div data-vp={vp.id} data-kind={kind} style={{ position: 'relative', width: vp.w, height: vp.h, transform: `scale(${scale})`, transformOrigin: '0 0', overflow: 'hidden', background: '#cfe0c4' }}>
        {kind === 'video' ? (
          <video src={`${homeBackgroundSrc(1)}#t=0.1`} muted loop autoPlay={!ctl.still} playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <HomeSceneRenderer
            spec={spec}
            weather={ctl.weather}
            windStrength={ctl.wind ?? undefined}
            windDirection={ctl.dir}
            animate={!ctl.still}
            frozenT={freeze !== null ? Number(freeze) : undefined}
            onStats={onStats}
            mbti={ctl.mbti}
          />
        )}
        {ctl.tree && <TreeLayer w={vp.w} h={vp.h} mbti={ctl.mbti} level={ctl.level} />}
      </div>
    </div>
  )
}

const fmt = (s: HomeSceneStats | undefined) => s
  ? `สร้างชั้นนิ่ง ${s.buildMs.toFixed(0)} ms · เฟรมแรก ${s.firstFrameMs.toFixed(0)} ms · ต่อเฟรม ${s.frameMs.toFixed(2)} ms · ${s.fps ? s.fps.toFixed(0) + ' fps' : '–'} · หน่วยความจำ ${(s.bytes / 1048576).toFixed(1)} MB (dpr ${s.dpr})`
  : 'กำลังวาด…'

export default function HomeScenesPage() {
  const [ctl, setCtl] = useState<Ctl>({
    sceneId: Number(q.get('scene') ?? 3), weather: (q.get('weather') as SceneWeather) ?? 'clear', wind: null, dir: 1,
    still: q.has('freeze'), tree: q.get('tree') !== '0', mbti: 'ENFP', level: 60,
  })
  const [stats, setStats] = useState<Record<string, HomeSceneStats>>({})
  const set = (p: Partial<Ctl>) => setCtl((c) => ({ ...c, ...p }))
  useEffect(() => { (window as unknown as { __homeSceneStats?: unknown }).__homeSceneStats = stats }, [stats])

  if (SOLO_VP) {
    const vp = VIEWPORTS.find((v) => v.id === SOLO_VP) ?? VIEWPORTS[0]
    return <div style={{ margin: 0 }}><Frame vp={vp} ctl={ctl} kind="code" scale={1} onStats={(s) => setStats({ [vp.id]: s })} /></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#20302a', color: '#eef4ee', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>ฉากพื้นหลังหน้า Home — รออนุมัติ (ยังไม่เปิดให้เลือกในแอป)</h1>
      <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: 13 }}>แถวบน = ฉาก 1 (วิดีโอเดิม) · แถวล่าง = ฉากที่วาดด้วยโค้ด · ต้นไม้วางกลางจอเหมือนหน้า Home</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: 14, fontSize: 14 }}>
        <label>ฉาก{' '}
          <select value={ctl.sceneId} onChange={(e) => set({ sceneId: Number(e.target.value) })}>
            {HOME_SCENES.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name} (ปลดล็อก Lv.{s.unlockLevel})</option>)}
          </select>
        </label>
        <label>อากาศ{' '}
          <select value={ctl.weather} onChange={(e) => set({ weather: e.target.value as SceneWeather })}>
            <option value="clear">☀️ แดด</option><option value="rain">🌧️ ฝน</option>
          </select>
        </label>
        <label>ลม {ctl.wind === null ? '(ตามอากาศ)' : ctl.wind.toFixed(2)}{' '}
          <input type="range" min={0} max={1.5} step={0.05} value={ctl.wind ?? 0.35} onChange={(e) => set({ wind: Number(e.target.value) })} />
        </label>
        <button type="button" onClick={() => set({ wind: null })}>ลมตามอากาศ</button>
        <button type="button" onClick={() => set({ dir: ctl.dir === 1 ? -1 : 1 })}>ทิศลม {ctl.dir === 1 ? '→' : '←'}</button>
        <label><input type="checkbox" checked={ctl.still} onChange={(e) => set({ still: e.target.checked })} /> ลดการเคลื่อนไหว (ภาพนิ่ง)</label>
        <label><input type="checkbox" checked={ctl.tree} onChange={(e) => set({ tree: e.target.checked })} /> แสดงต้นไม้</label>
        <label>สายพันธุ์{' '}
          <select value={ctl.mbti} onChange={(e) => set({ mbti: e.target.value as MbtiType })}>{MBTIS.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
        <label>เลเวล {ctl.level} <input type="range" min={1} max={100} value={ctl.level} onChange={(e) => set({ level: Number(e.target.value) })} /></label>
      </div>
      {(['video', 'code'] as const).map((kind) => (
        <div key={kind} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>{kind === 'video' ? 'ฉาก 1 · วิดีโอเดิม' : `ฉาก ${ctl.sceneId} · ${HOME_SCENES.find((s) => s.id === ctl.sceneId)!.name}`}</h2>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {VIEWPORTS.map((vp) => {
              const scale = vp.id === 'phone' ? 0.42 : vp.id === 'ipad' ? 0.36 : 0.3
              return (
                <figure key={vp.id} style={{ margin: 0 }}>
                  <figcaption style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>{vp.label}</figcaption>
                  <Frame vp={vp} ctl={ctl} kind={kind} scale={scale} onStats={kind === 'code' ? (s) => setStats((o) => ({ ...o, [vp.id]: s })) : undefined} />
                  {kind === 'code' && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, maxWidth: vp.w * scale }}>{fmt(stats[vp.id])}</div>}
                </figure>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
