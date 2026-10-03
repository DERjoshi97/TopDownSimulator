import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import { decide } from './decide';
import { Game } from './game';

// Ausgangslage: ein Feuer mit 3 m Radius bei (10|20), nur für die Übungsleitung sichtbar,
// und eine Person ohne Radius.
const withFire = replay([
  {
    type: 'SituationObjectPlaced',
    exerciseTime: 0,
    objectId: 'fire-1',
    objectType: 'fire',
    position: { x: 10, y: 20 },
    rotation: 0,
    radius: 3,
    visibility: 'director',
  },
  {
    type: 'SituationObjectPlaced',
    exerciseTime: 0,
    objectId: 'person-1',
    objectType: 'person',
    position: { x: 0, y: 0 },
    rotation: 0,
    visibility: 'everyone',
  },
]);

describe('decide: PlaceSituationObject', () => {
  it('setzt Drehung 0 und Sichtbarkeit `everyone` als Standard', () => {
    const result = decide(
      withFire,
      {
        type: 'PlaceSituationObject',
        objectId: 'smoke-1',
        objectType: 'smoke',
        position: { x: 1, y: 2 },
        radius: 6,
      },
      4_000,
    );
    expect(result).toEqual({
      ok: true,
      events: [
        {
          type: 'SituationObjectPlaced',
          exerciseTime: 4_000,
          objectId: 'smoke-1',
          objectType: 'smoke',
          position: { x: 1, y: 2 },
          rotation: 0,
          radius: 6,
          visibility: 'everyone',
        },
      ],
    });
  });

  it('lässt den Radius bei Symbolen weg', () => {
    const result = decide(
      withFire,
      {
        type: 'PlaceSituationObject',
        objectId: 'cordon-1',
        objectType: 'cordon',
        position: { x: 0, y: 0 },
        rotation: -45,
      },
      0,
    );
    expect(result.ok && result.events[0]).not.toHaveProperty('radius');
    expect(result.ok && result.events[0]).toMatchObject({ rotation: 315 });
  });

  it.each([
    [{ objectId: 'fire-1' }, 'situation-object-already-exists'],
    [{ objectType: ' ' }, 'invalid-object-type'],
    [{ position: { x: Infinity, y: 0 } }, 'invalid-position'],
    [{ rotation: NaN }, 'invalid-rotation'],
    [{ radius: 0 }, 'invalid-radius'],
    [{ radius: -2 }, 'invalid-radius'],
    [{ visibility: 'niemand' }, 'invalid-visibility'],
  ])('lehnt %o ab mit %s', (override, code) => {
    const command = {
      type: 'PlaceSituationObject' as const,
      objectId: 'neu',
      objectType: 'fire',
      position: { x: 0, y: 0 },
      ...override,
    };
    // `as never`, weil der Test bewusst ungültige Werte wie eine falsche Sichtbarkeit einschleust.
    const result = decide(withFire, command as never, 0);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.rejection.code).toBe(code);
  });
});

describe('decide: Lageobjekt ändern', () => {
  it('merkt sich beim Verschieben die alte Position', () => {
    const result = decide(
      withFire,
      { type: 'MoveSituationObject', objectId: 'fire-1', position: { x: 5, y: 5 } },
      1_000,
    );
    expect(result.ok && result.events[0]).toEqual({
      type: 'SituationObjectMoved',
      exerciseTime: 1_000,
      objectId: 'fire-1',
      from: { x: 10, y: 20 },
      to: { x: 5, y: 5 },
    });
  });

  it('ändert den Radius einer Fläche', () => {
    const result = decide(
      withFire,
      { type: 'ResizeSituationObject', objectId: 'fire-1', radius: 7.5 },
      0,
    );
    expect(result.ok && result.events[0]).toMatchObject({ radius: 7.5 });
  });

  it('lehnt einen Radius für Symbole ab', () => {
    const result = decide(
      withFire,
      { type: 'ResizeSituationObject', objectId: 'person-1', radius: 2 },
      0,
    );
    expect(result).toEqual({
      ok: false,
      rejection: { code: 'not-resizable', objectId: 'person-1' },
    });
  });

  it('lehnt Befehle für unbekannte Lageobjekte ab', () => {
    for (const command of [
      { type: 'MoveSituationObject', objectId: 'x', position: { x: 0, y: 0 } },
      { type: 'RotateSituationObject', objectId: 'x', rotation: 0 },
      { type: 'ResizeSituationObject', objectId: 'x', radius: 1 },
      { type: 'ChangeSituationObjectVisibility', objectId: 'x', visibility: 'everyone' },
      { type: 'RemoveSituationObject', objectId: 'x' },
    ] as const) {
      expect(decide(withFire, command, 0)).toEqual({
        ok: false,
        rejection: { code: 'situation-object-not-found', objectId: 'x' },
      });
    }
  });
});

describe('decide: Länge einer Absperrung', () => {
  const withCordon = replay([
    {
      type: 'SituationObjectPlaced',
      exerciseTime: 0,
      objectId: 'cordon-1',
      objectType: 'cordon',
      position: { x: 0, y: 0 },
      rotation: 0,
      length: 10,
      visibility: 'everyone',
    },
  ]);

  it('übernimmt die Länge beim Platzieren', () => {
    expect(withCordon.situationObjects['cordon-1']?.length).toBe(10);
  });

  it('ändert die Länge', () => {
    const result = decide(
      withCordon,
      { type: 'ChangeSituationObjectLength', objectId: 'cordon-1', length: 25 },
      0,
    );
    expect(result.ok && result.events[0]).toMatchObject({
      type: 'SituationObjectLengthChanged',
      length: 25,
    });
  });

  it('lehnt ungültige Längen ab', () => {
    const result = decide(
      withCordon,
      { type: 'ChangeSituationObjectLength', objectId: 'cordon-1', length: 0 },
      0,
    );
    expect(!result.ok && result.rejection.code).toBe('invalid-length');
  });

  it('lehnt eine Länge für Objekte ohne Länge ab', () => {
    const result = decide(
      withFire,
      { type: 'ChangeSituationObjectLength', objectId: 'fire-1', length: 5 },
      0,
    );
    expect(!result.ok && result.rejection.code).toBe('not-resizable');
  });
});

describe('Lageobjekte im Spielverlauf', () => {
  it('ergibt aus allen Befehlen den erwarteten Stand', () => {
    const game = new Game();
    const id = 'hazmat-1';
    game.execute(
      {
        type: 'PlaceSituationObject',
        objectId: id,
        objectType: 'hazardous-material',
        position: { x: 0, y: 0 },
        radius: 10,
        visibility: 'director',
      },
      0,
    );
    game.execute({ type: 'MoveSituationObject', objectId: id, position: { x: 3, y: 4 } }, 1);
    game.execute({ type: 'RotateSituationObject', objectId: id, rotation: 450 }, 2);
    game.execute({ type: 'ResizeSituationObject', objectId: id, radius: 15 }, 3);
    game.execute(
      { type: 'ChangeSituationObjectVisibility', objectId: id, visibility: 'reconnoitered' },
      4,
    );

    expect(game.state.situationObjects[id]).toEqual({
      id,
      objectType: 'hazardous-material',
      position: { x: 3, y: 4 },
      rotation: 90,
      radius: 15,
      visibility: 'reconnoitered',
    });
    // Aus den Ereignissen nachgerechnet kommt dasselbe heraus.
    expect(replay(game.events)).toEqual(game.state);

    game.execute({ type: 'RemoveSituationObject', objectId: id }, 5);
    expect(game.state.situationObjects).toEqual({});
  });
});
