import { create } from 'zustand';
import { Game, type Command, type DecideResult, type GameEvent, type GameState } from '@tds/engine';

interface GameStore {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  /** Zeitpunkt (Date.now()) des Übungsbeginns. Pausieren folgt mit der Einsatzuhr. */
  readonly startedAt: number;
  /** Einziger Weg, den Spielstand zu ändern: Befehl an die Engine geben. */
  readonly execute: (command: Command) => DecideResult;
}

/**
 * Erzeugt einen Store rund um eine `Game`-Instanz.
 * Die Engine rechnet, der Store sorgt nur dafür, dass React und Karte von Änderungen erfahren.
 * `now` ist austauschbar, damit Tests eine feste Uhr verwenden können.
 */
export function createGameStore(game = new Game(), now: () => number = Date.now) {
  return create<GameStore>()((set, get) => ({
    state: game.state,
    events: game.events,
    startedAt: now(),
    execute: (command) => {
      const result = game.execute(command, now() - get().startedAt);
      if (result.ok) {
        // Neue Array-Kopie, damit React die Änderung erkennt (gleiche Referenz = „nichts geändert“).
        set({ state: game.state, events: [...game.events] });
      }
      return result;
    },
  }));
}

export const useGameStore = createGameStore();
