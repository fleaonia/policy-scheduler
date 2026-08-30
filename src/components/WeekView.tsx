import { useState } from 'react';
import clsx from 'clsx';
import { isSameDay, isToday } from 'date-fns';
import type { PolicyOccurrence, Weekday } from '../types';
import { WEEKDAY_LABELS_LONG, weekDays } from '../lib/dates';
import { NO_PATCH_WEEKDAY } from '../data/seedPolicies';
import { PolicyChip } from './PolicyChip';

interface Props {
  weekAnchor: Date;
  occurrences: PolicyOccurrence[];
  onSelectOccurrence: (occurrence: PolicyOccurrence) => void;
  onMovePolicy: (policyId: string, targetDayOfWeek: Weekday) => void;
}

export function WeekView({ weekAnchor, occurrences, onSelectOccurrence, onMovePolicy }: Props) {
  const [draggingPolicyId, setDraggingPolicyId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const days = weekDays(weekAnchor);

  return (
    <div className="grid flex-1 grid-cols-7 gap-2 overflow-auto">
      {days.map((day) => {
        const dayOccurrences = occurrences
          .filter((o) => isSameDay(o.start, day))
          .sort((a, b) => a.start.getTime() - b.start.getTime());
        const isNoPatchDay = day.getDay() === NO_PATCH_WEEKDAY;
        const isDragOver = dragOverDay === day.getDay();

        return (
          <div
            key={day.toISOString()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverDay(day.getDay());
            }}
            onDragLeave={() => setDragOverDay((cur) => (cur === day.getDay() ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              const policyId = e.dataTransfer.getData('text/policy-id');
              if (policyId) onMovePolicy(policyId, day.getDay() as Weekday);
              setDragOverDay(null);
            }}
            className={clsx(
              'flex min-h-[24rem] flex-col rounded-xl border border-line bg-white/60 p-2',
              isDragOver && 'drop-target',
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {WEEKDAY_LABELS_LONG[day.getDay()].slice(0, 3)}
                </div>
                <div
                  className={clsx(
                    'text-sm font-semibold',
                    isToday(day) ? 'text-sage-600' : 'text-ink',
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
              {isNoPatchDay && <span className="text-[10px] italic text-ink-soft">no patches</span>}
            </div>

            <div className="flex-1 space-y-2">
              {dayOccurrences.map((occ) => {
                const draggable = occ.policy.schedule.type === 'weekly';
                return (
                  <div key={occ.policy.id} className="space-y-1">
                    <PolicyChip
                      occurrence={occ}
                      draggable={draggable}
                      onDragStart={(ev) => {
                        ev?.dataTransfer?.setData('text/policy-id', occ.policy.id);
                        setDraggingPolicyId(occ.policy.id);
                      }}
                      onDragEnd={() => setDraggingPolicyId(null)}
                      onSelect={() => onSelectOccurrence(occ)}
                      selected={draggingPolicyId === occ.policy.id}
                    />
                    {occ.policy.deferralHours > 0 && (
                      <div className="rounded bg-cream-dim px-2 py-1 text-[10px] text-ink-soft">
                        Blackout for {occ.policy.targetGroups.join(', ')} until{' '}
                        {occ.blackoutEnd.toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    {!draggable && (
                      <div className="px-1 text-[10px] italic text-ink-soft">
                        fixed cadence — edit in panel
                      </div>
                    )}
                  </div>
                );
              })}
              {dayOccurrences.length === 0 && (
                <div className="pt-6 text-center text-xs text-ink-soft/70">No policies scheduled</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
