import { describe, expect, it } from 'vitest';
import { Game, type Command } from '@tds/engine';
import { logbookEntries } from './logbookEntries';

/** Spielt Befehle zu den angegebenen Übungszeiten durch und liefert die Tagebuchtexte. */
function play(...steps: [number, Command][]) {
  const game = new Game();
  for (const [time, command] of steps) {
    const result = game.execute(command, time);
    if (!result.ok) throw new Error(`Befehl abgelehnt: ${result.rejection.code}`);
  }
  return logbookEntries(game.events);
}

const texts = (entries: ReturnType<typeof play>) => entries.map((e) => e.text);

describe('logbookEntries', () => {
  it('nummeriert gleichartige Einheiten durch', () => {
    const entries = play(
      [0, { type: 'PlaceUnit', unitId: 'a', unitType: 'HLF', position: { x: 0, y: 0 } }],
      [0, { type: 'PlaceUnit', unitId: 'b', unitType: 'HLF', position: { x: 0, y: 0 } }],
      [0, { type: 'PlaceUnit', unitId: 'c', unitType: 'DLK', position: { x: 0, y: 0 } }],
      [5_000, { type: 'MoveUnit', unitId: 'b', position: { x: 3, y: 4 } }],
    );
    expect(texts(entries)).toEqual([
      'HLF 1 platziert',
      'HLF 2 platziert',
      'DLK 1 platziert',
      'HLF 2 verschoben (5 m)',
    ]);
    expect(entries[3]).toMatchObject({ exerciseTime: 5_000, ref: { kind: 'unit', id: 'b' } });
  });

  it('beschreibt Lageobjekte mit Namen, Radius und Sichtbarkeit', () => {
    const entries = play(
      [
        0,
        {
          type: 'PlaceSituationObject',
          objectId: 'f',
          objectType: 'fire',
          position: { x: 0, y: 0 },
          radius: 3,
          visibility: 'director',
        },
      ],
      [1, { type: 'ResizeSituationObject', objectId: 'f', radius: 7.5 }],
      [2, { type: 'ResizeSituationObject', objectId: 'f', radius: 6 }],
      [3, { type: 'ChangeSituationObjectVisibility', objectId: 'f', visibility: 'everyone' }],
      [4, { type: 'RemoveSituationObject', objectId: 'f' }],
    );
    expect(texts(entries)).toEqual([
      'Lage: Feuer 1 eingespielt, Radius 3 m, sichtbar für nur Übungsleitung',
      'Feuer 1 ausgeweitet auf 7,5 m',
      'Feuer 1 verkleinert auf 6 m',
      'Feuer 1 jetzt sichtbar für alle',
      'Feuer 1 entfernt',
    ]);
    // Entfernte Objekte lassen sich nicht mehr anklicken.
    expect(entries[4]).not.toHaveProperty('ref');
  });

  it('unterscheidet Übungsbeginn und Fortsetzen', () => {
    const entries = play(
      [0, { type: 'ResumeClock' }],
      [0, { type: 'PauseClock' }],
      [0, { type: 'ResumeClock' }],
      [60_000, { type: 'SetClockSpeed', speed: 5 }],
      [90_000, { type: 'SetClockSpeed', speed: 1 }],
    );
    expect(texts(entries)).toEqual([
      'Übung gestartet',
      'Übung angehalten',
      'Übung fortgesetzt',
      'Zeitraffer 5-fach',
      'Zeit läuft in Echtzeit',
    ]);
  });
});
