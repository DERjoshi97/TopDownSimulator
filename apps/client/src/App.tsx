import { useEffect, useState } from 'react';
import { formatExerciseTime } from '@tds/engine';
import { MapCanvas } from './map/MapCanvas';

export function App() {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

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
    </main>
  );
}
