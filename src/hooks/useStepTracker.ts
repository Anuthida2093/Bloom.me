import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { HealthFitness } from '@capacitor/health-fitness'
import type { StepReading } from '../services/stepTracking'
import { getActiveJourney, addSteps } from '../services/api/journey.api'

/*============================================================================*\
  useStepTracker.ts — [ไฟล์ใหม่ — เฟส 3] อ่านก้าวเดินจริงจาก Health Connect (Android) /
  Apple HealthKit (iOS) ผ่าน @capacitor/health-fitness — ใช้ได้เฉพาะตอนรันเป็นแอป native
  ผ่าน Capacitor เท่านั้น (Capacitor.isNativePlatform() === false เสมอตอนรันบนเว็บเบราว์เซอร์
  ปกติ ณ localhost/production เว็บ — ฟังก์ชันในไฟล์นี้จะไม่ถูกเรียกเลยในกรณีนั้น ปล่อยให้ฝั่งที่
  เรียกใช้ (VitalityStepsQuest.tsx) ตกไปที่ DeviceMotion/กรอกมือเดิมตามลำดับ fallback)
  ────────────────────────────────────────────────────────────────────────────
  [สำคัญ — อ่านจาก .d.ts จริงของแพ็กเกจที่ลงไปจริง ไม่ใช่เดา] API ของปลั๊กอินนี้ไม่มี
  requestAuthorization({ read: [...] }) หรือ aggregate function ตรงๆ แบบที่มักเดากันแบบง่ายๆ
  — ของจริงคือ requestHealthPermissions() รับ object ที่ทุกฟิลด์เป็น "JSON-encoded string"
  ซ้อนอีกชั้น (ดู node_modules/@capacitor/health-fitness/dist/esm/definitions.d.ts และ
  README.md หัวข้อ "Requesting permissions"/"Querying data" ของแพ็กเกจที่ลงจริง) และ getData()
  เป็น "advanced query" ทั่วไปที่ต้องประกอบ query blob เอง ไม่มี endpoint เฉพาะสำหรับ "ก้าววันนี้"

  [ข้อจำกัดที่ต้องรู้ก่อนใช้จริง] รูปแบบ JSON ที่แท้จริงภายใน `results` (ผลลัพธ์ของ getData())
  ไม่ได้ระบุไว้ใน .d.ts/README ของแพ็กเกจเลยเกินกว่าคำว่า "raw result blocks" — โค้ดที่มา
  ประมวลผลจริงอยู่ฝั่ง native (Kotlin/Swift) ผ่าน dependency ที่ compile แล้ว ไม่มี source ให้
  อ่านจากที่นี่ parseStepsFromRawResult() ด้านล่างจึงเป็นการ parse แบบ defensive (ลองหลายชื่อ
  ฟิลด์ที่เป็นไปได้) ต้อง**ทดสอบกับอุปกรณ์จริง**ก่อนเชื่อว่าพาร์สถูก ถ้า parse ไม่ได้จะถือว่า
  "ไม่พร้อมใช้งาน" (คืน null) ไม่ throw ให้แอป crash
\*============================================================================*/

export type NativeHealthPlatform = 'health-connect' | 'healthkit'

interface RawResultBlock {
  Value?: number
  value?: number
  StepCount?: number
  stepCount?: number
  Steps?: number
  steps?: number
  Count?: number
  count?: number
}

/** [ดูคำเตือนหัวไฟล์] พยายามรวมยอดก้าวจาก "raw result blocks" ที่ shape จริงไม่ได้ระบุไว้ที่ไหน
 *  เลย — ลองอ่านหลายชื่อฟิลด์ที่เป็นไปได้ตามชื่อ field อื่นๆ ที่ plugin นี้ใช้จริง (PascalCase
 *  เป็นหลักตามตัวอย่างใน README เช่น Variable/StartDate/EndDate) พร้อม fallback เป็น
 *  camelCase เผื่อ native ฝั่งใดฝั่งหนึ่ง serialize ต่างออกไป — คืน null ถ้าพาร์สไม่ได้เลย
 *  (ไม่เดาว่าเป็น 0 ก้าว เพราะ 0 กับ "อ่านไม่ได้" มีความหมายต่างกันมาก) */
function parseStepsFromRawResult(resultsJson: string | undefined): number | null {
  if (!resultsJson) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(resultsJson)
  } catch {
    return null
  }

  const blocks: RawResultBlock[] = Array.isArray(parsed) ? parsed : [parsed as RawResultBlock]
  let total = 0
  let foundAny = false

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const value = block.Value ?? block.value ?? block.StepCount ?? block.stepCount
      ?? block.Steps ?? block.steps ?? block.Count ?? block.count
    if (typeof value === 'number' && Number.isFinite(value)) {
      total += value
      foundAny = true
    }
  }

  return foundAny ? Math.round(total) : null
}

/** ช่วง "วันนี้" แบบไม่มีมิลลิวินาที — native date parser ของปลั๊กอินนี้รับเฉพาะรูปแบบ
 *  "yyyy-MM-dd'T'HH:mm:ssZ" เท่านั้น (ระบุไว้ใน README ของแพ็กเกจ) toISOString() ปกติมี
 *  ส่วนมิลลิวินาทีต่อท้ายต้องตัดออกก่อน */
function isoDateNoMillis(d: Date): string {
  return d.toISOString().split('.')[0] + 'Z'
}

function todayRangeIso(): { start: string; end: string } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  return { start: isoDateNoMillis(startOfDay), end: isoDateNoMillis(tomorrow) }
}

/** ขอ permission แค่ตัวแปร STEPS อย่างเดียวผ่าน customPermissions (แคบสุดเท่าที่ทำได้ ไม่ขอ
 *  fitnessVariables/allVariables ทั้งกลุ่มซึ่งจะพ่วง CALORIES_BURNED/DISTANCE/WALKING_SPEED
 *  มาโดยไม่จำเป็น) ทุกฟิลด์อื่นต้องส่งไปด้วยเสมอตาม type จริง (RequestHealthPermissionsOptions
 *  ไม่มีฟิลด์ optional เลยสักตัว) จึงตั้ง IsActive: false ให้หมด */
function buildStepsOnlyPermissionRequest() {
  const inactive = JSON.stringify({ IsActive: false, AccessType: 'READ' })
  return {
    customPermissions: JSON.stringify([{ Variable: 'STEPS', AccessType: 'READ' }]),
    allVariables: inactive,
    fitnessVariables: inactive,
    healthVariables: inactive,
    profileVariables: inactive,
    workoutVariables: inactive,
  }
}

export interface UseStepTrackerResult {
  /** true = กำลังรันเป็นแอป native ผ่าน Capacitor (iOS/Android) — เช็คแบบ static ครั้งเดียว
   *  ไม่ได้แปลว่า permission ผ่านแล้ว แค่บอกว่า "มีให้ลองใช้" */
  isNativeHealthAvailable: boolean
  /** 'health-connect' บน Android / 'healthkit' บน iOS / null ถ้าไม่ใช่ native platform —
   *  ให้ฝั่งเรียกใช้ (VitalityStepsQuest.tsx) ใช้ตัดสินใจ dataSource เริ่มต้นโดยไม่ต้อง import
   *  Capacitor เองซ้ำ */
  nativePlatform: NativeHealthPlatform | null
  isRequesting: boolean
  /** ขอ permission + query ก้าววันนี้ในครั้งเดียว (ต้องเรียกจาก user gesture ตรงๆ เหมือน
   *  Google Fit OAuth/DeviceMotion permission — ดู stepTracking.ts) คืน null = ไม่พร้อมใช้งาน
   *  (ไม่ใช่ native platform / permission ถูกปฏิเสธ / query ล้มเหลว / parse ผลลัพธ์ไม่ได้) —
   *  ไม่ throw ไม่ว่ากรณีไหน ให้ฝั่งเรียกใช้ (VitalityStepsQuest.tsx) ตกไป fallback ถัดไปเองแทน */
  requestNativeSteps: () => Promise<StepReading | null>
}

export function useStepTracker(): UseStepTrackerResult {
  // [ตามที่ระบุ] เช็ค Capacitor.isNativePlatform() ก่อนเสมอ — ค่าคงที่ตลอดอายุแอป (ไม่เปลี่ยน
  // ระหว่างรัน) จึงใช้ lazy initializer ของ useState อ่านครั้งเดียวตอน mount แทนการเช็คซ้ำทุก
  // ครั้งที่ render (ทำตาม pattern เดียวกับ useMediaQuery.ts — ห้ามอ่านค่า ref.current ระหว่าง
  // render ตาม eslint react-hooks/refs ของโปรเจกต์นี้)
  const [isNative] = useState(() => Capacitor.isNativePlatform())
  const [nativePlatform] = useState<NativeHealthPlatform | null>(() =>
    Capacitor.isNativePlatform() ? (Capacitor.getPlatform() === 'ios' ? 'healthkit' : 'health-connect') : null,
  )
  const [isRequesting, setIsRequesting] = useState(false)

  const requestNativeSteps = useCallback(async (): Promise<StepReading | null> => {
    if (!isNative) return null

    setIsRequesting(true)
    try {
      await HealthFitness.requestHealthPermissions(buildStepsOnlyPermissionRequest())

      const { start, end } = todayRangeIso()
      const { results } = await HealthFitness.getData({
        parameters: JSON.stringify({
          Variable: 'STEPS',
          StartDate: start,
          EndDate: end,
          TimeUnit: 'DAY',
          OperationType: 'SUM',
          TimeUnitLength: 1,
          AdvancedQueryReturnType: 'ALL_DATA',
          AdvancedQueryResultType: 'RAW_DATA',
        }),
      })

      const steps = parseStepsFromRawResult(results)
      if (steps === null || !nativePlatform) return null

      return { steps, source: nativePlatform }
    } catch {
      // [ตามที่ระบุ] permission ถูกปฏิเสธ/ query ล้มเหลว → ไม่ throw ทำแอป crash คืน null
      // เฉยๆ ให้ฝั่งเรียกใช้ตัดสินใจ fallback เอง (ดู describeStepSyncError ใน stepTracking.ts
      // สำหรับข้อความอธิบายให้ผู้ใช้เห็นตอนเรียกจาก VitalityStepsQuest.tsx)
      return null
    } finally {
      setIsRequesting(false)
    }
  }, [isNative, nativePlatform])

  /** [ตามที่ระบุ — เฟส 3 ข้อ 5] sync ก้าวสะสมเข้า journey ที่กำลังเดินอยู่ "ตอนแอปเปิดขึ้นมา"
   *  เท่านั้น (ครั้งเดียวตอน mount ผ่าน dependency array ว่าง) ไม่ sync ต่อเนื่องตลอดเวลาเพื่อ
   *  ประหยัดแบต — [ข้อจำกัดเฟสนี้] hook นี้ยังไม่ได้ mount อยู่ที่ root ของแอป (ยังไม่มีหน้าจอ
   *  Journey ถาวรจนกว่าจะถึงเฟส 6) จึง "เปิดแอปขึ้นมา" ในทางปฏิบัติตอนนี้หมายถึง "เปิดเควสก้าว
   *  เพื่อสุขภาพขึ้นมา" (จุดเดียวที่เรียก useStepTracker() อยู่ตอนนี้) — ต้องย้าย hook นี้ไป mount
   *  ที่ App.tsx/AppContext ตอนเฟส 6 มีหน้าจอ Journey จริงถ้าต้องการ sync ตั้งแต่เปิดแอปจริงๆ */
  useEffect(() => {
    if (!isNative) return
    let cancelled = false
    ;(async () => {
      const reading = await requestNativeSteps()
      if (cancelled || !reading) return
      const activeJourney = await getActiveJourney()
      if (cancelled || !activeJourney) return
      await addSteps(activeJourney.id, reading.steps)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งใจรันครั้งเดียวตอน mount เท่านั้น
  }, [])

  return { isNativeHealthAvailable: isNative, nativePlatform, isRequesting, requestNativeSteps }
}
