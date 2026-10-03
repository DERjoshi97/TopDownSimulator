import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import type { GameEvent } from './events';
import { parseExercise, serializeExercise } from './exerciseFile';

const events: GameEvent[] = [
  {
    type: 'UnitPlaced',
    exerciseTime: 0,
    unitId: 'hlf-1',
    unitType: 'HLF',
    position: { x: 1, y: 2 },
    rotation: 90,
  },
  {
    type: 'SituationObjectPlaced',
    exerciseTime: 0,
    objectId: 'cordon-1',
    objectType: 'cordon',
    position: { x: 0, y: 0 },
    rotation: 0,
    length: 10,
    visibility: 'director',
  },
  { type: 'ClockResumed', exerciseTime: 0 },
  {
    type: 'UnitMoved',
    exerciseTime: 30_000,
    unitId: 'hlf-1',
    from: { x: 1, y: 2 },
    to: { x: 5, y: 5 },
  },
  { type: 'ClockPaused', exerciseTime: 60_000 },
];

/** Baut eine Datei mit beliebigem Inhalt, um gezielt Fehler einzuschleusen. */
const fileWith = (overrides: Record<string, unknown>) =>
  JSON.stringify({
    format: 'topdownsimulator-exercise',
    version: 1,
    exerciseTime: 100_000,
    events: [],
    ...overrides,
  });

describe('Übungsdatei', () => {
  it('ergibt nach Speichern und Laden denselben Spielstand', () => {
    const text = serializeExercise(events, 75_000, new Date('2026-10-03T12:00:00Z'));
    const result = parseExercise(text);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.savedAt).toBe('2026-10-03T12:00:00.000Z');
    expect(result.file.exerciseTime).toBe(75_000);
    expect(result.file.events).toEqual(events);
    expect(replay(result.file.events)).toEqual(replay(events));
  });

  it('erkennt kaputtes JSON', () => {
    expect(parseExercise('{ nicht json')).toEqual({ ok: false, error: { code: 'invalid-json' } });
  });

  it('erkennt fremde JSON-Dateien', () => {
    expect(parseExercise('{"name": "package.json"}')).toEqual({
      ok: false,
      error: { code: 'unknown-format' },
    });
  });

  it('lehnt Dateien aus einer neueren Version ab', () => {
    expect(parseExercise(fileWith({ version: 2 }))).toEqual({
      ok: false,
      error: { code: 'unsupported-version', version: 2 },
    });
  });

  it.each([
    ['unbekannter Typ', { type: 'UnitTeleported', exerciseTime: 0, unitId: 'a' }],
    ['fehlendes Feld', { type: 'UnitRemoved', exerciseTime: 0 }],
    ['falsche Position', { ...events[0], position: { x: 'links', y: 0 } }],
    ['negative Zeit', { type: 'ClockPaused', exerciseTime: -1 }],
    ['Radius 0', { ...events[1], radius: 0 }],
    ['falsche Sichtbarkeit', { ...events[1], visibility: 'niemand' }],
  ])('meldet das fehlerhafte Ereignis (%s)', (_, broken) => {
    const result = parseExercise(fileWith({ events: [events[0], broken] }));
    expect(result).toEqual({ ok: false, error: { code: 'invalid-event', index: 1 } });
  });

  it('verlangt einen Uhrstand, der nicht vor dem letzten Ereignis liegt', () => {
    const late = [{ type: 'ClockResumed', exerciseTime: 200_000 }];
    expect(parseExercise(fileWith({ events: late })).ok).toBe(false);
    expect(parseExercise(fileWith({ exerciseTime: undefined })).ok).toBe(false);
  });

  it('lehnt rückwärts laufende Übungszeit ab', () => {
    const result = parseExercise(
      fileWith({
        events: [
          { type: 'ClockResumed', exerciseTime: 5_000 },
          { type: 'ClockPaused', exerciseTime: 1_000 },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, error: { code: 'invalid-event', index: 1 } });
  });
});
