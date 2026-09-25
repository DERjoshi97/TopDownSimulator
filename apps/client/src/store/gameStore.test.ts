import { describe, expect, it } from 'vitest';
import { createGameStore } from './gameStore';

describe('gameStore', () => {
  it('führt Befehle mit der Übungszeit seit Start aus', () => {
    let clock = 1_000_000;
    const store = createGameStore(undefined, () => clock);

    clock += 90_000;
    store
      .getState()
      .execute({ type: 'PlaceUnit', unitId: 'hlf-1', unitType: 'HLF', position: { x: 0, y: 0 } });

    const { state, events } = store.getState();
    expect(state.units['hlf-1']).toBeDefined();
    expect(events).toHaveLength(1);
    expect(events[0]?.exerciseTime).toBe(90_000);
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
