import type { Policy, PolicyOccurrence } from '../types';
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

function targetGroupsOverlap(a: Policy, b: Policy): boolean {
  return a.targetGroups.some((g) => b.targetGroups.includes(g));
}

function windowsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Expands every policy into its concrete occurrences within [rangeStart, rangeEnd],
 * then flags any occurrence whose blackout window overlaps another occurrence
 * that shares at least one target group.
 */
export function buildOccurrences(
  policies: Policy[],
  rangeStart: Date,
  rangeEnd: Date,
): PolicyOccurrence[] {
  const raw: Omit<PolicyOccurrence, 'hasCollision'>[] = [];

  for (const policy of policies) {
    for (const start of occurrenceDatesInRange(policy, rangeStart, rangeEnd)) {
      const windowHours = Math.max(MIN_RUN_WINDOW_HOURS, policy.deferralHours);
      raw.push({ policy, start, blackoutEnd: addHours(start, windowHours) });
    }
  }

  return raw.map((occ, i) => {
    const hasCollision = raw.some((other, j) => {
      if (i === j) return false;
      if (!targetGroupsOverlap(occ.policy, other.policy)) return false;
      return windowsOverlap(occ.start, occ.blackoutEnd, other.start, other.blackoutEnd);
    });
    return { ...occ, hasCollision };
  });
}

export function isDeferralActiveAt(occurrence: PolicyOccurrence, at: Date): boolean {
  return occurrence.policy.deferralHours > 0 && at >= occurrence.start && at < occurrence.blackoutEnd;
}
