import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import { decide } from './decide';
import { Game } from './game';
import { polygonArea, polygonCentroid } from './geometry';

/** 10 × 6 m großes Rechteck mit der linken oberen Ecke bei (0|0). */
const rectangle = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 6 },
  { x: 0, y: 6 },
];

describe('Geometrie', () => {
  it('berechnet die Fläche unabhängig von der Umlaufrichtung', () => {
    expect(polygonArea(rectangle)).toBe(60);
    expect(polygonArea([...rectangle].reverse())).toBe(60);
  });

  it('findet den Schwerpunkt', () => {
    expect(polygonCentroid(rectangle)).toEqual({ x: 5, y: 3 });
  });
});

describe('Gebäude', () => {
  it('entsteht mit einem Geschoss als Standard und ohne leeren Namen', () => {
    const result = decide(
      replay([]),
      { type: 'AddBuilding', buildingId: 'b', outline: rectangle, name: '  ' },
      0,
    );
    expect(result).toEqual({
      ok: true,
      events: [
        { type: 'BuildingAdded', exerciseTime: 0, buildingId: 'b', outline: rectangle, storeys: 1 },
      ],
    });
  });

  it.each([
    ['zu wenige Eckpunkte', { outline: rectangle.slice(0, 2) }, 'invalid-outline'],
    [
      'keine Fläche',
      {
        outline: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 10, y: 0 },
        ],
      },
      'invalid-outline',
    ],
    [
      'ungültige Koordinate',
      { outline: [...rectangle.slice(0, 3), { x: NaN, y: 0 }] },
      'invalid-outline',
    ],
    ['halbes Geschoss', { storeys: 1.5 }, 'invalid-storeys'],
    ['null Geschosse', { storeys: 0 }, 'invalid-storeys'],
    ['zu langer Name', { name: 'x'.repeat(61) }, 'invalid-name'],
  ])('lehnt %s ab', (_, override, code) => {
    const result = decide(
      replay([]),
      { type: 'AddBuilding', buildingId: 'b', outline: rectangle, ...override },
      0,
    );
    expect(!result.ok && result.rejection.code).toBe(code);
  });

  it('lässt sich verschieben, ändern und entfernen', () => {
    const game = new Game();
    game.execute(
      { type: 'AddBuilding', buildingId: 'b', outline: rectangle, storeys: 2, name: 'Schule' },
      0,
    );
    game.execute({ type: 'MoveBuilding', buildingId: 'b', offset: { x: 5, y: -2 } }, 1);
    game.execute({ type: 'ChangeBuilding', buildingId: 'b', storeys: 4 }, 2);

    expect(game.state.buildings['b']).toEqual({
      id: 'b',
      outline: [
        { x: 5, y: -2 },
        { x: 15, y: -2 },
        { x: 15, y: 4 },
        { x: 5, y: 4 },
      ],
      storeys: 4,
      name: 'Schule',
    });

    // Ein leerer Name entfernt den Namen.
    game.execute({ type: 'ChangeBuilding', buildingId: 'b', name: '' }, 3);
    expect(game.state.buildings['b']).not.toHaveProperty('name');
    expect(replay(game.events)).toEqual(game.state);

    game.execute({ type: 'RemoveBuilding', buildingId: 'b' }, 4);
    expect(game.state.buildings).toEqual({});
  });

  it('lehnt Befehle für unbekannte Gebäude ab', () => {
    for (const command of [
      { type: 'MoveBuilding', buildingId: 'x', offset: { x: 1, y: 1 } },
      { type: 'ChangeBuilding', buildingId: 'x', storeys: 2 },
      { type: 'RemoveBuilding', buildingId: 'x' },
    ] as const) {
      expect(decide(replay([]), command, 0)).toEqual({
        ok: false,
        rejection: { code: 'building-not-found', buildingId: 'x' },
      });
    }
  });
});
