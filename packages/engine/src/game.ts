import { applyEvent, replay } from './apply';
import type { Command } from './commands';
import { decide, type DecideResult } from './decide';
import type { GameEvent } from './events';
import type { GameState } from './state';

/**
 * Hält eine laufende Übung zusammen: alle bisherigen Ereignisse und den daraus folgenden Spielstand.
 * Oberfläche und später der Mehrspieler-Server sprechen nur über `execute` mit der Engine.
 */
export class Game {
  #events: GameEvent[];
  #state: GameState;

  constructor(events: readonly GameEvent[] = []) {
    this.#events = [...events];
    this.#state = replay(this.#events);
  }

  get state(): GameState {
    return this.#state;
  }

  /** Alle Ereignisse in zeitlicher Reihenfolge (nur lesbar). */
  get events(): readonly GameEvent[] {
    return this.#events;
  }

  /** Prüft den Befehl und übernimmt bei Erfolg die entstandenen Ereignisse. */
  execute(command: Command, exerciseTime: number): DecideResult {
    const result = decide(this.#state, command, exerciseTime);
    if (result.ok) {
      for (const event of result.events) {
        this.#events.push(event);
        this.#state = applyEvent(this.#state, event);
      }
    }
    return result;
  }
}
