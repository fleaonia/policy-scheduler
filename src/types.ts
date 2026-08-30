export type PolicyCategory = 'third_party' | 'os_update' | 'office_update' | 'custom';

export const CATEGORY_LABEL: Record<PolicyCategory, string> = {
  third_party: '3rd-Party Patching',
  os_update: 'OS / Windows Update',
  office_update: 'Office Update',
  custom: 'Custom Policy',
};

// 0 = Sunday ... 6 = Saturday, matching JS Date#getDay()
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PolicySchedule =
  | { type: 'weekly'; dayOfWeek: Weekday; time: string }
  /** Automox "Patch Tuesday" cadence: the Nth (default 2nd) occurrence of a weekday in the month. */
  | { type: 'nth_weekday'; dayOfWeek: Weekday; nth: number; time: string };

export interface Policy {
  id: string;
  name: string;
  category: PolicyCategory;
  targetGroups: string[];
  schedule: PolicySchedule;
  /** Installs without any user-facing prompt. */
  silent: boolean;
  /** End-user must close the target application before the patch can apply. */
  requiresAppClose: boolean;
  /** Shows a notification / toast to the end user when the policy runs. */
  notifyUser: boolean;
  /** Hours a user may defer/snooze the patch before the deadline forces it. 0 = no deferral allowed. */
  deferralHours: number;
  color?: string;
  notes?: string;
}

export interface PolicyOccurrence {
  policy: Policy;
  /** Concrete run date/time for this occurrence, within the viewed range. */
  start: Date;
  /** start + max(1h, deferralHours) — the window other policies may not overlap on shared targets. */
  blackoutEnd: Date;
  hasCollision: boolean;
}
