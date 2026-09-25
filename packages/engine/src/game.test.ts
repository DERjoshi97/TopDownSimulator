import { describe, expect, it } from 'vitest';
import { Game } from './game';

describe('Game', () => {
  it('startet leer', () => {
    const game = new Game();
    expect(game.state.units).toEqual({});
    expect(game.events).toEqual([]);
  });

  it('übernimmt Ereignisse erfolgreicher Befehle', () => {
    const game = new Game();
    game.execute(
      { type: 'PlaceUnit', unitId: 'lf-1', unitType: 'LF', position: { x: 0, y: 0 } },
      0,
    );
    game.execute({ type: 'MoveUnit', unitId: 'lf-1', position: { x: 5, y: 5 } }, 3_000);

    expect(game.events.map((e) => e.type)).toEqual(['UnitPlaced', 'UnitMoved']);
    expect(game.state.units['lf-1']?.position).toEqual({ x: 5, y: 5 });
  });

  it('ändert bei abgelehnten Befehlen nichts', () => {
    const game = new Game();
    const result = game.execute({ type: 'RemoveUnit', unitId: 'x' }, 0);

    expect(result.ok).toBe(false);
    expect(game.events).toEqual([]);
  });

  it('stellt den Spielstand aus gespeicherten Ereignissen wieder her', () => {
    const original = new Game();
    original.execute(
      { type: 'PlaceUnit', unitId: 'dlk-1', unitType: 'DLK', position: { x: 1, y: 2 } },
      0,
    );
    original.execute({ type: 'RotateUnit', unitId: 'dlk-1', rotation: 45 }, 1_000);

    const restored = new Game(original.events);
    expect(restored.state).toEqual(original.state);
  });
});
