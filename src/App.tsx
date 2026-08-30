import { useMemo, useState } from 'react';
import { addWeeks, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import type { CollisionPair, Policy, PolicyOccurrence, Weekday } from './types';
import { seedPolicies } from './data/seedPolicies';
import { buildSchedule } from './lib/schedule';
import { Header } from './components/Header';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { Sidebar } from './components/Sidebar';
import { ImportModal } from './components/ImportModal';
import { CollisionBanner } from './components/CollisionBanner';

export type ViewMode = 'month' | 'week';

/** How far ahead the collision banner looks, independent of what's currently on screen. */
const NOTIFICATION_LOOKAHEAD_WEEKS = 8;

function App() {
  const [policies, setPolicies] = useState<Policy[]>(seedPolicies);
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [selectedOccurrence, setSelectedOccurrence] = useState<PolicyOccurrence | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(anchor)) : startOfWeek(anchor);
  const rangeEnd = view === 'month' ? endOfWeek(endOfMonth(anchor)) : endOfWeek(anchor);

  const { occurrences } = useMemo(
    () => buildSchedule(policies, rangeStart, rangeEnd),
    [policies, rangeStart, rangeEnd],
  );

  // Collisions are surfaced regardless of which day/week/month is currently in view.
  const { collisions } = useMemo(() => {
    const today = startOfWeek(new Date());
    return buildSchedule(policies, today, addWeeks(today, NOTIFICATION_LOOKAHEAD_WEEKS));
  }, [policies]);

  function handleMovePolicy(policyId: string, targetDayOfWeek: Weekday) {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId && p.schedule.type === 'weekly'
          ? { ...p, schedule: { ...p.schedule, dayOfWeek: targetDayOfWeek } }
          : p,
      ),
    );
  }

  function handleUpdateDeferral(policyId: string, hours: number) {
    setPolicies((prev) => prev.map((p) => (p.id === policyId ? { ...p, deferralHours: hours } : p)));
  }

  function handleImport(imported: Policy[]) {
    setPolicies((prev) => [...prev, ...imported]);
  }

  function handleSelectCollisionPair(pair: CollisionPair) {
    setAnchor(pair.a.start);
    setView('week');
    setSelectedOccurrence(pair.a);
  }

  return (
    <div className="flex h-screen flex-col bg-cream">
      <Header
        view={view}
        anchor={anchor}
        onChangeView={setView}
        onChangeAnchor={setAnchor}
        onImportClick={() => setImportOpen(true)}
      />
      <CollisionBanner collisions={collisions} onSelectPair={handleSelectCollisionPair} />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden p-4">
          {view === 'month' ? (
            <MonthView
              monthAnchor={anchor}
              occurrences={occurrences}
              onSelectDay={(day) => {
                setAnchor(day);
                setView('week');
              }}
              onSelectOccurrence={setSelectedOccurrence}
            />
          ) : (
            <WeekView
              weekAnchor={anchor}
              occurrences={occurrences}
              onSelectOccurrence={setSelectedOccurrence}
              onMovePolicy={handleMovePolicy}
            />
          )}
        </main>
        <Sidebar
          policies={policies}
          selectedOccurrence={selectedOccurrence}
          onUpdateDeferral={handleUpdateDeferral}
        />
      </div>
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={handleImport} />}
    </div>
  );
}

export default App;
