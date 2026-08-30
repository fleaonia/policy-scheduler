import clsx from 'clsx';
import { addMonths, addWeeks, format } from 'date-fns';
import type { ViewMode } from '../App';

interface Props {
  view: ViewMode;
  anchor: Date;
  onChangeView: (view: ViewMode) => void;
  onChangeAnchor: (date: Date) => void;
  onImportClick: () => void;
}

export function Header({ view, anchor, onChangeView, onChangeAnchor, onImportClick }: Props) {
  function step(direction: 1 | -1) {
    onChangeAnchor(view === 'month' ? addMonths(anchor, direction) : addWeeks(anchor, direction));
  }

  return (
    <header className="flex items-center justify-between border-b border-line bg-white/70 px-6 py-3">
      <div>
        <h1 className="text-lg font-semibold text-ink">Policy Scheduler</h1>
        <p className="text-xs text-ink-soft">Automox patch policy visual calendar</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => step(-1)}
          className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-cream-dim"
          aria-label="Previous"
        >
          ‹
        </button>
        <button
          onClick={() => onChangeAnchor(new Date())}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-dim"
        >
          Today
        </button>
        <button
          onClick={() => step(1)}
          className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-cream-dim"
          aria-label="Next"
        >
          ›
        </button>
        <span className="ml-2 min-w-[9rem] text-sm font-medium text-ink">
          {format(anchor, view === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-line p-0.5">
          {(['month', 'week'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeView(mode)}
              className={clsx(
                'rounded px-3 py-1 text-xs font-medium capitalize',
                view === mode ? 'bg-sage-500 text-white' : 'text-ink-soft hover:bg-cream-dim',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          onClick={onImportClick}
          className="rounded-md bg-sage-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-600"
        >
          Import policies
        </button>
      </div>
    </header>
  );
}
