import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createRng, generateTree, type BranchSegment, type LeafAnchor, type TreeParams } from '../../components/tree/procedural/generateTree'
import { PlanarReflection } from './planarReflection'
import { createLeafTextures, type LeafTextures } from './leafTexture'

/*============================================================================*\
  ProceduralTreeScene — [experiment] ฉาก 3D ต้นไม้ procedural บนพื้นบล็อกมันวาว (dev only)
  ────────────────────────────────────────────────────────────────────────────
  - กิ่ง: ท่อเรียวตามเส้นโค้ง CatmullRom (start→mid→end จาก generateTree) รวมเป็น geometry เดียว
    (draw call เดียวทั้งต้น)
  - ใบ: InstancedMesh ของแผ่นใบพับตามเส้นกลางใบ + texture ใบ (สี/alpha/normal map จาก leafTexture.ts)
    สีเขียวสุ่มต่อชิ้น — หลักหมื่นชิ้นยังลื่น
  - พื้น: InstancedMesh ของกล่องสี่เหลี่ยมสีเข้ม metalness สูง/roughness ต่ำ สูงต่างกันนิดหน่อย
  - แสงสะท้อน: RoomEnvironment ของ three เอง (สร้างในเครื่อง ไม่โหลด HDR จาก CDN) ให้ประกายโลหะ
    + เงาสะท้อนจริงของต้นไม้/ท้องฟ้าบนผิวบล็อกด้านบนผ่าน PlanarReflection (planarReflection.ts)
\*============================================================================*/

export interface SceneOptions {
  tree: Partial<TreeParams>
  /** จำนวนใบต่อ 1 จุดยึดพุ่มใบ */
  leavesPerAnchor: number
  /** ความหยาบผิวพื้น 0 = กระจกเงา, 1 = ด้าน (เงาสะท้อนเบลอตาม) */
  floorRoughness: number
  /** ความแรงของเงาสะท้อนต้นไม้บนพื้น 0-1 */
  floorReflectivity: number
}

const SKY = '#b9c5d1'
/** ตำแหน่งแสงหลัก (ซ้ายบน) — ใช้ทั้งกับ directionalLight และคำนวณทิศใบให้หันหาแสง */
const SUN_POSITION: [number, number, number] = [-9, 16, 7]

/* ── กิ่ง: ท่อเรียวตามเส้นโค้ง รวมทุกกิ่งเป็น BufferGeometry เดียว ── */
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

    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular
      curve.getPointAt(t, P)
      let r = b.radiusStart + (b.radiusEnd - b.radiusStart) * t
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

/** [ถ้ามีรูปใบไม้จริง] path ของ PNG พื้นโปร่งใส ใบชี้ขึ้น โคนใบอยู่ขอบล่างของภาพ เช่น
 *  '/assets/images/tree/leaf-texture.png' — null = ใช้ texture ที่วาดด้วย canvas (leafTexture.ts) */
const LEAF_TEXTURE_URL: string | null = null

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
  const textures = createLeafTextures(LEAF_TEXTURE_URL)
  // วัสดุสำหรับ shadow map — ใช้ alpha เดียวกัน เงาจึงเป็นรูปใบ ไม่ใช่เงาสี่เหลี่ยม
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: textures.map, alphaTest: 0.45 })
  return { textures, depth }
}

function Branches({ branches }: { branches: BranchSegment[] }) {
  const geometry = useMemo(() => buildBranchGeometry(branches), [branches])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#4a3423" roughness={0.9} metalness={0.05} />
    </mesh>
  )
}

const Z_AXIS = new THREE.Vector3(0, 0, 1)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

function Leaves({ anchors, perAnchor, seed }: { anchors: LeafAnchor[]; perAnchor: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => buildLeafGeometry(), [])
  const [{ textures, depth }] = useState(createLeafMaterials)
  const count = anchors.length * perAnchor

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = createRng(seed * 31 + 7)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const spin = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const outward = new THREE.Vector3()
    const face = new THREE.Vector3()
    const tipNow = new THREE.Vector3()
    const tipWant = new THREE.Vector3()
    const cross = new THREE.Vector3()
    const sun = new THREE.Vector3(...SUN_POSITION).normalize()
    // จุดศูนย์กลางพุ่ม = ค่าเฉลี่ยจุดยึดพุ่มใบทั้งหมด (ใช้หาทิศ "ออกนอกพุ่ม" ของแต่ละใบ)
    const center = new THREE.Vector3()
    for (const a of anchors) center.add(new THREE.Vector3(...a.position))
    if (anchors.length) center.divideScalar(anchors.length)
    const scl = new THREE.Vector3()
    const color = new THREE.Color()
    let k = 0
    for (const a of anchors) {
      for (let i = 0; i < perAnchor; i++) {
        // กระจายเป็นก้อนทรงรีรอบปลายกิ่ง (แบนลงนิดหน่อยให้พุ่มดูเป็นชั้น)
        const r = a.size * 0.55 * Math.cbrt(rand())
        const th = rand() * Math.PI * 2
        const ph = Math.acos(2 * rand() - 1)
        pos.set(
          a.position[0] + r * Math.sin(ph) * Math.cos(th),
          a.position[1] + r * Math.cos(ph) * 0.75,
          a.position[2] + r * Math.sin(ph) * Math.sin(th),
        )
        // ทิศหน้าใบ: หันออกนอกพุ่ม (จากจุดศูนย์กลางพุ่ม) ผสมกับหันหาแสง + สุ่มนิดหน่อยไม่ให้เรียบเกินจริง
        outward.set(pos.x - center.x, (pos.y - center.y) * 0.8, pos.z - center.z).normalize()
        face.copy(outward).multiplyScalar(0.7).addScaledVector(sun, 0.3)
        face.x += (rand() - 0.5) * 0.7
        face.y += (rand() - 0.5) * 0.7
        face.z += (rand() - 0.5) * 0.7
        face.normalize()
        q.setFromUnitVectors(Z_AXIS, face)
        // ปลายใบชี้ออกจากกิ่ง (ทิศออกนอกพุ่ม) บนระนาบของใบ — หมุนรอบแกนหน้าใบให้ปลายใบตรงทิศนั้น
        tipNow.copy(Y_AXIS).applyQuaternion(q)
        tipWant.copy(outward).addScaledVector(face, -outward.dot(face))
        tipWant.x += (rand() - 0.5) * 0.6
        tipWant.z += (rand() - 0.5) * 0.6
        tipWant.addScaledVector(face, -tipWant.dot(face))
        if (tipWant.lengthSq() > 1e-6) {
          tipWant.normalize()
          const angle = Math.atan2(cross.crossVectors(tipNow, tipWant).dot(face), tipNow.dot(tipWant))
          spin.setFromAxisAngle(face, angle)
          q.premultiply(spin)
        }
        const s = 0.75 + rand() * 0.6
        scl.set(s, s, s)
        m.compose(pos, q, scl)
        mesh.setMatrixAt(k, m)
        // เขียวหลายเฉด: ใบด้านบน/นอกพุ่มสว่างกว่าเล็กน้อย (ใกล้เคียงแสงจากฟ้าในภาพอ้างอิง)
        const lift = Math.min(1, Math.max(0, (pos.y - 6) / 8))
        // สว่างกว่าตอนไม่มี texture — texture คูณทับทำให้เข้มลงอีกชั้น (ขอบใบ/เส้นใบมีเงาในตัวอยู่แล้ว)
        // ใบหันหาแสงแล้ว (สว่างขึ้นเอง) จึงลดความสว่างพื้นลง ให้พุ่มยังมีเงามิติ ไม่ซีดทั้งพุ่ม
        color.setHSL(0.25 + rand() * 0.07, 0.42 + rand() * 0.22, 0.14 + rand() * 0.13 + lift * 0.06)
        mesh.setColorAt(k, color)
        k++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [anchors, perAnchor, seed])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => {
    textures.dispose()
    depth.dispose()
  }, [textures, depth])

  return (
    // key ผูกกับ count — InstancedMesh จองจำนวนตอนสร้าง เปลี่ยนความหนาแน่นใบต้องสร้างใหม่
    <instancedMesh key={count} ref={ref} args={[geometry, undefined, count]} customDepthMaterial={depth} castShadow receiveShadow>
      <meshStandardMaterial
        map={textures.map}
        normalMap={textures.normalMap}
        normalScale={[0.8, 0.8]}
        // alphaTest ตัดขอบใบ (ไม่ต้องเรียงลำดับความโปร่งใส) + alphaToCoverage ให้ขอบเนียนไม่เป็นฟันเลื่อย
        alphaTest={0.45}
        alphaToCoverage
        side={THREE.DoubleSide}
        roughness={0.62}
        metalness={0}
      />
    </instancedMesh>
  )
}

/* ── พื้นบล็อกสี่เหลี่ยมมันวาว สูงต่างกันเล็กน้อย เรียงลึกเข้าไปในฉาก ── */
const FLOOR_COLS = 44
const FLOOR_ROWS = 60
/** แถวที่ต้นไม้ยืน (z = 0) — แถวก่อนหน้านี้อยู่ไกลออกไปหลังต้น แถวหลังจากนี้ยื่นมาทางกล้อง
 *  (กล้องเริ่มต้นอยู่ที่ z ≈ 2.3 × ความสูงต้น พื้นต้องยื่นเลยจุดที่ขอบล่างของจอมองเห็น) */
const FLOOR_ROW_ORIGIN = 36
const BLOCK_W = 1.7
const BLOCK_D = 1.0
const GAP = 0.07

function Floor({ roughness, reflectivity }: { roughness: number; reflectivity: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const baseRef = useRef<THREE.Mesh>(null)
  const count = FLOOR_COLS * FLOOR_ROWS
  const { size, viewport } = useThree()
  const [reflection] = useState(() => new PlanarReflection())

  useEffect(() => () => reflection.dispose(), [reflection])
  // ครึ่งความละเอียดจอพอ (เงาสะท้อนถูกเบลออยู่แล้ว) — ประหยัดงานเรนเดอร์รอบที่สองลงราว 4 เท่า
  useEffect(() => reflection.setSize(size.width * viewport.dpr * 0.5, size.height * viewport.dpr * 0.5), [reflection, size, viewport.dpr])
  useEffect(() => reflection.setRoughness(roughness), [reflection, roughness])
  useEffect(() => reflection.setStrength(reflectivity), [reflection, reflectivity])
  // ทุกเฟรม ก่อน r3f เรนเดอร์ภาพหลัก: เรนเดอร์ภาพสะท้อน (ซ่อนตัวพื้น+แผ่นรองระหว่างนั้น)
  useFrame(({ gl, scene, camera }) => reflection.update(gl, scene, camera, [ref.current, baseRef.current]))

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = createRng(1234)
    const m = new THREE.Matrix4()
    const color = new THREE.Color()
    let k = 0
    for (let cx = 0; cx < FLOOR_COLS; cx++) {
      for (let rz = 0; rz < FLOOR_ROWS; rz++) {
        const x = (cx - FLOOR_COLS / 2 + 0.5) * (BLOCK_W + GAP)
        const z = (rz - FLOOR_ROW_ORIGIN) * (BLOCK_D + GAP)
        const h = 0.6 + rand() * 0.12 // ความสูงต่างกันนิดหน่อย ขอบบนจึงสะท้อนแสงไม่เท่ากัน
        m.makeScale(BLOCK_W, h, BLOCK_D)
        m.setPosition(x, -h / 2 + (rand() - 0.5) * 0.06, z)
        mesh.setMatrixAt(k, m)
        color.setHSL(0.6, 0.18, 0.06 + rand() * 0.035)
        mesh.setColorAt(k, color)
        k++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  return (
    <>
      <instancedMesh ref={ref} args={[undefined, reflection.material, count]} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {/* แผ่นรองใต้บล็อก — ร่องระหว่างบล็อกจะเป็นเส้นมืด ไม่ใช่เห็นทะลุไปถึงสีฟ้า */}
      <mesh ref={baseRef} rotation-x={-Math.PI / 2} position={[0, -0.35, ((FLOOR_ROWS - 1) / 2 - FLOOR_ROW_ORIGIN) * (BLOCK_D + GAP)]}>
        <planeGeometry args={[FLOOR_COLS * (BLOCK_W + GAP), FLOOR_ROWS * (BLOCK_D + GAP)]} />
        <meshBasicMaterial color="#05070a" />
      </mesh>
    </>
  )
}

/** แสงสะท้อนจาก RoomEnvironment (three สร้างเองในเครื่อง ไม่ต้องโหลดไฟล์ HDR) — เรียกจาก onCreated
 *  ของ Canvas (ครั้งเดียวต่อ renderer) GPU memory ของ texture นี้ถูกคืนตอน r3f dispose renderer
 *  เมื่อออกจากหน้า */
function applyLocalEnvironment({ gl, scene }: { gl: THREE.WebGLRenderer; scene: THREE.Scene }) {
  const pmrem = new THREE.PMREMGenerator(gl)
  const envScene = new RoomEnvironment()
  scene.environment = pmrem.fromScene(envScene, 0.04).texture
  scene.environmentIntensity = 0.55
  envScene.dispose()
  pmrem.dispose()
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
    controls.maxPolarAngle = Math.PI * 0.53
    controls.minDistance = 4
    controls.maxDistance = 40
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

export default function ProceduralTreeScene({ tree, leavesPerAnchor, floorRoughness, floorReflectivity }: SceneOptions) {
  const generated = useMemo(() => generateTree(tree), [tree])
  const top = useMemo(() => Math.max(...generated.branches.map((b) => b.end[1])), [generated])
  // เล็งต่ำกว่ากลางต้น — เฟรมจะได้ทั้งต้นไม้ด้านบนและเงาสะท้อนของพุ่มใบบนพื้นด้านล่าง
  const target = useMemo<[number, number, number]>(() => [0, top * 0.2, 0], [top])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      // กล้องสูงราว 40% ของต้น ถอยห่าง 2.3 เท่าความสูงต้น มองลงเล็กน้อย — เห็นทั้งต้น (ยอดไม่ล้นขอบบน)
      // และเงาสะท้อนของพุ่มใบเกือบทั้งหมดบนพื้นช่วงล่างของจอ (เดิมกล้องต่ำ 1.3 มองเงย เงาสะท้อนตกขอบจอ)
      camera={{ position: [0, top * 0.42, top * 2.3], fov: 45, near: 0.1, far: 200 }}
      onCreated={applyLocalEnvironment}
    >
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, top * 1.6, top * 5.5]} />

      <hemisphereLight args={['#e3ecf5', '#1a2130', 0.9]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.4}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={18}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />

      <Branches branches={generated.branches} />
      <Leaves anchors={generated.leafAnchors} perAnchor={leavesPerAnchor} seed={tree.seed ?? 1} />
      <Floor roughness={floorRoughness} reflectivity={floorReflectivity} />

      <Controls target={target} />
    </Canvas>
  )
}
