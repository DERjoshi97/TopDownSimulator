import { describe, expect, it } from 'vitest';
import { Game } from './game';

describe('Einsatzuhr', () => {
  it('beginnt angehalten in Echtzeit', () => {
    expect(new Game().state.clock).toEqual({ running: false, speed: 1 });
  });

  it('lässt sich starten, anhalten und beschleunigen', () => {
    const game = new Game();
    game.execute({ type: 'ResumeClock' }, 0);
    game.execute({ type: 'SetClockSpeed', speed: 5 }, 10_000);
    game.execute({ type: 'PauseClock' }, 60_000);

    expect(game.state.clock).toEqual({ running: false, speed: 5 });
    expect(game.events.map((e) => [e.type, e.exerciseTime])).toEqual([
      ['ClockResumed', 0],
      ['ClockSpeedChanged', 10_000],
      ['ClockPaused', 60_000],
    ]);
  });

  it('lehnt doppeltes Anhalten und Starten ab', () => {
    const game = new Game();
    expect(game.execute({ type: 'PauseClock' }, 0)).toEqual({
      ok: false,
      rejection: { code: 'clock-already-paused' },
    });
    game.execute({ type: 'ResumeClock' }, 0);
    expect(game.execute({ type: 'ResumeClock' }, 0)).toEqual({
      ok: false,
      rejection: { code: 'clock-already-running' },
    });
  });

  it.each([0, -2, NaN, Infinity])('lehnt Zeitraffer %s ab', (speed) => {
    expect(new Game().execute({ type: 'SetClockSpeed', speed }, 0)).toEqual({
      ok: false,
      rejection: { code: 'invalid-speed' },
    });
  });
});
