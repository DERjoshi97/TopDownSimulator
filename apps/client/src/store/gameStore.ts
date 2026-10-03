import { create } from 'zustand';
import {
  Game,
  exerciseTimeAt,
  type ClockAnchor,
  type Command,
  type DecideResult,
  type GameEvent,
  type GameState,
} from '@tds/engine';

interface GameStore {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  /** Bezugspunkt der Einsatzuhr. Die aktuelle Übungszeit liefert `exerciseTime()`. */
  readonly clock: ClockAnchor;
  /** Übungszeit in Millisekunden – jetzt, nach der echten Uhrzeit. */
  readonly exerciseTime: () => number;
  /** Einziger Weg, den Spielstand zu ändern: Befehl an die Engine geben. */
  readonly execute: (command: Command) => DecideResult;
  /**
   * Ersetzt die laufende Übung durch eine gespeicherte. Die Uhr ist danach immer angehalten,
   * damit die Zeit nicht sofort weiterläuft, wenn mitten in der Übung gespeichert wurde.
   */
  readonly load: (events: readonly GameEvent[], exerciseTime: number) => void;
}

/**
 * Erzeugt einen Store rund um eine `Game`-Instanz.
 * Die Engine rechnet, der Store sorgt nur dafür, dass React und Karte von Änderungen erfahren,
 * und übersetzt die echte Uhrzeit in Übungszeit.
 * `now` ist austauschbar, damit Tests eine feste Uhr verwenden können.
 */
export function createGameStore(initialGame = new Game(), now: () => number = Date.now) {
  let game = initialGame;
  const anchorAt = (exerciseTime: number): ClockAnchor => ({
    exerciseTime,
    wallTime: now(),
    ...game.state.clock,
  });

  return create<GameStore>()((set, get) => ({
    state: game.state,
    events: game.events,
    clock: anchorAt(game.events.at(-1)?.exerciseTime ?? 0),
    exerciseTime: () => exerciseTimeAt(get().clock, now()),
    execute: (command) => {
      const exerciseTime = get().exerciseTime();
      const result = game.execute(command, exerciseTime);
      if (result.ok) {
        set({
          state: game.state,
          // Neue Array-Kopie, damit React die Änderung erkennt (gleiche Referenz = „nichts geändert“).
          events: [...game.events],
          // Neuer Bezugspunkt, damit Anhalten oder Zeitraffer ab genau jetzt gelten.
          clock: anchorAt(exerciseTime),
        });
      }
      return result;
    },
    load: (events, exerciseTime) => {
      game = new Game(events);
      if (game.state.clock.running) game.execute({ type: 'PauseClock' }, exerciseTime);
      set({ state: game.state, events: [...game.events], clock: anchorAt(exerciseTime) });
    },
  }));
}

export const useGameStore = createGameStore();
