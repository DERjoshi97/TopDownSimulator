import { useState } from 'react';
import { ExerciseClock } from './clock/ExerciseClock';
import { Logbook } from './logbook/Logbook';
import { MapCanvas } from './map/MapCanvas';
import { SelectionPanel } from './selection/SelectionPanel';
import { Toolbar } from './toolbar/Toolbar';

export function App() {
  const [logbookOpen, setLogbookOpen] = useState(true);

  return (
    <main className="app">
      <MapCanvas />
      <header className="app-header">
        <h1>TopDownSimulator</h1>
        <ExerciseClock />
        <button
          type="button"
          aria-pressed={logbookOpen}
          onClick={() => setLogbookOpen((open) => !open)}
        >
          Tagebuch
        </button>
      </header>
      <Toolbar />
      {/* Rechte Spalte: Auswahl oben, Tagebuch darunter – so überdecken sie sich nicht. */}
      <aside className="side-panels">
        <SelectionPanel />
        {logbookOpen && <Logbook onClose={() => setLogbookOpen(false)} />}
      </aside>
    </main>
  );
}
