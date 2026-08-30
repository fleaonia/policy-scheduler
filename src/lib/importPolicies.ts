import type { Policy, PolicyCategory, Weekday } from '../types';

let importCounter = 0;
function nextId(prefix: string): string {
  importCounter += 1;
  return `${prefix}-${Date.now()}-${importCounter}`;
}

/** Our own friendly JSON schema — see README "Importing policies" section. */
interface NativePolicyJson {
  name: string;
  category?: PolicyCategory;
  targetGroups: string[];
  schedule:
    | { type: 'weekly'; dayOfWeek: Weekday; time: string }
    | { type: 'nth_weekday'; dayOfWeek: Weekday; nth: number; time: string }
    | { type: 'patch_tuesday'; time: string };
  silent?: boolean;
  requiresAppClose?: boolean;
  notifyUser?: boolean;
  deferralHours?: number;
  notes?: string;
}

/**
 * A loose subset of Automox's `POST /policies` body shape
 * (https://docs.automox.com/api/policies/create-a-new-policy). Automox encodes
 * schedule_days as a 7-digit binary string, index 0 = Sunday .. index 6 = Saturday,
 * and schedule_weeks_of_month as a 5-digit binary string, index 0 = 5th week .. index 4 = 1st week.
 * We only need "2nd week" (Patch Tuesday) support for this tool.
 */
interface AutomoxPolicyJson {
  name: string;
  policy_type_name?: string;
  schedule_days?: string | number;
  schedule_weeks_of_month?: string | number;
  schedule_time?: string;
  notify_user?: boolean;
  deferral_minutes?: number;
  custom_notification_deferment_periods?: number[];
  groups?: string[] | { name: string }[];
  device_groups?: string[] | { name: string }[];
}

function isAutomoxShape(raw: unknown): raw is AutomoxPolicyJson {
  return typeof raw === 'object' && raw !== null && 'schedule_days' in raw;
}

function padBinary(value: string | number, length: number): string {
  return String(value).padStart(length, '0').slice(-length);
}

function categoryFromPolicyType(policyType?: string): PolicyCategory {
  const t = (policyType ?? '').toLowerCase();
  if (t.includes('third') || t.includes('3rd')) return 'third_party';
  if (t.includes('office')) return 'office_update';
  if (t.includes('patch') || t.includes('os') || t.includes('windows')) return 'os_update';
  return 'custom';
}

function targetGroupNames(raw: AutomoxPolicyJson): string[] {
  const list = raw.groups ?? raw.device_groups ?? [];
  const names = list.map((g) => (typeof g === 'string' ? g : g.name));
  return names.length ? names : ['All Computers'];
}

function fromAutomox(raw: AutomoxPolicyJson): Policy {
  const days = padBinary(raw.schedule_days ?? '0000000', 7);
  const dayOfWeek = days.indexOf('1') as Weekday;
  const weeks = raw.schedule_weeks_of_month != null ? padBinary(raw.schedule_weeks_of_month, 5) : null;
  // index 0 = 5th week ... index 4 = 1st week, per Automox docs.
  const weekIndex = weeks ? weeks.indexOf('1') : -1;
  const nth = weekIndex >= 0 ? 5 - weekIndex : null;

  const deferralHours = raw.deferral_minutes
    ? Math.round((raw.deferral_minutes / 60) * 10) / 10
    : raw.custom_notification_deferment_periods?.length
      ? Math.max(...raw.custom_notification_deferment_periods) / 60
      : 0;

  return {
    id: nextId('automox'),
    name: raw.name,
    category: categoryFromPolicyType(raw.policy_type_name),
    targetGroups: targetGroupNames(raw),
    schedule:
      nth !== null
        ? { type: 'nth_weekday', dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 2, nth, time: raw.schedule_time ?? '09:00' }
        : { type: 'weekly', dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 1, time: raw.schedule_time ?? '09:00' },
    silent: !raw.notify_user,
    requiresAppClose: false,
    notifyUser: Boolean(raw.notify_user),
    deferralHours,
    notes: 'Imported from Automox policy export.',
  };
}

function fromNative(raw: NativePolicyJson): Policy {
  const schedule =
    raw.schedule.type === 'patch_tuesday'
      ? { type: 'nth_weekday' as const, dayOfWeek: 2 as Weekday, nth: 2, time: raw.schedule.time }
      : raw.schedule;

  return {
    id: nextId('policy'),
    name: raw.name,
    category: raw.category ?? 'custom',
    targetGroups: raw.targetGroups?.length ? raw.targetGroups : ['All Computers'],
    schedule,
    silent: raw.silent ?? false,
    requiresAppClose: raw.requiresAppClose ?? false,
    notifyUser: raw.notifyUser ?? false,
    deferralHours: raw.deferralHours ?? 0,
    notes: raw.notes,
  };
}

export interface ImportResult {
  policies: Policy[];
  errors: string[];
}

/** Accepts either our native schema or an Automox-style policy export, single object or array. */
export function parsePolicyImport(jsonText: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { policies: [], errors: ['That is not valid JSON.'] };
  }

  const items = Array.isArray(data) ? data : [data];
  const policies: Policy[] = [];
  const errors: string[] = [];

  items.forEach((item, i) => {
    try {
      if (!item || typeof item !== 'object' || !('name' in item)) {
        throw new Error('missing "name"');
      }
      policies.push(isAutomoxShape(item) ? fromAutomox(item as AutomoxPolicyJson) : fromNative(item as NativePolicyJson));
    } catch (e) {
      errors.push(`Item ${i}: ${e instanceof Error ? e.message : 'invalid policy'}`);
    }
  });

  return { policies, errors };
}
