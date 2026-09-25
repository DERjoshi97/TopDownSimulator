import { describe, expect, it } from 'vitest';
import { formatExerciseTime } from './clock';

describe('formatExerciseTime', () => {
  it('startet bei 00:00:00', () => {
    expect(formatExerciseTime(0)).toBe('00:00:00');
  });

  it('zeigt Minuten und Sekunden', () => {
    expect(formatExerciseTime(5 * 60_000 + 30_000)).toBe('00:05:30');
  });

  it('zeigt Stunden', () => {
    expect(formatExerciseTime(2 * 3_600_000 + 7 * 60_000 + 9_000)).toBe('02:07:09');
  });

  it('schneidet angefangene Sekunden ab', () => {
    expect(formatExerciseTime(1_999)).toBe('00:00:01');
  });

  it('behandelt negative Werte als 0', () => {
    expect(formatExerciseTime(-500)).toBe('00:00:00');
  });
});
