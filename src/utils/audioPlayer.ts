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
export function playSfx(key: SfxKey, options: PlaySfxOptions = {}): void {
  if (options.enabled === false) return
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
      } else if (key === 'KEYPRESS') {
        uiSounds.keypress(options.enabled)
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
export function startLoopingSfx(key: SfxKey, options: PlaySfxOptions = {}): void {
  if (options.enabled === false) return
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ระบบที่ 2: สังเคราะห์เสียง UI (Web Audio API) ทำงานได้ทันทีโดยไม่ต้องรอไฟล์
// ─────────────────────────────────────────────────────────────────────────────

const AudioCtx =
  window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
let synthCtx: AudioContext | null = null

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
  /** เสียงพิมพ์ข้อความ Typewriter */
  keypress: (enabled = true) => {
    if (!enabled) return
    const ctx = initSynth()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime)

    gain.gain.setValueAtTime(0.03, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  },

  /** เสียงคลิกปุ่มทั่วไป */
  click: (enabled = true) => {
    if (!enabled) return
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
    if (!enabled) return
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
    if (!enabled) return
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