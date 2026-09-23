export interface MapDef {
  id: string
  order: number
  name: string
  artAsset: string
  waypoints: { x: number; y: number }[]
  entryPct: { x: number; y: number }
  exitPct: { x: number; y: number }
}

export type JourneyStatus = 'IN_PROGRESS' | 'COMPLETED_EARLY' | 'COMPLETED_ON_TIME' | 'COMPLETED_LATE' | 'TIME_UP'

export interface JourneyRecord {
  id: string
  userId: string
  destinationMapId: string // เป้าหมายที่ผู้เล่นเลือก (แผนที่ใบที่ 3)
  routeMapIds: string[]    // เก็บเส้นทาง 3 แผนที่ [ด่าน1, ด่าน2, ด่าน3]
  progressOnCurrentMapSteps: number // ก้าวรวมทั้งหมดในทริปนี้
  startedAt: string
  deadlineAt: string // เวลาหมดเขต 3 วัน
  status: JourneyStatus
}

export type WeatherType = 'sunny' | 'rain' | 'clear'