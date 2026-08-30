import clsx from 'clsx';
import { isSameDay, isSameMonth, isToday } from 'date-fns';
import type { PolicyOccurrence } from '../types';
import { monthGridDays, WEEKDAY_LABELS } from '../lib/dates';
import { NO_PATCH_WEEKDAY } from '../data/seedPolicies';
import { PolicyChip } from './PolicyChip';

interface Props {
  monthAnchor: Date;
  occurrences: PolicyOccurrence[];
  onSelectDay: (day: Date) => void;
  onSelectOccurrence: (occurrence: PolicyOccurrence) => void;
}

const MAX_VISIBLE = 3;

export function MonthView({ monthAnchor, occurrences, onSelectDay, onSelectOccurrence }: Props) {
  const days = monthGridDays(monthAnchor);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white/60">
      <div className="grid grid-cols-7 border-b border-line bg-cream-dim">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-auto">
        {days.map((day) => {
          const dayOccurrences = occurrences.filter((o) => isSameDay(o.start, day));
          const visible = dayOccurrences.slice(0, MAX_VISIBLE);
          const overflow = dayOccurrences.length - visible.length;
          const isNoPatchDay = day.getDay() === NO_PATCH_WEEKDAY;

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectDay(day)}
              className={clsx(
                'flex min-h-[7rem] flex-col items-stretch gap-1 border-b border-r border-line p-1.5 text-left align-top hover:bg-sage-50',
                !isSameMonth(day, monthAnchor) && 'bg-cream-dim/60 text-ink-soft/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs',
                    isToday(day) && 'bg-sage-500 font-semibold text-white',
                  )}
                >
                  {day.getDate()}
                </span>
                {isNoPatchDay && isSameMonth(day, monthAnchor) && (
                  <span className="text-[10px] italic text-ink-soft">no patches</span>
                )}
              </div>
              <div className="flex-1">
                {visible.map((occ) => (
                  <div
                    key={`${occ.policy.id}-${occ.start.toISOString()}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PolicyChip occurrence={occ} compact onSelect={() => onSelectOccurrence(occ)} />
                  </div>
                ))}
                {overflow > 0 && <div className="text-[11px] text-ink-soft">+{overflow} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
