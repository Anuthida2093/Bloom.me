export interface MapDef {
  id: string
  order: number
  name: string
  artAsset: string
  /** จุดบนเส้นทางตามลำดับ — via: true = จุดดัดความโค้งให้ตรงถนน (ไม่แสดงเป็นจุดหมายเลขบนแผนที่) */
  waypoints: { x: number; y: number; via?: boolean }[]
  entryPct: { x: number; y: number }
  exitPct: { x: number; y: number }
}

export type JourneyStatus = 'IN_PROGRESS' | 'COMPLETED_EARLY' | 'COMPLETED_ON_TIME' | 'COMPLETED_LATE' | 'TIME_UP'

export interface JourneyRecord {
  id: string
  userId: string
  destinationMapId: string // แผนที่ที่ผู้เล่นเลือกสำหรับวันนี้
  routeMapIds: string[]    // ทริปรายวัน = [destinationMapId] (ทริปเก่าก่อนเปลี่ยนเป็นรายวันอาจมี 3 แผนที่)
  progressOnCurrentMapSteps: number // ก้าวรวมทั้งหมดในทริปนี้
  startedAt: string
  deadlineAt: string // สิ้นวันที่เริ่มทริป
  status: JourneyStatus
}

export type WeatherType = 'sunny' | 'rain' | 'clear'