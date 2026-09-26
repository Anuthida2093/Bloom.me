import { describe, expect, it } from 'vitest'
import {
  BARREN_DAYS, GRASS_FRESH_DAYS, daysSinceLastHealthQuest, groundDryness, groundStage, knowledgeGrowthMultiplier,
} from '../groundFertility'
import type { QuestLogEntry } from '../../types'

const DAY = 24 * 60 * 60 * 1000

describe('groundFertility', () => {
  it('keeps grass fresh for new players and for the first few days', () => {
    expect(groundDryness(null)).toBe(0)
    expect(groundDryness(0)).toBe(0)
    expect(groundDryness(GRASS_FRESH_DAYS)).toBe(0)
  })

  it('dries out day by day and becomes barren soil after BARREN_DAYS', () => {
    const d5 = groundDryness(5), d9 = groundDryness(9)
    expect(d5).toBeGreaterThan(0)
    expect(d9).toBeGreaterThan(d5)
    expect(groundDryness(BARREN_DAYS)).toBe(1)
    expect(groundDryness(40)).toBe(1)
    expect(groundStage(0)).toBe('lush')
    expect(groundStage(groundDryness(5))).toBe('wilting')
    expect(groundStage(groundDryness(10))).toBe('dry')
    expect(groundStage(1)).toBe('barren')
  })

  it('slows tree growth on poor soil (full → half on barren soil)', () => {
    expect(knowledgeGrowthMultiplier(0)).toBe(1)
    expect(knowledgeGrowthMultiplier(1)).toBe(0.5)
    expect(knowledgeGrowthMultiplier(groundDryness(9))).toBeLessThan(1)
  })

  it('counts days since the latest completed HEALTH quest only', () => {
    const now = Date.UTC(2026, 8, 26, 12)
    const log = (category: 'HEALTH' | 'KNOWLEDGE', daysAgo: number, status: 'COMPLETED' | 'IN_PROGRESS' = 'COMPLETED') => ({
      id: `${category}-${daysAgo}`, status, userId: 'u', questId: 'q', logDate: null,
      quest: { code: 'q', category }, completedAt: new Date(now - daysAgo * DAY).toISOString(),
    }) as QuestLogEntry
    expect(daysSinceLastHealthQuest([], now)).toBeNull()
    expect(daysSinceLastHealthQuest([log('HEALTH', 8), log('HEALTH', 3), log('KNOWLEDGE', 0), log('HEALTH', 1, 'IN_PROGRESS')], now)).toBe(3)
  })
})
