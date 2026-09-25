import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import type { GameEvent } from './events';
import { initialState } from './state';

const placed: GameEvent = {
  type: 'UnitPlaced',
  exerciseTime: 0,
  unitId: 'hlf-1',
  unitType: 'HLF',
  position: { x: 10, y: 20 },
  rotation: 0,
};

describe('applyEvent', () => {
  it('fügt eine Einheit hinzu', () => {
    const state = applyEvent(initialState, placed);
    expect(state.units['hlf-1']).toEqual({
      id: 'hlf-1',
      unitType: 'HLF',
      position: { x: 10, y: 20 },
      rotation: 0,
    });
  });

  it('verändert den bisherigen Zustand nicht', () => {
    const before = applyEvent(initialState, placed);
    applyEvent(before, { type: 'UnitRemoved', exerciseTime: 1, unitId: 'hlf-1' });
    expect(initialState.units).toEqual({});
    expect(before.units['hlf-1']).toBeDefined();
  });
});

describe('replay', () => {
  it('ergibt aus allen Ereignissen den aktuellen Stand', () => {
    const state = replay([
      placed,
      {
        type: 'UnitMoved',
        exerciseTime: 1_000,
        unitId: 'hlf-1',
        from: { x: 10, y: 20 },
        to: { x: 30, y: 40 },
      },
      { type: 'UnitRotated', exerciseTime: 2_000, unitId: 'hlf-1', rotation: 180 },
    ]);
    expect(state.units['hlf-1']).toMatchObject({ position: { x: 30, y: 40 }, rotation: 180 });
  });

  it('entfernt Einheiten wieder', () => {
    const state = replay([placed, { type: 'UnitRemoved', exerciseTime: 1_000, unitId: 'hlf-1' }]);
    expect(state.units).toEqual({});
  });

  it('liefert den Stand zu einem früheren Zeitpunkt, wenn man nur einen Teil abspielt', () => {
    const events: GameEvent[] = [
      placed,
      {
        type: 'UnitMoved',
        exerciseTime: 60_000,
        unitId: 'hlf-1',
        from: { x: 10, y: 20 },
        to: { x: 99, y: 99 },
      },
    ];
    const atStart = replay(events.filter((e) => e.exerciseTime < 60_000));
    expect(atStart.units['hlf-1']?.position).toEqual({ x: 10, y: 20 });
  });
});
