import clsx from 'clsx';
import type { Policy, PolicyOccurrence } from '../types';
import { CATEGORY_LABEL } from '../types';
import { CATEGORY_STYLE } from '../lib/categoryStyle';
import { WEEKDAY_LABELS_LONG } from '../lib/dates';

interface Props {
  policies: Policy[];
  selectedOccurrence: PolicyOccurrence | null;
  onUpdateDeferral: (policyId: string, hours: number) => void;
}

function scheduleLabel(policy: Policy): string {
  const s = policy.schedule;
  if (s.type === 'nth_weekday') {
    const ordinal = ['', '1st', '2nd', '3rd', '4th', '5th'][s.nth] ?? `${s.nth}th`;
    return `${ordinal} ${WEEKDAY_LABELS_LONG[s.dayOfWeek]} of the month, ${s.time}`;
  }
  return `Every ${WEEKDAY_LABELS_LONG[s.dayOfWeek]}, ${s.time}`;
}

export function Sidebar({ policies, selectedOccurrence, onUpdateDeferral }: Props) {
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-auto border-l border-line bg-white/60 p-4">
      {selectedOccurrence && (
        <div className="rounded-lg border border-sage-300 bg-sage-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage-700">
            Selected occurrence
          </div>
          <div className="mt-1 text-sm font-semibold text-ink">{selectedOccurrence.policy.name}</div>
          <div className="text-xs text-ink-soft">
            {selectedOccurrence.start.toLocaleString(undefined, {
              weekday: 'long',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
          {selectedOccurrence.hasCollision && (
            <div className="mt-1 text-xs font-semibold text-collision">
              ⚠ Overlaps another policy on a shared target group.
            </div>
          )}
          {selectedOccurrence.policy.notes && (
            <div className="mt-2 text-xs text-ink-soft">{selectedOccurrence.policy.notes}</div>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Legend</div>
        <div className="space-y-1">
          {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((cat) => (
            <div key={cat} className="flex items-center gap-2 text-xs text-ink-soft">
              <span className={clsx('h-2 w-2 rounded-full', CATEGORY_STYLE[cat].dot)} />
              {CATEGORY_LABEL[cat]}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full border-2 border-collision" />
            Collision
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Policies ({policies.length})
        </div>
        <div className="space-y-3">
          {policies.map((policy) => (
            <div key={policy.id} className="rounded-lg border border-line bg-white p-2.5">
              <div className="flex items-center gap-1.5">
                <span className={clsx('h-1.5 w-1.5 rounded-full', CATEGORY_STYLE[policy.category].dot)} />
                <span className="text-xs font-semibold text-ink">{policy.name}</span>
              </div>
              <div className="mt-1 text-[11px] text-ink-soft">{scheduleLabel(policy)}</div>
              <div className="mt-1 text-[11px] text-ink-soft">
                Targets: {policy.targetGroups.join(', ')}
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-ink-soft">
                {policy.silent && <span className="rounded bg-cream-dim px-1.5 py-0.5">silent</span>}
                {policy.notifyUser && <span className="rounded bg-cream-dim px-1.5 py-0.5">notifies user</span>}
                {policy.requiresAppClose && (
                  <span className="rounded bg-cream-dim px-1.5 py-0.5">requires app close</span>
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-[11px] text-ink-soft">
                Deferral (hrs)
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={policy.deferralHours}
                  onChange={(e) => onUpdateDeferral(policy.id, Math.max(0, Number(e.target.value)))}
                  className="w-16 rounded border border-line bg-white px-1.5 py-0.5 text-ink"
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
