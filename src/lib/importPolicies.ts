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
 * A loose subset of Automox's policy shape, covering both the `POST /policies`
 * create body (https://docs.automox.com/api/policies/create-a-new-policy) and
 * the nested shape `GET /policies` actually returns, where most scheduling and
 * behavior fields live under `configuration`. We read a field from either spot.
 *
 * Automox encodes schedule_days as a 7-digit binary string, index 0 = Sunday ..
 * index 6 = Saturday, and schedule_weeks_of_month as a 5-digit binary string,
 * index 0 = 5th week .. index 4 = 1st week. We only need "2nd week"
 * (Patch Tuesday) support for this tool.
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
  groups?: string[] | { name: string; id?: string | number }[];
  device_groups?: string[] | { name: string; id?: string | number }[];
  device_filters?: string[] | { name: string; id?: string | number }[];
  configuration?: Omit<AutomoxPolicyJson, 'name' | 'policy_type_name' | 'configuration'>;
}

function isAutomoxShape(raw: unknown): raw is AutomoxPolicyJson {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return 'schedule_days' in r || (typeof r.configuration === 'object' && r.configuration !== null && 'schedule_days' in (r.configuration as object));
}

type ConfigurableField = Exclude<keyof AutomoxPolicyJson, 'name' | 'policy_type_name' | 'configuration'>;

/** Automox's real GET /policies response nests most fields one level down in `configuration`. */
function field<K extends ConfigurableField>(raw: AutomoxPolicyJson, key: K): AutomoxPolicyJson[K] {
  return (raw[key] ?? raw.configuration?.[key]) as AutomoxPolicyJson[K];
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
  const list = field(raw, 'groups') ?? field(raw, 'device_groups') ?? field(raw, 'device_filters') ?? [];
  const names = list.map((g) => (typeof g === 'string' ? g : g.name ?? String(g.id ?? ''))).filter(Boolean);
  return names.length ? names : ['All Computers'];
}

function fromAutomox(raw: AutomoxPolicyJson): Policy {
  const scheduleDays = field(raw, 'schedule_days');
  const days = padBinary(scheduleDays ?? '0000000', 7);
  const dayOfWeek = days.indexOf('1') as Weekday;
  const scheduleWeeks = field(raw, 'schedule_weeks_of_month');
  const weeks = scheduleWeeks != null ? padBinary(scheduleWeeks, 5) : null;
  // index 0 = 5th week ... index 4 = 1st week, per Automox docs.
  const weekIndex = weeks ? weeks.indexOf('1') : -1;
  const nth = weekIndex >= 0 ? 5 - weekIndex : null;

  const deferralMinutes = field(raw, 'deferral_minutes');
  const defermentPeriods = field(raw, 'custom_notification_deferment_periods');
  const deferralHours = deferralMinutes
    ? Math.round((deferralMinutes / 60) * 10) / 10
    : defermentPeriods?.length
      ? Math.max(...defermentPeriods) / 60
      : 0;

  const notifyUser = Boolean(field(raw, 'notify_user'));
  const scheduleTime = field(raw, 'schedule_time') ?? '09:00';

  return {
    id: nextId('automox'),
    name: raw.name,
    category: categoryFromPolicyType(raw.policy_type_name),
    targetGroups: targetGroupNames(raw),
    schedule:
      nth !== null
        ? { type: 'nth_weekday', dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 2, nth, time: scheduleTime }
        : { type: 'weekly', dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 1, time: scheduleTime },
    silent: !notifyUser,
    requiresAppClose: false,
    notifyUser,
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

/** Common envelope keys Automox (and most REST list endpoints) wrap bulk results in. */
const LIST_ENVELOPE_KEYS = ['policies', 'data', 'results'] as const;

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of LIST_ENVELOPE_KEYS) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [data];
}

/**
 * Accepts our native schema or an Automox-style policy export — a single
 * policy object, a bare array (`GET /policies`), or that array wrapped in an
 * envelope like `{ "policies": [...] }` / `{ "data": [...] }`, so a raw
 * paginated API response or console export can be pasted in as-is.
 */
export function parsePolicyImport(jsonText: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { policies: [], errors: ['That is not valid JSON.'] };
  }

  const items = unwrapList(data);
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
