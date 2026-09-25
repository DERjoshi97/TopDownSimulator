import { useEffect, useState } from 'react';
import { formatExerciseTime } from '@tds/engine';
import { MapCanvas } from './map/MapCanvas';
import { useGameStore } from './store/gameStore';
import { UnitToolbar } from './toolbar/UnitToolbar';

export function App() {
  const startedAt = useGameStore((s) => s.startedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="app">
      <MapCanvas />
      <header className="app-header">
        <h1>TopDownSimulator</h1>
        <span className="clock" aria-label="Einsatzuhr">
          {formatExerciseTime(now - startedAt)}
        </span>
      </header>
      <UnitToolbar />
    </main>
  );
}
