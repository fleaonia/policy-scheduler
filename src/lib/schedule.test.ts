import { describe, expect, it } from 'vitest';
import { buildSchedule } from './schedule';
import { nthWeekdayOccurrencesInRange } from './dates';
import { seedPolicies } from '../data/seedPolicies';
import type { Policy } from '../types';

const RANGE_START = new Date('2026-08-30T00:00:00'); // a Sunday
const RANGE_END = new Date('2026-09-05T23:59:59'); // following Saturday

describe('nthWeekdayOccurrencesInRange (Patch Tuesday)', () => {
  it('finds the 2nd Tuesday of the month', () => {
    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2026-09-30T23:59:59');
    const result = nthWeekdayOccurrencesInRange(2, 2, start, end);
    expect(result).toHaveLength(1);
    expect(result[0].getDate()).toBe(8); // Sept 2026: Tuesdays are 1, 8, 15, 22, 29
  });
});

describe('buildSchedule', () => {
  it('expands the seed schedule with no collisions (different days, same target group)', () => {
    const { occurrences, collisions } = buildSchedule(seedPolicies, RANGE_START, RANGE_END);
    expect(occurrences.length).toBeGreaterThan(0);
    expect(occurrences.every((o) => !o.hasCollision)).toBe(true);
    expect(collisions).toHaveLength(0);
  });

  it('flags a collision when two policies with an overlapping target group land in the same window', () => {
    const policies: Policy[] = [
      {
        id: 'a',
        name: 'Windows Update',
        category: 'os_update',
        targetGroups: ['All Computers'],
        schedule: { type: 'weekly', dayOfWeek: 2, time: '09:00' },
        silent: false,
        requiresAppClose: false,
        notifyUser: true,
        deferralHours: 9,
      },
      {
        id: 'b',
        name: '3rd-Party (moved onto Patch Tuesday)',
        category: 'third_party',
        targetGroups: ['All Computers'],
        schedule: { type: 'weekly', dayOfWeek: 2, time: '11:00' },
        silent: false,
        requiresAppClose: true,
        notifyUser: true,
        deferralHours: 0,
      },
    ];

    const { occurrences, collisions } = buildSchedule(policies, RANGE_START, RANGE_END);
    expect(occurrences.every((o) => o.hasCollision)).toBe(true);
    expect(collisions).toHaveLength(1);
    expect(collisions[0].sharedGroups).toEqual(['All Computers']);
    expect([collisions[0].a.policy.id, collisions[0].b.policy.id].sort()).toEqual(['a', 'b']);
  });

  it('does not flag a collision when target groups do not overlap', () => {
    const policies: Policy[] = [
      {
        id: 'a',
        name: 'Windows Update - Servers',
        category: 'os_update',
        targetGroups: ['Servers'],
        schedule: { type: 'weekly', dayOfWeek: 2, time: '09:00' },
        silent: false,
        requiresAppClose: false,
        notifyUser: true,
        deferralHours: 9,
      },
      {
        id: 'b',
        name: '3rd-Party - Laptops',
        category: 'third_party',
        targetGroups: ['Laptops'],
        schedule: { type: 'weekly', dayOfWeek: 2, time: '11:00' },
        silent: false,
        requiresAppClose: true,
        notifyUser: true,
        deferralHours: 0,
      },
    ];

    const { occurrences, collisions } = buildSchedule(policies, RANGE_START, RANGE_END);
    expect(occurrences.every((o) => !o.hasCollision)).toBe(true);
    expect(collisions).toHaveLength(0);
  });
});
