import { describe, expect, it } from 'vitest';
import { createGameStore } from './gameStore';

const placeHlf = {
  type: 'PlaceUnit',
  unitId: 'hlf-1',
  unitType: 'HLF',
  position: { x: 0, y: 0 },
} as const;

describe('gameStore', () => {
  it('steht vor dem Start bei 0 – auch für Befehle', () => {
    let clock = 1_000_000;
    const store = createGameStore(undefined, () => clock);

    clock += 90_000;
    store.getState().execute(placeHlf);

    expect(store.getState().exerciseTime()).toBe(0);
    expect(store.getState().events[0]?.exerciseTime).toBe(0);
  });

  it('versieht Befehle nach dem Start mit der Übungszeit', () => {
    let clock = 1_000_000;
    const store = createGameStore(undefined, () => clock);

    store.getState().execute({ type: 'ResumeClock' });
    clock += 90_000;
    store.getState().execute(placeHlf);

    const { state, events } = store.getState();
    expect(state.units['hlf-1']).toBeDefined();
    expect(events.at(-1)?.exerciseTime).toBe(90_000);
  });

  it('rechnet Anhalten und Zeitraffer ab dem Moment des Befehls', () => {
    let clock = 0;
    const store = createGameStore(undefined, () => clock);
    const { execute } = store.getState();

    execute({ type: 'ResumeClock' });
    clock += 10_000; // 10 s in Echtzeit
    execute({ type: 'SetClockSpeed', speed: 6 });
    clock += 10_000; // 10 s im 6-fachen Zeitraffer = 60 s
    execute({ type: 'PauseClock' });
    clock += 3_600_000; // angehalten – zählt nicht

    expect(store.getState().exerciseTime()).toBe(70_000);
  });

  it('lädt eine gespeicherte Übung und hält die Uhr an', () => {
    let clock = 0;
    const store = createGameStore(undefined, () => clock);
    store.getState().execute(placeHlf);

    store.getState().load(
      [
        { type: 'ClockResumed', exerciseTime: 0 },
        {
          type: 'UnitPlaced',
          exerciseTime: 120_000,
          unitId: 'dlk-1',
          unitType: 'DLK',
          position: { x: 0, y: 0 },
          rotation: 0,
        },
      ],
      150_000,
    );
    clock += 60_000;

    const { state, events, exerciseTime } = store.getState();
    expect(Object.keys(state.units)).toEqual(['dlk-1']);
    expect(state.clock.running).toBe(false);
    // Gespeichert wurde bei laufender Uhr 30 s nach dem letzten Ereignis – dort wird angehalten.
    expect(events.at(-1)).toEqual({ type: 'ClockPaused', exerciseTime: 150_000 });
    expect(exerciseTime()).toBe(150_000);
  });

  it('setzt nach dem Laden mit der gespeicherten Zeit fort', () => {
    let clock = 0;
    const store = createGameStore(undefined, () => clock);
    store.getState().load(
      [
        { type: 'ClockResumed', exerciseTime: 0 },
        { type: 'ClockPaused', exerciseTime: 300_000 },
      ],
      300_000,
    );

    store.getState().execute({ type: 'ResumeClock' });
    clock += 10_000;
    expect(store.getState().exerciseTime()).toBe(310_000);
  });

  it('benachrichtigt nur bei Erfolg', () => {
    const store = createGameStore();
    let notifications = 0;
    store.subscribe(() => notifications++);

    const result = store.getState().execute({ type: 'RemoveUnit', unitId: 'gibt-es-nicht' });

    expect(result.ok).toBe(false);
    expect(notifications).toBe(0);
  });
});
