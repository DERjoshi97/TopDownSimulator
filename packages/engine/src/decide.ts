import type { Command } from './commands';
import type { GameEvent } from './events';
import { isFiniteVec2, normalizeRotation } from './geometry';
import type { GameState } from './state';

/**
 * Grund, warum ein Befehl abgelehnt wurde. Bewusst als Code und nicht als Text:
 * Die Oberfläche entscheidet, wie sie den Fehler anzeigt.
 */
export type Rejection =
  | { readonly code: 'unit-already-exists'; readonly unitId: string }
  | { readonly code: 'unit-not-found'; readonly unitId: string }
  | { readonly code: 'invalid-position' }
  | { readonly code: 'invalid-rotation' }
  | { readonly code: 'invalid-unit-type' };

export type DecideResult =
  | { readonly ok: true; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly rejection: Rejection };

const accept = (...events: GameEvent[]): DecideResult => ({ ok: true, events });
const reject = (rejection: Rejection): DecideResult => ({ ok: false, rejection });

/**
 * Prüft einen Befehl gegen den aktuellen Spielstand und liefert die daraus folgenden Ereignisse.
 * Verändert nichts – der Spielstand ändert sich erst, wenn die Ereignisse angewendet werden.
 */
export function decide(state: GameState, command: Command, exerciseTime: number): DecideResult {
  switch (command.type) {
    case 'PlaceUnit': {
      if (state.units[command.unitId]) {
        return reject({ code: 'unit-already-exists', unitId: command.unitId });
      }
      if (command.unitType.trim() === '') return reject({ code: 'invalid-unit-type' });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      const rotation = command.rotation ?? 0;
      if (!Number.isFinite(rotation)) return reject({ code: 'invalid-rotation' });
      return accept({
        type: 'UnitPlaced',
        exerciseTime,
        unitId: command.unitId,
        unitType: command.unitType,
        position: command.position,
        rotation: normalizeRotation(rotation),
      });
    }

    case 'MoveUnit': {
      const unit = state.units[command.unitId];
      if (!unit) return reject({ code: 'unit-not-found', unitId: command.unitId });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      return accept({
        type: 'UnitMoved',
        exerciseTime,
        unitId: unit.id,
        from: unit.position,
        to: command.position,
      });
    }

    case 'RotateUnit': {
      const unit = state.units[command.unitId];
      if (!unit) return reject({ code: 'unit-not-found', unitId: command.unitId });
      if (!Number.isFinite(command.rotation)) return reject({ code: 'invalid-rotation' });
      return accept({
        type: 'UnitRotated',
        exerciseTime,
        unitId: unit.id,
        rotation: normalizeRotation(command.rotation),
      });
    }

    case 'RemoveUnit': {
      if (!state.units[command.unitId]) {
        return reject({ code: 'unit-not-found', unitId: command.unitId });
      }
      return accept({ type: 'UnitRemoved', exerciseTime, unitId: command.unitId });
    }
  }
}
