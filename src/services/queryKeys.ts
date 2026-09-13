/*============================================================================*\
  queryKeys.ts — [ไฟล์ใหม่] คีย์กลางของ TanStack Query
  ────────────────────────────────────────────────────────────────────────────
  รวมไว้ที่เดียวเพื่อไม่ให้เกิดปัญหาคลาสสิก: ฝั่งหนึ่งเขียน ['quests'] อีกฝั่ง
  เขียน ['quest'] แล้ว invalidate ไม่โดนกัน กลายเป็นข้อมูลค้างที่หาสาเหตุยากมาก
\*============================================================================*/

export const queryKeys = {
  me: ['me'] as const,
  tree: ['tree'] as const,
  questLogs: (dateKey?: string) => (dateKey ? (['quest-logs', dateKey] as const) : (['quest-logs'] as const)),
  moodEntries: (days?: number) => (days ? (['mood-entries', days] as const) : (['mood-entries'] as const)),
  screenings: ['screenings'] as const,
  inventory: ['inventory'] as const,
  shopItems: ['shop-items'] as const,
  leaderboard: ['leaderboard'] as const,
  posts: ['posts'] as const,
  following: ['following'] as const,
  activity: ['activity'] as const,
  socialSearch: (query: string) => ['social-search', query] as const,
} as const