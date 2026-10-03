import { describe, expect, it } from 'vitest';
import { exerciseTimeAt, formatExerciseTime } from './clock';

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

describe('exerciseTimeAt', () => {
  const anchor = { exerciseTime: 60_000, wallTime: 1_000_000, running: true, speed: 1 };

  it('zählt in Echtzeit weiter', () => {
    expect(exerciseTimeAt(anchor, 1_030_000)).toBe(90_000);
  });

  it('steht still, solange die Uhr angehalten ist', () => {
    expect(exerciseTimeAt({ ...anchor, running: false }, 1_030_000)).toBe(60_000);
  });

  it('läuft im Zeitraffer schneller', () => {
    expect(exerciseTimeAt({ ...anchor, speed: 5 }, 1_010_000)).toBe(110_000);
  });

  it('läuft nie rückwärts, auch wenn die Rechneruhr zurückgestellt wird', () => {
    expect(exerciseTimeAt(anchor, 900_000)).toBe(60_000);
  });
});
