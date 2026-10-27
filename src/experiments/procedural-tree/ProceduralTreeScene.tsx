import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MbtiType } from '../../types'
import { groundDryness } from '../../config/groundFertility'
import { buildTreeModel, shade, type TreeModel } from '../../components/tree/procedural/buildTreeModel'
import { createRng, type BranchSegment } from '../../components/tree/procedural/generateTree'
import { groundPalette } from '../../components/tree/procedural/drawTree2D'
import { createLeafTextures, type LeafTextures } from './leafTexture'

/*============================================================================*\
  ProceduralTreeScene — [experiment / dev only] พรีวิวต้นไม้แบบ 3D จากค่าการเติบโตจริง
  ────────────────────────────────────────────────────────────────────────────
  ใช้ buildTreeModel ตัวเดียวกับหน้า Home (2D) — กิ่ง (generateTree), ใบ, ดอก
  ตรงกันทุกประการ ต่างแค่วิธีแสดงผล:
  - กิ่ง: ท่อเรียวตามเส้นโค้ง CatmullRom รวมเป็น geometry เดียว (draw call เดียวทั้งต้น)
  - ใบ: InstancedMesh แผ่นใบพับตามเส้นกลางใบ + texture ใบ (leafTexture.ts) สีจาก model ต่อใบ
  - พื้น: ทุ่งหญ้าวงกลม + ใบหญ้า instanced — หนาแน่นตาม grassSoilLevel, สีตามความแห้งของดิน
    (จำนวนวันที่ไม่ได้ทำเควสสุขภาพ — config/groundFertility.ts) เขียว → เหลือง → น้ำตาล → ดินร้าง
\*============================================================================*/

export interface SceneProps {
  mbtiType: MbtiType
  trunkBranchLevel: number
  leafFlowerLevel: number
  grassSoilLevel: number
  /** จำนวนวันที่ไม่ได้ทำเควสสุขภาพ (null = ยังไม่เคย) */
  daysSinceHealthQuest: number | null
}

const SKY = '#cfe4f1'
const SUN_POSITION: [number, number, number] = [-9, 16, 7]

/* ── ลำต้น/กิ่ง: ท่อเรียวตามเส้นโค้ง CatmullRom (start→mid→end) รวมทุกกิ่งเป็น BufferGeometry เดียว
   กิ่งปลายสุดเรียวจนปลายแหลม เหมือนหน้า Home ── */
/** รัศมีปลายกิ่งขั้นต่ำ (หน่วยต้นไม้) — ปลายกิ่งมน ไม่เป็นเข็ม */
const MIN_TIP_RADIUS = 0.035

function buildBranchGeometry(branches: BranchSegment[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const P = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (const b of branches) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...b.start), new THREE.Vector3(...b.mid), new THREE.Vector3(...b.end)])
    // ลำต้น/กิ่งใหญ่ละเอียดกว่า กิ่งฝอยใช้โพลีน้อย (มองไม่เห็นความต่างอยู่แล้ว)
    const tubular = b.depth < 2 ? 14 : b.depth < 4 ? 6 : 3
    const radial = b.depth < 2 ? 12 : b.depth < 4 ? 7 : 4
    const frames = curve.computeFrenetFrames(tubular, false)
    const base = positions.length / 3
    // ปลายกิ่งไม่เรียวจนแหลม (เหมือนหน้า Home) — ปิดปลายด้วยทรงกลมใน TipCaps
    const rEnd = Math.max(b.radiusEnd, MIN_TIP_RADIUS)

    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular
      curve.getPointAt(t, P)
      let r = b.radiusStart + (rEnd - b.radiusStart) * t
      if (b.depth === 0) r *= 1 + 0.7 * Math.pow(1 - t, 4) // โคนต้นบานออกเหมือนรากเกาะดิน
      const N = frames.normals[i]
      const B = frames.binormals[i]
      for (let j = 0; j <= radial; j++) {
        const v = (j / radial) * Math.PI * 2
        n.set(0, 0, 0).addScaledVector(N, Math.cos(v)).addScaledVector(B, Math.sin(v)).normalize()
        positions.push(P.x + n.x * r, P.y + n.y * r, P.z + n.z * r)
        normals.push(n.x, n.y, n.z)
      }
    }
    for (let i = 0; i < tubular; i++) {
      for (let j = 0; j < radial; j++) {
        const a = base + i * (radial + 1) + j
        const c = a + radial + 1
        indices.push(a, c, a + 1, c, c + 1, a + 1)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  return geo
}

function Branches({ model }: { model: TreeModel }) {
  const geometry = useMemo(() => buildBranchGeometry(model.branches), [model])
  useEffect(() => () => geometry.dispose(), [geometry])
  const color = shade(model.trunkColor, -0.04)
  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
      </mesh>
      <TipCaps model={model} color={color} />
    </>
  )
}

/** หัวมนทรงกลมปิดปลายกิ่งชั้นนอกสุด (instanced — draw call เดียว) */
function TipCaps({ model, color }: { model: TreeModel; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tips = useMemo(() => model.branches.filter((b) => b.depth === model.tipDepth), [model])
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    tips.forEach((b, i) => {
      const r = Math.max(b.radiusEnd, MIN_TIP_RADIUS)
      m.makeScale(r, r, r)
      m.setPosition(...b.end)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [tips])
  useEffect(() => () => geo.dispose(), [geo])
  if (!tips.length) return null
  return (
    <instancedMesh key={tips.length} ref={ref} args={[geo, undefined, tips.length]} castShadow>
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
    </instancedMesh>
  )
}

const LEAF_W = 0.26
const LEAF_L = 0.4

/* ── ใบ: แผ่นสี่เหลี่ยม (รูปทรงใบมาจาก alpha ของ texture) โคนใบอยู่ที่จุดหมุน
   พับเป็นรูปตัว V ตามเส้นกลางใบ + ปลายใบโค้งงอเล็กน้อย ให้มีมิติเวลาโดนแสง ── */
function buildLeafGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(LEAF_W, LEAF_L, 2, 4)
  geo.translate(0, LEAF_L / 2, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    pos.setZ(i, Math.abs(x) * 0.35 + Math.pow(y / LEAF_L, 2) * 0.05)
  }
  geo.computeVertexNormals()
  return geo
}

function createLeafMaterials(): { textures: LeafTextures; depth: THREE.MeshDepthMaterial } {
  const textures = createLeafTextures(null)
  // วัสดุสำหรับ shadow map — ใช้ alpha เดียวกัน เงาจึงเป็นรูปใบ ไม่ใช่เงาสี่เหลี่ยม
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: textures.map, alphaTest: 0.45 })
  return { textures, depth }
}

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

/** ใบชุดเดียวกับหน้า Home (ตำแหน่ง/ขนาด/สีจาก buildTreeModel) — หน้าใบหันออกนอกพุ่ม+หาแสง */
function Leaves({ model }: { model: TreeModel }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => buildLeafGeometry(), [])
  const [{ textures, depth }] = useState(createLeafMaterials)
  const count = model.leaves.length

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = createRng(count * 31 + 7)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const spin = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const outward = new THREE.Vector3()
    const face = new THREE.Vector3()
    const tipNow = new THREE.Vector3()
    const tipWant = new THREE.Vector3()
    const cross = new THREE.Vector3()
    const scl = new THREE.Vector3()
    const color = new THREE.Color()
    const sun = new THREE.Vector3(...SUN_POSITION).normalize()
    const { cx, cy, rx, ry } = model.crown
    model.leaves.forEach((leaf, k) => {
      pos.set(...leaf.position)
      outward.set((pos.x - cx) / rx, ((pos.y - cy) / ry) * 0.8, pos.z / rx).normalize()
      face.copy(outward).multiplyScalar(0.7).addScaledVector(sun, 0.3)
      face.x += (rand() - 0.5) * 0.7
      face.y += (rand() - 0.5) * 0.7
      face.z += (rand() - 0.5) * 0.7
      face.normalize()
      q.setFromUnitVectors(Z_AXIS, face)
      // ปลายใบชี้ออกนอกพุ่มบนระนาบของใบ — หมุนรอบแกนหน้าใบให้ปลายใบตรงทิศนั้น
      tipNow.copy(Y_AXIS).applyQuaternion(q)
      tipWant.copy(outward).addScaledVector(face, -outward.dot(face))
      if (tipWant.lengthSq() > 1e-6) {
        tipWant.normalize()
        const angle = Math.atan2(cross.crossVectors(tipNow, tipWant).dot(face), tipNow.dot(tipWant))
        spin.setFromAxisAngle(face, angle)
        q.premultiply(spin)
      }
      const s = leaf.length / LEAF_L
      scl.set(s * leaf.widthScale * 1.3, s, s)
      m.compose(pos, q, scl)
      mesh.setMatrixAt(k, m)
      mesh.setColorAt(k, color.set(leaf.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [model, count])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => {
    textures.dispose()
    depth.dispose()
  }, [textures, depth])

  if (count === 0) return null
  return (
    // key ผูกกับ count — InstancedMesh จองจำนวนตอนสร้าง เปลี่ยนจำนวนใบต้องสร้างใหม่
    <instancedMesh key={count} ref={ref} args={[geometry, undefined, count]} customDepthMaterial={depth} castShadow receiveShadow>
      <meshStandardMaterial
        map={textures.map}
        normalMap={textures.normalMap}
        normalScale={[0.8, 0.8]}
        alphaTest={0.45}
        alphaToCoverage
        side={THREE.DoubleSide}
        roughness={0.62}
        metalness={0}
      />
    </instancedMesh>
  )
}

/* ── ดอก: sprite ดอก 5 กลีบ (texture ต่อสี แคชไว้) ── */
const flowerTexCache = new Map<string, THREE.CanvasTexture>()
function flowerTexture(color: string): THREE.CanvasTexture {
  const cached = flowerTexCache.get(color)
  if (cached) return cached
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.translate(32, 32)
  ctx.fillStyle = color
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5)
    ctx.beginPath()
    ctx.ellipse(0, -15, 11, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#FFE08A'
  ctx.beginPath()
  ctx.arc(0, 0, 8, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  flowerTexCache.set(color, tex)
  return tex
}

function Flowers({ model }: { model: TreeModel }) {
  return (
    <group>
      {model.flowers.map((f, i) => (
        <sprite key={i} position={f.position} scale={[f.radius * 2.4, f.radius * 2.4, 1]} renderOrder={20}>
          <spriteMaterial map={flowerTexture(f.color)} transparent depthWrite={false} depthTest={false} rotation={f.rotation} />
        </sprite>
      ))}
    </group>
  )
}

/* ── ทุ่งหญ้า: พื้นวงกลมกว้าง + ใบหญ้า instanced — สี/ความหนาแน่นชุดเดียวกับหน้า Home
   (groundPalette ตามความแห้งของดิน, จำนวนหญ้าตาม grassSoilLevel) ── */
const MEADOW_RADIUS = 34

function Meadow({ grassSoilLevel, dryness }: { grassSoilLevel: number; dryness: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pal = groundPalette(dryness)
  const level = Math.max(0, Math.min(100, grassSoilLevel))
  const count = Math.round(5000 * (0.55 + (level / 100) * 0.45) * (1 - dryness * 0.85))
  const bladeGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.035, 1, 3, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = createRng(4242)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    const light = new THREE.Color(pal.blade), dark = new THREE.Color(pal.bladeDark)
    for (let i = 0; i < count; i++) {
      // หนาแน่นใกล้ต้นมากกว่า (รัศมีกระจายแบบ sqrt เอนเข้าหาศูนย์กลาง)
      const r = Math.pow(rand(), 0.75) * MEADOW_RADIUS * 0.8
      const a = rand() * Math.PI * 2
      p.set(Math.cos(a) * r, 0, Math.sin(a) * r)
      // หญ้าแห้งเอนล้ม/เตี้ยลง
      e.set((rand() - 0.5) * (0.5 + dryness), rand() * Math.PI, (rand() - 0.5) * (0.5 + dryness))
      q.setFromEuler(e)
      const h = (0.25 + rand() * 0.3) * (1 - dryness * 0.5)
      s.set(1, h, 1)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, c.copy(light).lerp(dark, rand()))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [count, dryness, pal.blade, pal.bladeDark])

  useEffect(() => () => bladeGeo.dispose(), [bladeGeo])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[MEADOW_RADIUS, 64]} />
        <meshLambertMaterial color={pal.top} />
      </mesh>
      {count > 0 && (
        <instancedMesh key={count} ref={ref} args={[bladeGeo, undefined, count]} receiveShadow>
          <meshLambertMaterial />
        </instancedMesh>
      )}
    </group>
  )
}

/** ลากหมุน/ซูมดูรอบต้นไม้ — จำกัดไม่ให้กล้องมุดลงใต้พื้น */
function Controls({ target }: { target: [number, number, number] }) {
  const { camera, gl } = useThree()
  const ref = useRef<OrbitControls | null>(null)
  // สร้าง/ทิ้งใน effect เดียวกัน (ไม่ใช่ useMemo) — StrictMode ตอน dev mount สองรอบจะได้ไม่ใช้ตัวที่ dispose ไปแล้ว
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.target.set(...target)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI * 0.55
    controls.minDistance = 4
    controls.maxDistance = 45
    controls.update()
    ref.current = controls
    return () => {
      controls.dispose()
      ref.current = null
    }
  }, [camera, gl, target])
  useFrame(() => ref.current?.update())
  return null
}

const CAMERA_TARGET: [number, number, number] = [0, 4.2, 0]
/** ความสูงต้นโตเต็มที่ในฉาก (หน่วยฉาก) */
const TREE_FULL_HEIGHT = 10.5

export default function ProceduralTreeScene({ mbtiType, trunkBranchLevel, leafFlowerLevel, grassSoilLevel, daysSinceHealthQuest }: SceneProps) {
  const model = useMemo(
    () => buildTreeModel({ mbtiType, trunkBranchLevel, leafFlowerLevel }),
    [mbtiType, trunkBranchLevel, leafFlowerLevel],
  )
  // ต้นโตเต็มที่สูง ~TREE_FULL_HEIGHT หน่วยฉาก ย่อตาม growth (หลักเดียวกับ fitTree ของหน้า Home)
  const treeScale = (TREE_FULL_HEIGHT * model.growth) / Math.max(model.bounds.maxY, 0.5)

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 6.5, 22], fov: 45, near: 0.1, far: 200 }}>
      <color attach="background" args={[SKY]} />
      <hemisphereLight args={['#f4f8ff', '#6b8f4e', 1.0]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.2}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={18}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />

      {/* จุดกำเนิดต้นไม้ (โคนต้น = จุดเริ่มราก) วางบนยอดเนินตรงกลาง */}
      <group scale={treeScale}>
        <Branches model={model} />
        <Leaves model={model} />
        <Flowers model={model} />
      </group>
      <Meadow grassSoilLevel={grassSoilLevel} dryness={groundDryness(daysSinceHealthQuest)} />

      <Controls target={CAMERA_TARGET} />
    </Canvas>
  )
}
