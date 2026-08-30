import { useMemo, useState } from 'react';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import type { Policy, PolicyOccurrence, Weekday } from './types';
import { seedPolicies } from './data/seedPolicies';
import { buildOccurrences } from './lib/schedule';
import { Header } from './components/Header';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { Sidebar } from './components/Sidebar';
import { ImportModal } from './components/ImportModal';

export type ViewMode = 'month' | 'week';

function App() {
  const [policies, setPolicies] = useState<Policy[]>(seedPolicies);
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [selectedOccurrence, setSelectedOccurrence] = useState<PolicyOccurrence | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(anchor)) : startOfWeek(anchor);
  const rangeEnd = view === 'month' ? endOfWeek(endOfMonth(anchor)) : endOfWeek(anchor);

  const occurrences = useMemo(
    () => buildOccurrences(policies, rangeStart, rangeEnd),
    [policies, rangeStart, rangeEnd],
  );

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

  return (
    <div className="flex h-screen flex-col bg-cream">
      <Header
        view={view}
        anchor={anchor}
        onChangeView={setView}
        onChangeAnchor={setAnchor}
        onImportClick={() => setImportOpen(true)}
      />
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
