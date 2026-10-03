import { useEffect, useState } from 'react';
import { ExerciseClock } from './clock/ExerciseClock';
import { ExerciseFileMenu } from './files/ExerciseFileMenu';
import { Logbook } from './logbook/Logbook';
import { MapCanvas } from './map/MapCanvas';
import { openPresentationWindow, startDirectorSync } from './presentation/sync';
import { SelectionPanel } from './selection/SelectionPanel';
import { Toolbar } from './toolbar/Toolbar';

export function App() {
  const [logbookOpen, setLogbookOpen] = useState(true);

  // Beamer-Fenster mit Lage, Uhr und Ausschnitt versorgen.
  useEffect(() => startDirectorSync(), []);

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
        <button
          type="button"
          title="Präsentationsfenster für den Beamer öffnen – zeigt nur Freigegebenes"
          onClick={openPresentationWindow}
        >
          Beamer
        </button>
        <ExerciseFileMenu />
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
