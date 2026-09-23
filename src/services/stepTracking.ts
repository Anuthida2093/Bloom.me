/*============================================================================*\
  stepTracking.ts — [ไฟล์ใหม่] แหล่งข้อมูลก้าวเดินจริงสำหรับเควส "ก้าวเพื่อสุขภาพ"
  (phys-vitality-steps) แทนที่การกรอกมือ/ถ่ายรูปอย่างเดียวแบบเดิม
  ────────────────────────────────────────────────────────────────────────────
  เรียงลำดับ fallback ตามที่ระบุ:
    a) Google Fit REST API — แม่นยำสุด (ใช้ pedometer จริงของโทรศัพท์ผ่าน Google Fit ที่
       ผู้ใช้ติดตั้งไว้แล้ว) แต่ต้องมี Google Cloud Console project + OAuth client ID จริง
       ตั้งไว้ใน .env (VITE_GOOGLE_FIT_CLIENT_ID) ก่อนถึงจะใช้งานได้ — ถ้ายังไม่ตั้งค่า
       isGoogleFitConfigured() จะเป็น false และฝั่งเรียกใช้ (VitalityStepsQuest.tsx) จะข้าม
       ไปลอง (b) ต่อเองโดยอัตโนมัติ ไม่มี error โผล่ให้ผู้ใช้เห็นเพราะเรื่องนี้
    b) DeviceMotion API — นับก้าวประมาณจากเซนเซอร์เครื่องตรงๆ ใช้ได้ทันทีไม่ต้องตั้งค่า
       อะไรเพิ่ม แต่แม่นยำต่ำกว่ามาก (ดูคำเตือนที่ startDeviceMotionStepCounter ด้านล่าง)
    c) ทั้งสองทางใช้ไม่ได้เลย (ไม่ได้ตั้งค่า Google Fit + เบราว์เซอร์ไม่รองรับ/ปฏิเสธ
       DeviceMotion) → โยน error ที่มีความหมายชัดเจน ให้ฝั่งเรียกใช้ fallback ไปโหมดกรอกมือ/
       ถ่ายรูปยืนยันที่มีอยู่แล้วในระบบ (ไม่ได้ implement ที่นี่ — นั่นคือ UI เดิมของ
       VitalityStepsQuest.tsx อยู่แล้ว)

  [ทำไมไม่เรียก Google Fit อัตโนมัติตอนเปิดหน้า] OAuth popup ถูกเบราว์เซอร์บล็อกถ้าไม่ได้เปิด
  จาก user gesture ตรงๆ (คลิกปุ่ม) — ฟังก์ชัน sync*() ด้านล่างทั้งหมดจึงต้องถูกเรียกจาก
  event handler ของปุ่มเท่านั้น ไม่ใช่ใน useEffect ตอน mount ฝั่ง component ใช้แค่
  isGoogleFitConfigured()/isDeviceMotionSupported() (เช็คแบบ sync ไม่ต้องขอ permission)
  ตอน mount เพื่อ "ตัดสินใจว่าจะโชว์สถานะไหน" เท่านั้น ส่วนการเชื่อมต่อจริงรอปุ่มซิงค์เสมอ
\*============================================================================*/

/** [เพิ่มรอบนี้ — เฟส 3 Capacitor] 'health-connect'/'healthkit' มาจาก useStepTracker.ts
 *  (src/hooks/useStepTracker.ts) — query จริงผ่าน @capacitor/health-fitness เฉพาะตอนรันเป็น
 *  แอป native (Capacitor.isNativePlatform()) เท่านั้น ไม่มีทางเกิดขึ้นบนเว็บเบราว์เซอร์ปกติ */
export type StepDataSource = 'google-fit' | 'device-motion' | 'manual' | 'health-connect' | 'healthkit'

export interface StepReading {
  steps: number
  source: StepDataSource
}

// ═══════════════════════════════════════════════════════════════════════
// (a) Google Fit REST API
// ═══════════════════════════════════════════════════════════════════════

const GOOGLE_FIT_CLIENT_ID = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID as string | undefined
const GOOGLE_FIT_SCOPE = 'https://www.googleapis.com/auth/fitness.activity.read'
/** เก็บ token ไว้แค่ระดับ session (ปิดแท็บแล้วหาย) — ตั้งใจไม่ persist ยาวลง localStorage เพราะ
 * เป็น access token ที่มีอายุสั้นอยู่แล้ว (~1 ชม.) ต่ออายุด้วยการขอ auth ใหม่ง่ายกว่าเขียนระบบ
 * refresh token (ซึ่ง implicit flow แบบ SPA ล้วนที่ไม่มี backend ก็ไม่รองรับ refresh token ด้วย) */
const GOOGLE_FIT_TOKEN_STORAGE_KEY = 'bloom:google-fit-token'

interface GoogleFitToken {
  accessToken: string
  /** epoch ms */
  expiresAt: number
}

function loadStoredGoogleFitToken(): GoogleFitToken | null {
  try {
    const raw = window.sessionStorage.getItem(GOOGLE_FIT_TOKEN_STORAGE_KEY)
    if (!raw) return null
    const token = JSON.parse(raw) as GoogleFitToken
    if (!token.accessToken || token.expiresAt <= Date.now()) return null
    return token
  } catch {
    return null
  }
}

function storeGoogleFitToken(token: GoogleFitToken) {
  try { window.sessionStorage.setItem(GOOGLE_FIT_TOKEN_STORAGE_KEY, JSON.stringify(token)) } catch { /* noop */ }
}

/** true = มี Google Cloud Console OAuth client ID ตั้งค่าไว้ใน .env แล้ว (VITE_GOOGLE_FIT_CLIENT_ID)
 * — แค่ "พร้อมลอง" เท่านั้น ไม่ได้แปลว่าผู้ใช้จะกด allow หรือ auth จะสำเร็จแน่นอน */
export function isGoogleFitConfigured(): boolean {
  return typeof GOOGLE_FIT_CLIENT_ID === 'string' && GOOGLE_FIT_CLIENT_ID.trim().length > 0
}

/**
 * เปิด Google OAuth 2.0 popup แบบ "implicit flow" (response_type=token) — เลือกแบบนี้เพราะ
 * เว็บแอปนี้เป็น SPA ล้วนไม่มี backend ของตัวเองที่จะแลก authorization code เป็น token ได้
 * (ต่างจาก authorization-code flow ที่ต้องมี backend เก็บ client secret) ข้อแลก: ไม่มี
 * refresh token ผู้ใช้ต้อง re-auth ใหม่ทุกครั้งที่ token หมดอายุ (~1 ชม.) — ยอมรับได้สำหรับ
 * เควสที่เรียกซิงค์เป็นครั้งคราว ไม่ใช่ระบบที่ต้องอ่านข้อมูลต่อเนื่องตลอดเวลา
 *
 * ต้องเรียกจาก user gesture ตรงๆ (onClick ปุ่ม) ไม่งั้นเบราว์เซอร์บล็อก popup
 */
function requestGoogleFitAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_FIT_CLIENT_ID) {
      reject(new Error('GOOGLE_FIT_NOT_CONFIGURED'))
      return
    }
    const redirectUri = window.location.origin + window.location.pathname
    const state = Math.random().toString(36).slice(2)
    const params = new URLSearchParams({
      client_id: GOOGLE_FIT_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: GOOGLE_FIT_SCOPE,
      include_granted_scopes: 'true',
      state,
      prompt: 'consent',
    })
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    const popup = window.open(authUrl, 'google-fit-oauth', 'width=480,height=640')
    if (!popup) {
      reject(new Error('POPUP_BLOCKED'))
      return
    }

    let settled = false
    // [ทำไม poll แทน postMessage] Google OAuth redirect กลับมาที่ redirectUri (origin เดียวกับ
    // แอปนี้) แต่ตัวหน้า redirect นั้นเป็นแค่ URL เปล่าๆ ไม่มีสคริปต์ postMessage กลับมาให้ —
    // วิธีที่ใช้ได้จริงโดยไม่ต้องเพิ่มหน้า callback แยกต่างหากคือ poll ดู popup.location.href
    // ซึ่งจะ throw (cross-origin) ตลอดเวลาที่ยังอยู่หน้า accounts.google.com จนกว่าจะ redirect
    // กลับมา origin เดียวกับแอปจริงๆ ถึงจะอ่านค่าได้โดยไม่ throw
    const poll = window.setInterval(() => {
      try {
        if (popup.closed) {
          window.clearInterval(poll)
          if (!settled) reject(new Error('POPUP_CLOSED'))
          return
        }
        const popupUrl = popup.location.href
        if (!popupUrl.startsWith(redirectUri)) return
        const hash = new URL(popupUrl).hash.replace(/^#/, '')
        const hashParams = new URLSearchParams(hash)
        const returnedState = hashParams.get('state')
        const accessToken = hashParams.get('access_token')
        const expiresIn = Number(hashParams.get('expires_in') ?? '3600')
        window.clearInterval(poll)
        settled = true
        popup.close()
        if (returnedState !== state || !accessToken) {
          reject(new Error('OAUTH_STATE_MISMATCH'))
          return
        }
        storeGoogleFitToken({ accessToken, expiresAt: Date.now() + expiresIn * 1000 })
        resolve(accessToken)
      } catch {
        // ยังอยู่หน้า accounts.google.com (cross-origin) — รอ poll รอบถัดไป
      }
    }, 400)
  })
}

/** ดึงจำนวนก้าว "วันนี้" จาก Google Fit REST API ผ่าน aggregate dataset endpoint —
 * ดูเอกสาร: https://developers.google.com/fit/rest/v1/reference/users/dataset/aggregate */
async function fetchTodayStepsFromGoogleFit(accessToken: string): Promise<number> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000

  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: 'com.google.step_count.delta',
        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
      }],
      bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
      startTimeMillis: startOfDay,
      endTimeMillis: endOfDay,
    }),
  })

  if (!res.ok) {
    throw new Error(`GOOGLE_FIT_HTTP_${res.status}`)
  }

  const data = (await res.json()) as {
    bucket?: { dataset?: { point?: { value?: { intVal?: number }[] }[] }[] }[]
  }
  let total = 0
  for (const bucket of data.bucket ?? []) {
    for (const dataset of bucket.dataset ?? []) {
      for (const point of dataset.point ?? []) {
        for (const value of point.value ?? []) {
          total += value.intVal ?? 0
        }
      }
    }
  }
  return total
}

/**
 * เชื่อม Google Fit แบบครบวงจร — ใช้ access token เดิมที่ยังไม่หมดอายุถ้ามี ไม่งั้นเปิด OAuth
 * popup ใหม่ (ต้องเรียกจาก user gesture ตรงๆ) โยน GOOGLE_FIT_NOT_CONFIGURED ถ้ายังไม่ได้ตั้งค่า
 * OAuth client ID เลย ให้ฝั่งเรียกใช้ fallback ไป DeviceMotion ต่อเองโดยไม่ต้อง try/catch แยก
 */
export async function syncStepsFromGoogleFit(): Promise<StepReading> {
  if (!isGoogleFitConfigured()) {
    throw new Error('GOOGLE_FIT_NOT_CONFIGURED')
  }
  const stored = loadStoredGoogleFitToken()
  const accessToken = stored?.accessToken ?? await requestGoogleFitAccessToken()
  const steps = await fetchTodayStepsFromGoogleFit(accessToken)
  return { steps, source: 'google-fit' }
}

// ═══════════════════════════════════════════════════════════════════════
// (b) DeviceMotion API — นับก้าวประมาณจากเซนเซอร์เครื่องตรงๆ
// ═══════════════════════════════════════════════════════════════════════

/** true = เบราว์เซอร์มี DeviceMotionEvent ให้ใช้ในทางทฤษฎี (ไม่รับประกันว่าอุปกรณ์มีเซนเซอร์จริง
 * หรือผู้ใช้จะกดอนุญาต permission — เดสก์ท็อป/บางเบราว์เซอร์ไม่มี accelerometer เลย ค่านี้เป็น
 * true ได้แต่จะไม่มี event ยิงมาเลยตอนใช้งานจริง) */
export function isDeviceMotionSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window
}

interface DeviceMotionEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/** iOS 13+ ต้องขอ permission ก่อนอ่านค่า DeviceMotion ได้จริง (ต้องเรียกจาก user gesture
 * ตรงๆ เหมือน OAuth popup) เบราว์เซอร์อื่น (Android Chrome ฯลฯ) ไม่มี requestPermission เลย
 * ถือว่าอนุญาตอยู่แล้วโดยปริยาย */
async function requestDeviceMotionPermission(): Promise<boolean> {
  const DME = window.DeviceMotionEvent as unknown as DeviceMotionEventWithPermission
  if (typeof DME.requestPermission !== 'function') return true
  try {
    const result = await DME.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

/** [ประมาณการ] threshold ของ magnitude ความเร่งรวม (หน่วย g, 1g = แรงโน้มถ่วงปกติ) ที่ถือว่า
 * เกิด "ก้าว" หนึ่งครั้ง — ตัวเลขนี้ปรับจูนคร่าวๆ จากรูปแบบการเดินทั่วไป ไม่ได้ calibrate ต่อ
 * อุปกรณ์/ท่าถือแต่ละแบบจริงจัง */
const STEP_DETECTION_THRESHOLD_G = 1.2
/** กันนับซ้ำจากการสั่นสะเทือนถี่ๆ ในจังหวะก้าวเดียวกัน (เดินเร็วสุดจริงไม่เกิน ~4 ก้าว/วินาที) */
const STEP_MIN_INTERVAL_MS = 250

/**
 * นับก้าวจาก DeviceMotion ด้วย "peak detection" อย่างง่ายบนค่า magnitude ของความเร่งรวม —
 * เรียก onStepCountChange ทุกครั้งที่นับก้าวใหม่ได้ คืนฟังก์ชันสำหรับหยุดฟัง
 *
 * [ข้อจำกัดที่ต้องแจ้งชัดเจน] นี่คือการประมาณค่าคร่าวๆ เท่านั้น ไม่ใช่ pedometer ฮาร์ดแวร์จริง
 * (ซึ่งมักใช้ sensor fusion ร่วมกับ gyroscope/magnetometer และ machine-learning model กรอง
 * รูปแบบการเดินจริงกับการสั่น/เขย่าทั่วไป) วิธีง่ายๆ นี้:
 *   - นับเกินจริงได้ถ้าเขย่ามือถือ ขึ้นรถที่สั่นสะเทือนแรง หรือวางในกระเป๋าหลวมๆ ที่กระแทกไปมา
 *   - นับขาดได้ถ้าถือเครื่องนิ่งมาก (เช่น ในกระเป๋าที่แน่นจนซับแรงสั่น) หรือเดินช้ามากจน
 *     magnitude ไม่ข้าม threshold
 *   - ใช้ได้เฉพาะ "ระหว่างที่หน้าเว็บนี้เปิดอยู่และกำลังฟังอยู่จริง" เท่านั้น ต่างจาก Google Fit
 *     ที่นับสะสมทั้งวันจากพื้นหลังของระบบปฏิบัติการ
 * เหมาะสำหรับใช้ "ประมาณคร่าวๆ" ในเควสนี้เท่านั้น ไม่ควรใช้แทนเครื่องนับก้าวจริงถ้าต้องการ
 * ความแม่นยำสูง
 */
export function startDeviceMotionStepCounter(onStepCountChange: (steps: number) => void): () => void {
  let stepCount = 0
  let lastStepAt = 0
  let wasAboveThreshold = false

  const handleMotion = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return
    const magnitudeG = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2) / 9.81
    const now = Date.now()

    if (magnitudeG > STEP_DETECTION_THRESHOLD_G) {
      if (!wasAboveThreshold && now - lastStepAt > STEP_MIN_INTERVAL_MS) {
        stepCount += 1
        lastStepAt = now
        onStepCountChange(stepCount)
      }
      wasAboveThreshold = true
    } else {
      wasAboveThreshold = false
    }
  }

  window.addEventListener('devicemotion', handleMotion)
  return () => window.removeEventListener('devicemotion', handleMotion)
}

/**
 * เริ่มนับก้าวจาก DeviceMotion แบบครบวงจร (ขอ permission ก่อนถ้าจำเป็น) — โยน error ที่มี
 * ความหมายชัดเจนถ้าเบราว์เซอร์ไม่รองรับเลย/ผู้ใช้ปฏิเสธ permission ให้ฝั่งเรียกใช้ fallback
 * ไปโหมดกรอกมือ/ถ่ายรูปยืนยันต่อ ต้องเรียกจาก user gesture ตรงๆ เพราะ requestPermission()
 * (iOS) ต้องมาจาก gesture เหมือนกัน
 */
export async function startDeviceMotionTracking(onStepCountChange: (steps: number) => void): Promise<() => void> {
  if (!isDeviceMotionSupported()) {
    throw new Error('DEVICE_MOTION_NOT_SUPPORTED')
  }
  const granted = await requestDeviceMotionPermission()
  if (!granted) {
    throw new Error('DEVICE_MOTION_PERMISSION_DENIED')
  }
  return startDeviceMotionStepCounter(onStepCountChange)
}

// ═══════════════════════════════════════════════════════════════════════
// ข้อความ error ที่แปลเป็นภาษาไทยให้ผู้ใช้เห็น — รวมไว้ที่นี่ที่เดียวกันข้อความไม่ตรงกัน
// ระหว่างจุดที่เรียกใช้ต่างกัน
// ═══════════════════════════════════════════════════════════════════════

export function describeStepSyncError(err: unknown): string {
  const code = err instanceof Error ? err.message : ''
  if (code === 'GOOGLE_FIT_NOT_CONFIGURED') {
    return 'ยังไม่ได้ตั้งค่า Google Fit (ต้องมี OAuth client ID) — สลับไปกรอกจำนวนก้าวเองแทน'
  }
  if (code === 'POPUP_BLOCKED') {
    return 'เบราว์เซอร์บล็อกป๊อปอัพเชื่อมต่อ Google Fit — อนุญาตป๊อปอัพสำหรับเว็บนี้แล้วลองใหม่'
  }
  if (code === 'POPUP_CLOSED') {
    return 'หน้าต่างเชื่อมต่อ Google Fit ถูกปิดก่อนอนุญาตสิทธิ์ — ลองกดซิงค์อีกครั้ง'
  }
  if (code === 'OAUTH_STATE_MISMATCH') {
    return 'เชื่อมต่อ Google Fit ไม่สำเร็จ — ลองกดซิงค์อีกครั้ง'
  }
  if (code === 'DEVICE_MOTION_NOT_SUPPORTED') {
    return 'อุปกรณ์นี้ไม่รองรับการนับก้าวจากเซ็นเซอร์ — กรอกจำนวนก้าวเองแทน'
  }
  if (code === 'DEVICE_MOTION_PERMISSION_DENIED') {
    return 'ไม่ได้รับอนุญาตให้ใช้เซ็นเซอร์เครื่อง — กรอกจำนวนก้าวเองแทน'
  }
  if (code.startsWith('GOOGLE_FIT_HTTP_')) {
    return 'ดึงข้อมูลจาก Google Fit ไม่สำเร็จ — สลับไปกรอกจำนวนก้าวเองแทน'
  }
  // [เพิ่มรอบนี้ — เฟส 3 Capacitor] error code จาก useStepTracker.ts (native health API)
  if (code === 'NATIVE_HEALTH_PERMISSION_DENIED') {
    return 'ไม่ได้รับอนุญาตให้อ่านข้อมูลก้าวเดินจาก Health Connect/HealthKit — สลับไปแหล่งอื่นแทน'
  }
  if (code === 'NATIVE_HEALTH_QUERY_FAILED' || code === 'NATIVE_HEALTH_UNPARSEABLE_RESULT') {
    return 'ดึงข้อมูลก้าวเดินจาก Health Connect/HealthKit ไม่สำเร็จ — สลับไปแหล่งอื่นแทน'
  }
  return 'เชื่อมต่อแหล่งข้อมูลก้าวเดินไม่สำเร็จ — กรอกจำนวนก้าวเองแทน'
}
