import { describe, expect, it } from 'vitest'
import { LEARNING_GIFT_LOOT, rollLearningGift } from '../learningGift'
import { findQuestByCode } from '../questCatalog'

describe('rollLearningGift', () => {
  it('never gives a card before the card system is unlocked', () => {
    for (let i = 0; i < 50; i++) {
      expect(rollLearningGift(false, () => i / 50).kind).not.toBe('EXCHANGE_CARD')
    }
  })

  it('can give a card once unlocked (lowest roll hits the first slot)', () => {
    expect(rollLearningGift(true, () => 0)).toEqual({ kind: 'EXCHANGE_CARD', amount: 1 })
  })

  it('keeps coin and water amounts inside the table range', () => {
    for (let i = 0; i < 100; i++) {
      const g = rollLearningGift(true, () => (i % 100) / 100)
      const slot = LEARNING_GIFT_LOOT.find((l) => l.kind === g.kind)!
      if (g.kind !== 'EXCHANGE_CARD') {
        expect(g.amount).toBeGreaterThanOrEqual(slot.min!)
        expect(g.amount).toBeLessThanOrEqual(slot.max!)
      }
    }
  })
})

describe('Focus Mode / side quest catalog rules', () => {
  it('Focus Mode is one round per completion, up to 3 a day', () => {
    expect(findQuestByCode('know-deep-root')?.maxPerDay).toBe(3)
  })

  it('voice quest and Guardian of Rest unlock from Focus Mode', () => {
    expect(findQuestByCode('know-brain-dump')?.requiresQuestIds).toContain('know-deep-root')
    expect(findQuestByCode('know-guardian-of-rest')?.requiresQuestIds).toContain('know-deep-root')
  })

  it('Ten-Year Forest reward is claimable once per day', () => {
    expect(findQuestByCode('know-ten-year-forest')?.isDaily).toBe(true)
  })
})
