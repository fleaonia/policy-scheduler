import { describe, expect, it } from 'vitest';
import { parsePolicyImport } from './importPolicies';

describe('parsePolicyImport', () => {
  it('imports our native schema', () => {
    const { policies, errors } = parsePolicyImport(
      JSON.stringify([
        {
          name: 'Test Policy',
          category: 'third_party',
          targetGroups: ['All Computers'],
          schedule: { type: 'weekly', dayOfWeek: 1, time: '09:00' },
          silent: true,
          deferralHours: 0,
        },
      ]),
    );
    expect(errors).toHaveLength(0);
    expect(policies).toHaveLength(1);
    expect(policies[0].name).toBe('Test Policy');
    expect(policies[0].schedule).toEqual({ type: 'weekly', dayOfWeek: 1, time: '09:00' });
  });

  it('imports a bare Automox-style policy (top-level schedule fields)', () => {
    const { policies, errors } = parsePolicyImport(
      JSON.stringify([
        {
          name: 'Windows Update Prod',
          policy_type_name: 'patch',
          schedule_days: '0000010', // Friday
          schedule_time: '09:00',
          notify_user: true,
          deferral_minutes: 540, // 9 hours
          device_groups: [{ name: 'All Computers' }],
        },
      ]),
    );
    expect(errors).toHaveLength(0);
    expect(policies).toHaveLength(1);
    const p = policies[0];
    expect(p.category).toBe('os_update');
    expect(p.schedule).toEqual({ type: 'weekly', dayOfWeek: 5, time: '09:00' });
    expect(p.deferralHours).toBe(9);
    expect(p.targetGroups).toEqual(['All Computers']);
  });

  it('imports a real GET /policies shape with fields nested under configuration, wrapped in an envelope', () => {
    const { policies, errors } = parsePolicyImport(
      JSON.stringify({
        policies: [
          {
            id: 123,
            name: 'Patch Tuesday Rollout',
            policy_type_name: 'patch',
            configuration: {
              schedule_days: '0010000', // Tuesday (index 0=Sun .. 2=Tue)
              schedule_weeks_of_month: '00010', // 2nd week
              schedule_time: '09:00',
              notify_user: true,
              custom_notification_deferment_periods: [60, 180, 540],
              device_filters: [{ name: 'All Computers', id: 1 }],
            },
          },
        ],
      }),
    );
    expect(errors).toHaveLength(0);
    expect(policies).toHaveLength(1);
    const p = policies[0];
    expect(p.schedule).toEqual({ type: 'nth_weekday', dayOfWeek: 2, nth: 2, time: '09:00' });
    expect(p.deferralHours).toBe(9);
    expect(p.targetGroups).toEqual(['All Computers']);
  });

  it('unwraps a { data: [...] } envelope', () => {
    const { policies } = parsePolicyImport(
      JSON.stringify({
        data: [{ name: 'From data envelope', schedule_days: '0100000', schedule_time: '09:00' }],
      }),
    );
    expect(policies).toHaveLength(1);
    expect(policies[0].name).toBe('From data envelope');
  });

  it('reports per-item errors without dropping valid items', () => {
    const { policies, errors } = parsePolicyImport(
      JSON.stringify([{ name: 'Valid', schedule: { type: 'weekly', dayOfWeek: 1, time: '09:00' } }, { no_name: true }]),
    );
    expect(policies).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it('returns an error for invalid JSON', () => {
    const { policies, errors } = parsePolicyImport('{not json');
    expect(policies).toHaveLength(0);
    expect(errors[0]).toMatch(/not valid JSON/);
  });
});
