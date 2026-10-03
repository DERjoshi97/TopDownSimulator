import { formatExerciseTime } from '@tds/engine';
import { useGameStore } from '../store/gameStore';
import { useTicker } from './useTicker';

/** Wählbare Zeitraffer-Faktoren. */
const SPEEDS = [1, 2, 5, 10];

/** Einsatzuhr mit Start/Pause und Zeitraffer. */
export function ExerciseClock() {
  const running = useGameStore((s) => s.state.clock.running);
  const speed = useGameStore((s) => s.state.clock.speed);
  const started = useGameStore((s) => s.events.some((e) => e.type === 'ClockResumed'));
  const execute = useGameStore((s) => s.execute);
  const exerciseTime = useGameStore((s) => s.exerciseTime);
  // Solange die Uhr läuft, regelmäßig neu zeichnen. Angehalten ändert sich nichts.
  useTicker(running);

  return (
    <div className="exercise-clock">
      <span className={`clock${running ? '' : ' clock--paused'}`} aria-label="Einsatzuhr">
        {formatExerciseTime(exerciseTime())}
      </span>
      <button
        type="button"
        className="clock-toggle"
        onClick={() => execute({ type: running ? 'PauseClock' : 'ResumeClock' })}
      >
        {running ? '❚❚ Pause' : started ? '▶ Weiter' : '▶ Start'}
      </button>
      <div className="clock-speeds" role="group" aria-label="Zeitraffer">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === speed}
            title={s === 1 ? 'Echtzeit' : `${s}-fach beschleunigt`}
            onClick={() => s !== speed && execute({ type: 'SetClockSpeed', speed: s })}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
