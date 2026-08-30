import type { Policy } from '../types';

/**
 * Starting weekly cadence, as specified by the patching team:
 *  - Mon 9am: silent 3rd-party patching, all endpoints, no user interruption.
 *  - Patch Tuesday (2nd Tue/mo) 9am: Windows Update, 9h deferral window.
 *  - Wed: intentionally no patches — a recovery/observation day after Patch Tuesday.
 *  - Thu 9am: 3rd-party patching that requires closing the app; user is notified, no deferral (forced).
 *  - Fri 9am: Office Update, 9h deferral window.
 * All policies currently target the same "All Computers" group, so the collision
 * engine watches for anything dragged into an overlapping blackout window.
 */
export const ALL_COMPUTERS = 'All Computers';

export const seedPolicies: Policy[] = [
  {
    id: 'seed-mon-thirdparty',
    name: 'Silent 3rd-Party Patching',
    category: 'third_party',
    targetGroups: [ALL_COMPUTERS],
    schedule: { type: 'weekly', dayOfWeek: 1, time: '09:00' },
    silent: true,
    requiresAppClose: false,
    notifyUser: false,
    deferralHours: 0,
    notes: 'Runs fully silently across laptops and desktops. No deferral — nothing for the end user to act on.',
  },
  {
    id: 'seed-patch-tuesday',
    name: 'Windows Update (Patch Tuesday)',
    category: 'os_update',
    targetGroups: [ALL_COMPUTERS],
    schedule: { type: 'nth_weekday', dayOfWeek: 2, nth: 2, time: '09:00' },
    silent: false,
    requiresAppClose: false,
    notifyUser: true,
    deferralHours: 9,
    notes: 'Second Tuesday of the month. 9-hour deferral window before the deadline forces the reboot/install.',
  },
  {
    id: 'seed-thu-thirdparty-close',
    name: '3rd-Party Patching (App Close Required)',
    category: 'third_party',
    targetGroups: [ALL_COMPUTERS],
    schedule: { type: 'weekly', dayOfWeek: 4, time: '09:00' },
    silent: false,
    requiresAppClose: true,
    notifyUser: true,
    deferralHours: 0,
    notes: 'User is notified to close the target application, same as Patch Tuesday, but no deferral is offered.',
  },
  {
    id: 'seed-fri-office',
    name: 'Office Update',
    category: 'office_update',
    targetGroups: [ALL_COMPUTERS],
    schedule: { type: 'weekly', dayOfWeek: 5, time: '09:00' },
    silent: false,
    requiresAppClose: false,
    notifyUser: true,
    deferralHours: 9,
    notes: '9-hour deferral window, mirroring the Patch Tuesday cadence.',
  },
];

/** Wednesday is a deliberate no-patch day — surfaced in the UI, not modeled as a policy. */
export const NO_PATCH_WEEKDAY = 3;
