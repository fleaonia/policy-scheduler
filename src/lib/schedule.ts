import type { CollisionPair, Policy, PolicyOccurrence } from '../types';
import {
  addHours,
  combineDateAndTime,
  nthWeekdayOccurrencesInRange,
  weekdayOccurrencesInRange,
} from './dates';

/** Minimum window (hours) a policy occupies even with zero deferral — patches take time to apply. */
const MIN_RUN_WINDOW_HOURS = 1;

function occurrenceDatesInRange(policy: Policy, rangeStart: Date, rangeEnd: Date): Date[] {
  const s = policy.schedule;
  const days =
    s.type === 'weekly'
      ? weekdayOccurrencesInRange(s.dayOfWeek, rangeStart, rangeEnd)
      : nthWeekdayOccurrencesInRange(s.dayOfWeek, s.nth, rangeStart, rangeEnd);
  return days.map((d) => combineDateAndTime(d, s.time));
}

function sharedTargetGroups(a: Policy, b: Policy): string[] {
  return a.targetGroups.filter((g) => b.targetGroups.includes(g));
}

function windowsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface PolicySchedule {
  occurrences: PolicyOccurrence[];
  collisions: CollisionPair[];
}

/**
 * Expands every policy into its concrete occurrences within [rangeStart, rangeEnd],
 * then finds every pair whose blackout windows overlap on a shared target group.
 * Each occurrence's `hasCollision` is true iff it appears in at least one pair.
 */
export function buildSchedule(policies: Policy[], rangeStart: Date, rangeEnd: Date): PolicySchedule {
  const bare: Omit<PolicyOccurrence, 'hasCollision'>[] = [];

  for (const policy of policies) {
    for (const start of occurrenceDatesInRange(policy, rangeStart, rangeEnd)) {
      const windowHours = Math.max(MIN_RUN_WINDOW_HOURS, policy.deferralHours);
      bare.push({ policy, start, blackoutEnd: addHours(start, windowHours) });
    }
  }

  const occurrences: PolicyOccurrence[] = bare.map((occ) => ({ ...occ, hasCollision: false }));
  const collisions: CollisionPair[] = [];

  for (let i = 0; i < occurrences.length; i++) {
    for (let j = i + 1; j < occurrences.length; j++) {
      const a = occurrences[i];
      const b = occurrences[j];
      const sharedGroups = sharedTargetGroups(a.policy, b.policy);
      if (!sharedGroups.length) continue;
      if (!windowsOverlap(a.start, a.blackoutEnd, b.start, b.blackoutEnd)) continue;

      a.hasCollision = true;
      b.hasCollision = true;
      collisions.push({ a, b, sharedGroups });
    }
  }

  collisions.sort((x, y) => x.a.start.getTime() - y.a.start.getTime());
  return { occurrences, collisions };
}

export function isDeferralActiveAt(occurrence: PolicyOccurrence, at: Date): boolean {
  return occurrence.policy.deferralHours > 0 && at >= occurrence.start && at < occurrence.blackoutEnd;
}
