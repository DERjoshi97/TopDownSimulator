import { useEffect, useState } from 'react';
import { formatExerciseTime } from '@tds/engine';

export function App() {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="app">
      <h1>TopDownSimulator</h1>
      <p>Digitales Planspiel für die Feuerwehr</p>
      <p className="clock" aria-label="Einsatzuhr">
        {formatExerciseTime(now - startedAt)}
      </p>
    </main>
  );
}
