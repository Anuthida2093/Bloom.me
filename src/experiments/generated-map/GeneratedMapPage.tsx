import { useEffect, useRef, useState } from 'react'
import { MUSHROOM_FOREST_PALETTE } from '../../config/generatedMapArt'
import { generateMapScene, MUSHROOM_FOREST_SEED, type MapScene } from '../../components/quest/games/physical/mapgen/generateMapScene'
import { paintMapScene } from '../../components/quest/games/physical/mapgen/paintMapScene'
import { renderMapArt, sceneArtSize, type MapArtResult } from '../../components/quest/games/physical/mapgen/renderMapArt'
import { footprintOf } from '../../components/scenery/sceneryShapes'
import { JOURNEY_MAPS } from '../../config/journeyMaps'
import MapPathRenderer from '../../components/quest/games/physical/MapPathRenderer'
import CatCompanion from '../../components/quest/games/physical/CatCompanion'
import DestinationPicker from '../../components/quest/games/physical/DestinationPicker'
import { StepChestMarker } from '../../components/quest/games/physical/StepChest'
import CanvasHero from '../../components/quest/games/physical/CanvasHero'
import MiniMap from '../../components/quest/games/physical/MiniMap'
import { GENERATED_MAP_NATIVE_SIZE, MAP_NATIVE_SIZE, mapNativeSize, poseAtPathPct, samplePath, withLivePath } from '../../components/quest/games/physical/journeyPathMath'
import { useMapPanZoom } from '../../hooks/useMapPanZoom'
import { AddFriendButton } from '../../components/friends/FriendWater'
import '../../components/friends/FriendWater.css'
import '../../components/quest/games/physical/StepJourneyGame.css'

/*============================================================================*\
  [dev only] /dev/generated-map — ตรวจแผนที่ที่วาดด้วยโค้ด
  ────────────────────────────────────────────────────────────────────────────
  ?seeds=777,1,42  วาดหลาย seed เรียงกัน (บนเธรดหลัก ผลเหมือนเดิมทุกครั้ง — ใช้กับเทสต์ screenshot)
  ?size=512        ขนาดภาพต่อใบ (px)
  ?debug           แสดงเส้นทาง/ทางแยก/รอยเท้าของ/ลานโล่ง/จุดหมายเลข
  ?perf            วัดเวลาสร้าง+วาดผ่าน renderMapArt จริง (worker) — ผลอยู่ใน window.__mapArtPerf
  ?game=45         แผนที่ 9 ในคอมโพเนนต์จริงของเกม (ภาพ + จุดหมายเลข + นกฮูกที่ 45% + หีบ)
  ?picker          การ์ดเลือกแผนที่ทั้ง 9 ใบ
  ?owl             ตัวละครคน Canvas (เจ้าชาย / เจ้าหญิง เดิน / นักผจญภัย เดิน / ขนาดเล็ก)
  ?pan=30          แผนที่ 9 แบบลากได้ทุกทิศ (ระบบเดียวกับเกม) เปิดมาที่ตัวละคร + ปุ่มเพิ่มเพื่อน
  ?map=flower-garden  ใช้กับ ?pan — เปิดแผนที่ใบอื่นแทนแผนที่ 9 (ดูชื่อสถานที่บนแผนที่ย่อ)
\*============================================================================*/

const q = new URLSearchParams(window.location.search)
const SEEDS = (q.get('seeds') ?? String(MUSHROOM_FOREST_SEED)).split(',').map(Number)
const SIZE = Number(q.get('size') ?? 512)
const DEBUG = q.has('debug')
const PERF = q.has('perf')
const GAME = q.get('game')
const PICKER = q.has('picker')
const OWL = q.has('owl')
const PAN = q.get('pan')
const MAP_ID = q.get('map') ?? 'mushroom-forest'

declare global {
  interface Window { __mapArtPerf?: MapArtResult['timings'] & { mode: string; size: number }; __mapReady?: boolean }
}

function drawDebug(c: CanvasRenderingContext2D, s: MapScene, k: number) {
  c.setTransform(k, 0, 0, k, 0, 0)
  c.lineWidth = 3 / k
  ;[s.main, ...s.branches].forEach((p, i) => {
    c.strokeStyle = ['#ff3c3c', '#ffaa00', '#00c8ff', '#ff00c8'][i]
    c.beginPath(); c.moveTo(p.points[0][0], p.points[0][1]); p.points.forEach(([x, y]) => c.lineTo(x, y)); c.stroke()
  })
  c.strokeStyle = 'rgba(255,255,255,.9)'
  for (const f of s.features) { c.beginPath(); c.arc(f.x, f.y, f.r, 0, Math.PI * 2); c.stroke() }
  c.strokeStyle = 'rgba(255,255,0,.35)'; c.lineWidth = 1 / k
  for (const o of s.objects) for (const fp of footprintOf(o)) { c.beginPath(); c.arc(fp.x, fp.y, fp.r, 0, Math.PI * 2); c.stroke() }
  c.fillStyle = '#5bc0ff'
  for (const [x, y] of s.route.milestones) { c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill() }
}

function SceneCanvas({ seed }: { seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current?.getContext('2d')
    if (!c) return
    const scene = generateMapScene(seed)
    paintMapScene(c, scene, MUSHROOM_FOREST_PALETTE, SIZE / scene.world)
    if (DEBUG) drawDebug(c, scene, SIZE / scene.world)
  }, [seed])
  return <canvas ref={ref} width={SIZE} height={SIZE} data-seed={seed} style={{ width: SIZE, height: SIZE, display: 'block' }} />
}

/** แผนที่ 9 ในชั้นเดียวกับ StepJourneyGame (กล่อง 2048 หน่วย ย่อให้พอดีจอ) */
function GameView({ progress }: { progress: number }) {
  const map = JOURNEY_MAPS.find((m) => m.id === 'mushroom-forest')!
  const N = GENERATED_MAP_NATIVE_SIZE.width
  const scale = Math.min(window.innerWidth, window.innerHeight) / N
  return (
    <div style={{ position: 'relative', width: N * scale, height: N * scale, overflow: 'hidden' }}>
      <div className="step-journey-game__map-canvas" style={{ width: N, height: N, transform: `scale(${scale})` }}>
        <div className="sjg-map-layer">
          <MapPathRenderer mapDef={map} progressPct={progress} />
          <CatCompanion mapDef={map} progressPct={progress} />
          <StepChestMarker mapDef={map} ready={progress >= 100} onOpen={() => {}} />
        </div>
      </div>
    </div>
  )
}

/** นกฮูก Canvas ท่ายืน/บิน (ขนาดใหญ่ ไว้ตรวจหน้าตา) */
function OwlView() {
  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, background: '#2f6a3a', minHeight: '100vh' }}>
      <CanvasHero size={240} outfit="prince" />
      <CanvasHero size={240} outfit="princess" walking />
      <CanvasHero size={240} walking />
      <CanvasHero size={72} outfit="princess" />
    </div>
  )
}

/** แผนที่ 9 ในระบบลาก/ซูมเดียวกับเกม (ซูมเท่าแผนที่ 1024 → ลากได้ทุกทิศ) + ปุ่มเพิ่มเพื่อน */
function PanView({ progress }: { progress: number }) {
  const map = JOURNEY_MAPS.find((m) => m.id === MAP_ID) ?? JOURNEY_MAPS[JOURNEY_MAPS.length - 1]
  const native = mapNativeSize(map)
  const p = poseAtPathPct(samplePath(withLivePath(map)), progress)
  const { containerRef, scale, pan, handlers } = useMapPanZoom(native, { coverSize: MAP_NATIVE_SIZE, portraitZoom: 1.45, initialFocusPct: { x: p.x, y: p.y } })
  return (
    <div className="step-journey-game" ref={containerRef} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}
      onPointerDown={handlers.onPointerDown} onPointerMove={handlers.onPointerMove} onPointerUp={handlers.onPointerUp}>
      <div className="step-journey-game__map-canvas" data-pan={`${Math.round(pan.x)},${Math.round(pan.y)},${scale.toFixed(3)}`}
        style={{ width: native.width, height: native.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
        <div className="sjg-map-layer">
          <MapPathRenderer mapDef={map} progressPct={progress} />
          <CatCompanion mapDef={map} progressPct={progress} />
        </div>
      </div>
      <MiniMap mapDef={map} progressPct={progress} steps={Math.round(progress * 80)} goalSteps={8000} pan={pan} scale={scale} />
      <div style={{ position: 'absolute', right: 12, top: 80, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AddFriendButton requested={false} friendName="มายด์" onClick={() => {}} />
        <AddFriendButton requested friendName="มายด์" onClick={() => {}} />
      </div>
    </div>
  )
}

export default function GeneratedMapPage() {
  if (PAN !== null) return <PanView progress={Number(PAN) || 0} />
  if (OWL) return <OwlView />
  if (GAME !== null) return <GameView progress={Number(GAME) || 0} />
  // ห่อด้วยกล่องเดียวกับในเกม (ความสูงการ์ดคิดจากกล่องนี้) · &level=12 = ดูแผนที่ที่ยังล็อก
  if (PICKER) return <div className="step-journey-game step-journey-game--center" style={{ position: 'fixed', inset: 0 }}><DestinationPicker onPicked={() => {}} playerLevel={Number(q.get('level') ?? 1)} /></div>
  return <SceneSheet />
}

function SceneSheet() {
  const [perf, setPerf] = useState<string>('')
  useEffect(() => {
    window.__mapReady = true
    if (!PERF) return
    const size = sceneArtSize(undefined, GENERATED_MAP_NATIVE_SIZE.width)
    renderMapArt({ seed: MUSHROOM_FOREST_SEED }, size).then((r) => {
      window.__mapArtPerf = { ...r.timings, mode: r.mode, size }
      setPerf(JSON.stringify(window.__mapArtPerf, (_, v) => (typeof v === 'number' ? Math.round(v) : v)))
    })
  }, [])
  return (
    <div style={{ background: '#1d3a26', minHeight: '100vh', padding: 8, color: '#eaf5ec', fontFamily: 'system-ui' }}>
      {perf && <pre id="perf">{perf}</pre>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SEEDS.map((s) => <SceneCanvas key={s} seed={s} />)}
      </div>
    </div>
  )
}
