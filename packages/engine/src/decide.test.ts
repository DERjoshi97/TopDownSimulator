import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import { decide } from './decide';

// Ausgangslage für die meisten Tests: ein HLF steht bei (10|20) und zeigt nach Osten.
const withHlf = replay([
  {
    type: 'UnitPlaced',
    exerciseTime: 0,
    unitId: 'hlf-1',
    unitType: 'HLF',
    position: { x: 10, y: 20 },
    rotation: 90,
  },
]);

describe('decide: PlaceUnit', () => {
  it('erzeugt UnitPlaced mit Drehung 0 als Standard', () => {
    const result = decide(
      withHlf,
      { type: 'PlaceUnit', unitId: 'rtw-1', unitType: 'RTW', position: { x: 0, y: 0 } },
      5_000,
    );
    expect(result).toEqual({
      ok: true,
      events: [
        {
          type: 'UnitPlaced',
          exerciseTime: 5_000,
          unitId: 'rtw-1',
          unitType: 'RTW',
          position: { x: 0, y: 0 },
          rotation: 0,
        },
      ],
    });
  });

  it('normalisiert die Drehung', () => {
    const result = decide(
      withHlf,
      {
        type: 'PlaceUnit',
        unitId: 'rtw-1',
        unitType: 'RTW',
        position: { x: 0, y: 0 },
        rotation: -90,
      },
      0,
    );
    expect(result.ok && result.events[0]).toMatchObject({ rotation: 270 });
  });

  it('lehnt eine bereits vergebene ID ab', () => {
    const result = decide(
      withHlf,
      { type: 'PlaceUnit', unitId: 'hlf-1', unitType: 'HLF', position: { x: 0, y: 0 } },
      0,
    );
    expect(result).toEqual({
      ok: false,
      rejection: { code: 'unit-already-exists', unitId: 'hlf-1' },
    });
  });

  it('lehnt einen leeren Einheitentyp ab', () => {
    const result = decide(
      withHlf,
      { type: 'PlaceUnit', unitId: 'x', unitType: '  ', position: { x: 0, y: 0 } },
      0,
    );
    expect(result).toEqual({ ok: false, rejection: { code: 'invalid-unit-type' } });
  });

  it('lehnt ungültige Positionen und Drehungen ab', () => {
    const badPosition = decide(
      withHlf,
      { type: 'PlaceUnit', unitId: 'x', unitType: 'LF', position: { x: NaN, y: 0 } },
      0,
    );
    const badRotation = decide(
      withHlf,
      {
        type: 'PlaceUnit',
        unitId: 'x',
        unitType: 'LF',
        position: { x: 0, y: 0 },
        rotation: Infinity,
      },
      0,
    );
    expect(badPosition).toEqual({ ok: false, rejection: { code: 'invalid-position' } });
    expect(badRotation).toEqual({ ok: false, rejection: { code: 'invalid-rotation' } });
  });
});

describe('decide: MoveUnit', () => {
  it('erzeugt UnitMoved mit alter und neuer Position', () => {
    const result = decide(
      withHlf,
      { type: 'MoveUnit', unitId: 'hlf-1', position: { x: 50, y: 60 } },
      1_000,
    );
    expect(result).toEqual({
      ok: true,
      events: [
        {
          type: 'UnitMoved',
          exerciseTime: 1_000,
          unitId: 'hlf-1',
          from: { x: 10, y: 20 },
          to: { x: 50, y: 60 },
        },
      ],
    });
  });

  it('lehnt unbekannte Einheiten ab', () => {
    const result = decide(
      withHlf,
      { type: 'MoveUnit', unitId: 'gibt-es-nicht', position: { x: 0, y: 0 } },
      0,
    );
    expect(result).toEqual({
      ok: false,
      rejection: { code: 'unit-not-found', unitId: 'gibt-es-nicht' },
    });
  });

  it('lehnt ungültige Positionen ab', () => {
    const result = decide(
      withHlf,
      { type: 'MoveUnit', unitId: 'hlf-1', position: { x: 0, y: -Infinity } },
      0,
    );
    expect(result).toEqual({ ok: false, rejection: { code: 'invalid-position' } });
  });
});

describe('decide: RotateUnit', () => {
  it('erzeugt UnitRotated mit normalisierter Drehung', () => {
    const result = decide(withHlf, { type: 'RotateUnit', unitId: 'hlf-1', rotation: 400 }, 0);
    expect(result.ok && result.events[0]).toMatchObject({ type: 'UnitRotated', rotation: 40 });
  });

  it('lehnt unbekannte Einheiten ab', () => {
    const result = decide(withHlf, { type: 'RotateUnit', unitId: 'x', rotation: 0 }, 0);
    expect(result.ok).toBe(false);
  });
});

describe('decide: RemoveUnit', () => {
  it('erzeugt UnitRemoved', () => {
    const result = decide(withHlf, { type: 'RemoveUnit', unitId: 'hlf-1' }, 2_000);
    expect(result).toEqual({
      ok: true,
      events: [{ type: 'UnitRemoved', exerciseTime: 2_000, unitId: 'hlf-1' }],
    });
  });

  it('lehnt unbekannte Einheiten ab', () => {
    const result = decide(withHlf, { type: 'RemoveUnit', unitId: 'x' }, 0);
    expect(result).toEqual({ ok: false, rejection: { code: 'unit-not-found', unitId: 'x' } });
  });
});
