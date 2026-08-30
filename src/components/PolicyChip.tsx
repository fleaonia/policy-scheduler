import clsx from 'clsx';
import type { PolicyOccurrence } from '../types';
import { CATEGORY_STYLE } from '../lib/categoryStyle';

interface Props {
  occurrence: PolicyOccurrence;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  onSelect?: () => void;
  selected?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function PolicyChip({
  occurrence,
  compact = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onSelect,
  selected = false,
}: Props) {
  const style = CATEGORY_STYLE[occurrence.policy.category];
  const { policy, hasCollision } = occurrence;

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      title={policy.name}
      className={clsx(
        'w-full text-left rounded-md border px-2 py-1 transition-shadow',
        style.bg,
        style.border,
        draggable && 'cursor-grab active:cursor-grabbing',
        hasCollision && 'ring-2 ring-collision border-collision',
        selected && 'ring-2 ring-ink',
        compact ? 'text-[11px] leading-tight mb-1' : 'text-xs leading-snug mb-1.5',
      )}
    >
      <div className="flex items-center gap-1">
        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
        <span className="truncate font-medium text-ink">{policy.name}</span>
      </div>
      <div className="flex items-center justify-between text-ink-soft">
        <span>{formatTime(occurrence.start)}</span>
        {hasCollision && <span className="font-semibold text-collision">⚠ collision</span>}
      </div>
      {!compact && policy.deferralHours > 0 && (
        <div className="text-ink-soft">Deferral: {policy.deferralHours}h</div>
      )}
    </button>
  );
}
