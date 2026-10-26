import { isSfxSuppressed } from './sfxGate'
/**
 * audioPlayer.ts
 * ────────────────
 * Utility กลางสำหรับเล่นเสียงประกอบ (SFX) ทุกเควสในเกม — ไม่ผูกกับ React lifecycle ใดๆ
 * เรียกใช้ได้จากทุกที่ (event handler, useEffect ฯลฯ)
 *
 * ══════════════════════════════════════════════════════════════════
 * [สำคัญ — อ่านก่อนใช้งาน] ต้องเตรียมไฟล์เสียงไว้ที่:
 *
 * public/assets/sounds/
 *
 * ตั้งชื่อไฟล์ตรงตามนี้เป๊ะ (อิงตาม SFX_FILES ด้านล่าง):
 *
 * bgm-relaxing-forest.mp3 — เพลงพื้นหลัง (BGM) สบายๆ เปิดคลอ
 * tree-grow.mp3          — เสียงตอนต้นไม้โต / เลเวลอัป
 * reward-claim.mp3       — เสียงรับรางวัล / รับไอเทม / รับเหรียญ
 * owl-walk .mp3          — เสียงนกฮูกเดินไปตามด่าน (ชื่อไฟล์จริงมีเว้นวรรคก่อนนามสกุล)
 * paper-crumple.mp3      — เสียงขยำกระดาษ (ตอนแปลงข้อความเป็นก้อนกระดาษ)
 * fire-burn.mp3          — เสียงไฟเผาไหม้ (ตอนกระดาษตกลงกองไฟ)
 * fire-crackle.mp3       — เสียงไฟลุกโชนต่อเนื่อง (loop เบาๆ)
 * card-flip.mp3          — เสียงพลิกไพ่ (ตอนไพ่เปิดหน้า)
 * card-draw.mp3          — เสียงหยิบไพ่ (ตอนคลิกไพ่จากกอง)
 * camera-shutter.mp3     — เสียงชัตเตอร์กล้อง (ตอนสแกนยืนยันทำภารกิจ)
 * water-drop.mp3         — เสียงหยดน้ำ (ตอนได้รางวัลหยดน้ำ)
 * sparkle-chime.mp3      — เสียงกริ๊งเบาๆ (ตอนต้นไม้ได้รับ growth pulse)
 * keypress.mp3           — เสียงพิมพ์ข้อความ Typewriter
 * quest-success.mp3      — เสียงทำเควสสำเร็จ
 * click.mp3              — เสียงกดปุ่มต่างๆ
 * WING.mp3               — [ใหม่] เสียงกระพือปีก หรือประกายเวทมนตร์ 
 * ══════════════════════════════════════════════════════════════════
 */

export const SFX_FILES = {
  BGM_FOREST: 'bgm-relaxing-forest.mp3',
  TREE_GROW: 'tree-grow.mp3',
  REWARD_CLAIM: 'reward-claim.mp3',
  OWL_WALK: 'owl-walk .mp3',
  PAPER_CRUMPLE: 'paper-crumple.mp3',
  FIRE_BURN: 'fire-burn.mp3',
  FIRE_CRACKLE: 'fire-crackle.mp3',
  CARD_FLIP: 'card-flip.mp3',
  CARD_DRAW: 'card-draw.mp3',
  CAMERA_SHUTTER: 'camera-shutter.mp3',
  WATER_DROP: 'water-drop.mp3',
  SPARKLE_CHIME: 'sparkle-chime.mp3',
  KEYPRESS: 'keypress.mp3',
  QUEST_SUCCESS: 'quest-success.mp3',
  CLICK: 'click.mp3',
  WING: 'WING.mp3', // 👈 เพิ่มบรรทัดนี้เข้ามา
} as const

export type SfxKey = keyof typeof SFX_FILES

const SOUND_BASE_PATH = '/assets/sounds/'

/** cache <audio> element ต่อไฟล์ 1 ตัว */
const audioCache = new Map<string, HTMLAudioElement>()

/** cache สำหรับเสียงที่ต้องวน loop (เช่นเสียงไฟลุกต่อเนื่อง) */
const loopingAudio = new Map<string, HTMLAudioElement>()

/** เก็บ Instance ของเสียงสั้นที่กำลังเปิดเล่นอยู่ทุกตัว (ไว้สำหรับตัดเสียงกลางคัน) */
const activeSfxInstances = new Map<string, Set<HTMLAudioElement>>()

interface PlaySfxOptions {
  /** ดัง-เบา 0-100 (มาตราส่วนเดียวกับ settings.sfxVolume ใน AppContext) ค่าเริ่มต้น 70 */
  volume?: number
  /** ผูกกับ settings.soundEnabled — ถ้า false จะไม่เล่นเสียงเลย */
  enabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// ระบบที่ 1: เล่นเสียงจากไฟล์ MP3 (พร้อมระบบจำ Instance และ Fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * playSfx — เล่นเสียงสั้นๆ ครั้งเดียว
 * (ใช้ cloneNode เพื่อรองรับการเล่นซ้ำถี่ๆ เช่น เสียงพิมพ์ข้อความ หรือสับไพ่)
 */
/** [แก้ตามที่ระบุ] เวลาล่าสุดที่เล่นเสียงเฉพาะของปุ่ม (ไม่ใช่เสียงคลิก) — เสียงคลิกกลางของทั้งระบบ
 *  (AudioContext) เช็คค่านี้แล้วข้ามไป ถ้าปุ่มนั้นเล่นเสียงของตัวเองแล้ว (ชัตเตอร์/รับรางวัล ฯลฯ) ไม่ให้เสียงซ้อน */
let lastSpecialSfxAt = 0
export function markSpecialSfx(): void { lastSpecialSfxAt = performance.now() }
export function msSinceSpecialSfx(): number { return performance.now() - lastSpecialSfxAt }

export function playSfx(key: SfxKey, options: PlaySfxOptions = {}): void {
  if (key !== 'CLICK') markSpecialSfx()
  if (options.enabled === false || isSfxSuppressed()) return
  // [แก้ตามที่ระบุ] เสียงพิมพ์ใช้เสียงสังเคราะห์ชุดใหม่ (ติ๊กนุ่มๆ) แทนไฟล์ keypress.mp3 เดิม
  if (key === 'KEYPRESS') {
    uiSounds.keypress(options.enabled, options.volume)
    return
  }
  const fileName = SFX_FILES[key]
  if (!fileName) return

  try {
    let baseAudio = audioCache.get(fileName)
    if (!baseAudio) {
      baseAudio = new Audio(SOUND_BASE_PATH + fileName)
      audioCache.set(fileName, baseAudio)
    }

    // cloneNode ช่วยให้เสียงรัวๆ เล่นซ้อนกันได้โดยไม่ตัดกันเอง
    const soundInstance = baseAudio.cloneNode(true) as HTMLAudioElement
    soundInstance.volume = Math.min(1, Math.max(0, (options.volume ?? 70) / 100))

    // บันทึก instance เข้าความจำ
    if (!activeSfxInstances.has(fileName)) {
      activeSfxInstances.set(fileName, new Set())
    }
    const instanceSet = activeSfxInstances.get(fileName)!
    instanceSet.add(soundInstance)

    // ลบออกจากความจำทันทีเมื่อเสียงเล่นจบ
    soundInstance.onended = () => {
      instanceSet.delete(soundInstance)
    }

    soundInstance.play().catch(() => {
      instanceSet.delete(soundInstance)
      // หากไม่มีไฟล์ mp3 อยู่จริง ให้ Fallback ไปใช้เสียงสังเคราะห์ Web Audio API
      if (key === 'CLICK') {
        uiSounds.click(options.enabled)
      } else if (key === 'CARD_FLIP' || key === 'CARD_DRAW') {
        uiSounds.pop(options.enabled)
      } else if (key === 'WATER_DROP' || key === 'REWARD_CLAIM') {
        uiSounds.pop(options.enabled)
      } else if (key === 'WING') {
        // ให้ fallback ชั่วคราวไปใช้ pop ถ้าไฟล์ WING.mp3 โหลดไม่ติด
        uiSounds.pop(options.enabled) 
      }
    })
  } catch {
    // Fallback
  }
}

/**
 * stopSfx — หยุดเสียงเอฟเฟกต์ชนิดนั้นๆ ที่กำลังเล่นอยู่ค้างทั้งหมดทันที
 */
export function stopSfx(key: SfxKey): void {
  const fileName = SFX_FILES[key]
  if (!fileName) return
  const instanceSet = activeSfxInstances.get(fileName)
  if (instanceSet) {
    instanceSet.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    instanceSet.clear()
  }
}

/** startLoopingSfx — เริ่มเล่นเสียงวนซ้ำ (เช่น เพลง BGM, เสียงไฟลุก) */
/** [แก้ตามที่ระบุ — 1.4] หยุดเสียงสั้นทุกตัวที่ยังเล่นค้าง (เช่นเสียงพิมพ์ keypress.mp3 ที่ไฟล์ยาวกว่า
 *  จังหวะพิมพ์) — เรียกตอนเปลี่ยน route / ซ่อนแท็บ (ดู RouteEffects.tsx) ไม่ให้เสียงไหลข้ามไปหน้าถัดไป */
export function stopAllSfx(): void {
  activeSfxInstances.forEach((instanceSet) => {
    instanceSet.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    instanceSet.clear()
  })
}

/** เสียงวนที่ถูกพักไว้ตอนซ่อนแท็บ — เล่นต่อเมื่อกลับมา (หน้าที่เปิดเสียงวนยังเปิดอยู่) */
const pausedLoops = new Set<HTMLAudioElement>()

/** [1.4] ซ่อนแท็บ/สลับแอป → พักเสียงวนทุกตัวที่กำลังเล่น (ไม่ล้างตำแหน่ง ไว้เล่นต่อ) */
export function pauseLoopingSfx(): void {
  loopingAudio.forEach((audio) => {
    if (!audio.paused) {
      audio.pause()
      pausedLoops.add(audio)
    }
  })
}

/** [1.4] กลับมาที่แท็บ → เล่นเสียงวนที่พักไว้ต่อ (ถ้าระหว่างนั้นหน้าเกมปิดไปแล้ว stopLoopingSfx ลบออกให้แล้ว) */
export function resumeLoopingSfx(): void {
  pausedLoops.forEach((audio) => { audio.play().catch(() => {}) })
  pausedLoops.clear()
}

export function startLoopingSfx(key: SfxKey, options: PlaySfxOptions = {}): void {
  if (options.enabled === false || isSfxSuppressed()) return
  const fileName = SFX_FILES[key]
  if (!fileName) return

  try {
    let audio = loopingAudio.get(fileName)
    if (!audio) {
      audio = new Audio(SOUND_BASE_PATH + fileName)
      audio.loop = true
      loopingAudio.set(fileName, audio)
    }
    audio.volume = Math.min(1, Math.max(0, (options.volume ?? 40) / 100))
    audio.play().catch(() => {})
  } catch {
    // no-op
  }
}

/** stopLoopingSfx — หยุดเสียงวนซ้ำที่เริ่มไว้ */
export function stopLoopingSfx(key: SfxKey): void {
  const fileName = SFX_FILES[key]
  if (!fileName) return
  const audio = loopingAudio.get(fileName)
  if (audio) {
    audio.pause()
    audio.currentTime = 0
    pausedLoops.delete(audio)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ระบบที่ 2: สังเคราะห์เสียง UI (Web Audio API) ทำงานได้ทันทีโดยไม่ต้องรอไฟล์
// ─────────────────────────────────────────────────────────────────────────────

const AudioCtx =
  window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
let synthCtx: AudioContext | null = null
let lastKeypressAt = 0

const initSynth = () => {
  if (!synthCtx) {
    synthCtx = new AudioCtx()
  }
  if (synthCtx.state === 'suspended') {
    synthCtx.resume()
  }
  return synthCtx
}

export const uiSounds = {
  /** เสียงพิมพ์ข้อความ Typewriter — [แก้ตามที่ระบุ] เสียงใหม่: "ติ๊ก" นุ่มๆ แบบปลายนิ้วแตะไม้
   *  (noise สั้นผ่าน bandpass + เสียงทุ้มจางๆ) สุ่มระดับเสียงเล็กน้อยทุกครั้งไม่ให้จำเจ
   *  เว้นระยะขั้นต่ำ 60ms กันเสียงรัวเกินตอนพิมพ์เร็ว */
  keypress: (enabled = true, volume = 70) => {
    if (!enabled || isSfxSuppressed()) return
    const now = performance.now()
    if (now - lastKeypressAt < 60) return
    lastKeypressAt = now
    const ctx = initSynth()
    const t = ctx.currentTime
    const level = Math.min(1, Math.max(0, volume / 100))
    const pitch = 0.85 + Math.random() * 0.3

    const out = ctx.createGain()
    out.gain.value = level
    out.connect(ctx.destination)

    // ชั้นที่ 1: เสียงแตะ (noise burst สั้นมาก กรองให้เหลือย่านกลาง-สูงนุ่มๆ)
    const len = Math.floor(ctx.sampleRate * 0.03)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 2400 * pitch
    band.Q.value = 1.4
    const tapGain = ctx.createGain()
    tapGain.gain.value = 0.22
    noise.connect(band).connect(tapGain).connect(out)
    noise.start(t)

    // ชั้นที่ 2: เสียงทุ้มสั้นๆ ให้มีน้ำหนักแบบปุ่มไม้
    const body = ctx.createOscillator()
    body.type = 'sine'
    body.frequency.setValueAtTime(320 * pitch, t)
    body.frequency.exponentialRampToValueAtTime(160 * pitch, t + 0.05)
    const bodyGain = ctx.createGain()
    bodyGain.gain.setValueAtTime(0.06, t)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    body.connect(bodyGain).connect(out)
    body.start(t)
    body.stop(t + 0.07)
  },

  /** เสียงคลิกปุ่มทั่วไป */
  click: (enabled = true) => {
    if (!enabled || isSfxSuppressed()) return
    const ctx = initSynth()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  },

  /** เสียงเปิดป๊อปอัป / เลือกไพ่ */
  pop: (enabled = true) => {
    if (!enabled || isSfxSuppressed()) return
    const ctx = initSynth()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  },

  /** เสียงกดกลับ / ยกเลิก */
  cancel: (enabled = true) => {
    if (!enabled || isSfxSuppressed()) return
    const ctx = initSynth()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'square'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  },
}