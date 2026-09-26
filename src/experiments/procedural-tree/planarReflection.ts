import * as THREE from 'three'

/*============================================================================*\
  PlanarReflection — [experiment] เงาสะท้อนจริงบนพื้นระนาบ y = 0 (หลักการเดียวกับ Reflector ของ three)
  ────────────────────────────────────────────────────────────────────────────
  ทุกเฟรม: วางกล้องสะท้อน (mirror camera) ไว้ใต้พื้นตรงข้ามกล้องจริง → เรนเดอร์ฉากทั้งหมด (ยกเว้นตัว
  พื้นเอง) ลง render target → ผิวด้านบนของบล็อกพื้นอ่านภาพนั้นตามตำแหน่งบนจอ (projective texture)
  เบลอตามความด้านของพื้น และแรงขึ้นตอนมองเฉียง (fresnel) — ได้เงาต้นไม้/ท้องฟ้าจริงที่ขยับตามกล้อง

  เป็นคลาสธรรมดานอก React: ค่าที่เปลี่ยนทุกเฟรม (กล้องสะท้อน/matrix/uniform) อยู่ในนี้ทั้งหมด
  component แค่เรียก update() ใน useFrame
\*============================================================================*/

const PLANE_NORMAL = new THREE.Vector3(0, 1, 0)
const PLANE_POINT = new THREE.Vector3(0, 0, 0)

// เมทริกซ์แปลงพิกัด clip (-1..1) → พิกัด texture (0..1)
const BIAS = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
)

export class PlanarReflection {
  readonly material: THREE.MeshStandardMaterial
  private readonly target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  private readonly mirrorCamera = new THREE.PerspectiveCamera()
  private readonly uniforms = {
    uReflTex: { value: this.target.texture },
    uReflMatrix: { value: new THREE.Matrix4() },
    uReflStrength: { value: 0.8 },
    uReflBlur: { value: 0.002 },
  }

  // ตัวแปรชั่วคราวใช้ซ้ำทุกเฟรม (ไม่ allocate ใหม่ใน render loop)
  private readonly camPos = new THREE.Vector3()
  private readonly view = new THREE.Vector3()
  private readonly lookAt = new THREE.Vector3()
  private readonly lookTarget = new THREE.Vector3()
  private readonly rotation = new THREE.Matrix4()

  constructor() {
    this.material = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.14, envMapIntensity: 1.1 })
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms)

      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform mat4 uReflMatrix;
          varying vec4 vReflUv;
          varying float vReflTop;`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 reflWorld = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            reflWorld = instanceMatrix * reflWorld;
          #endif
          reflWorld = modelMatrix * reflWorld;
          vReflUv = uReflMatrix * reflWorld;
          vReflTop = step(0.5, objectNormal.y); // เฉพาะผิวด้านบนของบล็อกที่สะท้อน`)

      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uReflTex;
          uniform float uReflStrength;
          uniform float uReflBlur;
          varying vec4 vReflUv;
          varying float vReflTop;`)
        .replace('#include <opaque_fragment>', `
          if (vReflTop > 0.5) {
            vec2 ruv = vReflUv.xy / vReflUv.w;
            // เบลอ 9 จุดตามความด้านของพื้น (glossy reflection)
            vec3 refl = vec3(0.0);
            for (int x = -1; x <= 1; x++) {
              for (int y = -1; y <= 1; y++) {
                refl += texture2D(uReflTex, ruv + vec2(float(x), float(y)) * uReflBlur).rgb;
              }
            }
            refl /= 9.0;
            // fresnel: มองเฉียง (ไกล/ขอบฟ้า) สะท้อนแรง มองลงพื้นใกล้ๆ เห็นบล็อกสีเข้มเป็นหลัก
            float fres = 0.12 + 0.88 * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
            outgoingLight = mix(outgoingLight, refl, clamp(uReflStrength * fres, 0.0, 1.0));
          }
          #include <opaque_fragment>`)
    }
  }

  /** ขนาด render target (พิกเซลจริง) — ใช้ครึ่งความละเอียดจอพอ เพราะเบลออยู่แล้ว */
  setSize(width: number, height: number) {
    this.target.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
  }

  /** ความด้านของพื้น → ทั้งความหยาบของวัสดุและความเบลอของเงาสะท้อน */
  setRoughness(roughness: number) {
    this.material.roughness = roughness
    this.uniforms.uReflBlur.value = 0.0005 + roughness * 0.012
  }

  /** ความแรงของเงาสะท้อน 0-1 */
  setStrength(strength: number) {
    this.uniforms.uReflStrength.value = strength
  }

  /** เรนเดอร์ภาพสะท้อนของเฟรมนี้ — ซ่อนตัวพื้น (hidden) ระหว่างเรนเดอร์ ไม่ให้สะท้อนตัวเอง */
  update(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, hidden: (THREE.Object3D | null)[]) {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    this.camPos.setFromMatrixPosition(camera.matrixWorld)
    this.view.subVectors(PLANE_POINT, this.camPos)
    if (this.view.dot(PLANE_NORMAL) > 0) return // กล้องอยู่ใต้พื้น ไม่ต้องสะท้อน

    // ตำแหน่งกล้องสะท้อน = กล้องจริงสะท้อนข้ามระนาบ
    this.view.reflect(PLANE_NORMAL).negate().add(PLANE_POINT)
    this.rotation.extractRotation(camera.matrixWorld)
    this.lookAt.set(0, 0, -1).applyMatrix4(this.rotation).add(this.camPos)
    this.lookTarget.subVectors(PLANE_POINT, this.lookAt).reflect(PLANE_NORMAL).negate().add(PLANE_POINT)

    const mc = this.mirrorCamera
    mc.position.copy(this.view)
    mc.up.set(0, 1, 0).applyMatrix4(this.rotation).reflect(PLANE_NORMAL)
    mc.lookAt(this.lookTarget)
    mc.near = camera.near
    mc.far = camera.far
    mc.updateMatrixWorld()
    mc.projectionMatrix.copy(camera.projectionMatrix)

    this.uniforms.uReflMatrix.value.copy(BIAS).multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse)

    const visibility = hidden.map((o) => o?.visible ?? false)
    hidden.forEach((o) => { if (o) o.visible = false })
    const prevTarget = gl.getRenderTarget()
    const prevShadowAuto = gl.shadowMap.autoUpdate
    gl.shadowMap.autoUpdate = false // ใช้ shadow map ของเฟรมหลัก ไม่คำนวณซ้ำรอบสะท้อน
    gl.setRenderTarget(this.target)
    gl.clear()
    gl.render(scene, mc)
    gl.setRenderTarget(prevTarget)
    gl.shadowMap.autoUpdate = prevShadowAuto
    hidden.forEach((o, i) => { if (o) o.visible = visibility[i] })
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
  }
}
