import { useState } from 'react';
import type { CollisionPair } from '../types';

interface Props {
  collisions: CollisionPair[];
  onSelectPair: (pair: CollisionPair) => void;
}

function describe(pair: CollisionPair): string {
  const { a, b, sharedGroups } = pair;
  const when = a.start.toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `"${a.policy.name}" and "${b.policy.name}" both target ${sharedGroups.join(', ')} with overlapping run windows starting ${when} — one should be rescheduled or have its deferral shortened.`;
}

export function CollisionBanner({ collisions, onSelectPair }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collisions.length === 0) return null;

  return (
    <div className="border-b border-collision/40 bg-[#fbeceb] px-6 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-collision">
          <span aria-hidden>⚠</span>
          {collisions.length} policy collision{collisions.length > 1 ? 's' : ''} in view
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-xs font-medium text-collision/80 hover:text-collision"
        >
          {collapsed ? 'Show details' : 'Hide details'}
        </button>
      </div>
      {!collapsed && (
        <ul className="mt-1.5 space-y-1">
          {collisions.map((pair, i) => (
            <li key={i}>
              <button
                onClick={() => onSelectPair(pair)}
                className="text-left text-xs text-ink hover:underline"
              >
                {describe(pair)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
