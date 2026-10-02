import type { Command } from './commands';
import type { GameEvent } from './events';
import { isFiniteVec2, normalizeRotation } from './geometry';
import { visibilities, type GameState, type SituationObjectId } from './state';

/**
 * Grund, warum ein Befehl abgelehnt wurde. Bewusst als Code und nicht als Text:
 * Die Oberfläche entscheidet, wie sie den Fehler anzeigt.
 */
export type Rejection =
  | { readonly code: 'unit-already-exists'; readonly unitId: string }
  | { readonly code: 'unit-not-found'; readonly unitId: string }
  | { readonly code: 'invalid-position' }
  | { readonly code: 'invalid-rotation' }
  | { readonly code: 'invalid-unit-type' }
  | { readonly code: 'situation-object-already-exists'; readonly objectId: SituationObjectId }
  | { readonly code: 'situation-object-not-found'; readonly objectId: SituationObjectId }
  | { readonly code: 'invalid-object-type' }
  | { readonly code: 'invalid-radius' }
  /** Größe ändern geht nur bei Flächen, die schon einen Radius haben. */
  | { readonly code: 'not-resizable'; readonly objectId: SituationObjectId }
  | { readonly code: 'invalid-visibility' };

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

    case 'PlaceSituationObject': {
      if (state.situationObjects[command.objectId]) {
        return reject({ code: 'situation-object-already-exists', objectId: command.objectId });
      }
      if (command.objectType.trim() === '') return reject({ code: 'invalid-object-type' });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      const rotation = command.rotation ?? 0;
      if (!Number.isFinite(rotation)) return reject({ code: 'invalid-rotation' });
      if (command.radius !== undefined && !isValidRadius(command.radius)) {
        return reject({ code: 'invalid-radius' });
      }
      const visibility = command.visibility ?? 'everyone';
      if (!visibilities.includes(visibility)) return reject({ code: 'invalid-visibility' });
      return accept({
        type: 'SituationObjectPlaced',
        exerciseTime,
        objectId: command.objectId,
        objectType: command.objectType,
        position: command.position,
        rotation: normalizeRotation(rotation),
        // Nur übernehmen, wenn vorhanden – sonst stünde `radius: undefined` im Ereignis.
        ...(command.radius !== undefined && { radius: command.radius }),
        visibility,
      });
    }

    case 'MoveSituationObject': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      return accept({
        type: 'SituationObjectMoved',
        exerciseTime,
        objectId: object.id,
        from: object.position,
        to: command.position,
      });
    }

    case 'RotateSituationObject': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (!Number.isFinite(command.rotation)) return reject({ code: 'invalid-rotation' });
      return accept({
        type: 'SituationObjectRotated',
        exerciseTime,
        objectId: object.id,
        rotation: normalizeRotation(command.rotation),
      });
    }

    case 'ResizeSituationObject': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (object.radius === undefined)
        return reject({ code: 'not-resizable', objectId: object.id });
      if (!isValidRadius(command.radius)) return reject({ code: 'invalid-radius' });
      return accept({
        type: 'SituationObjectResized',
        exerciseTime,
        objectId: object.id,
        radius: command.radius,
      });
    }

    case 'ChangeSituationObjectVisibility': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (!visibilities.includes(command.visibility)) return reject({ code: 'invalid-visibility' });
      return accept({
        type: 'SituationObjectVisibilityChanged',
        exerciseTime,
        objectId: object.id,
        visibility: command.visibility,
      });
    }

    case 'RemoveSituationObject': {
      if (!state.situationObjects[command.objectId]) {
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      }
      return accept({ type: 'SituationObjectRemoved', exerciseTime, objectId: command.objectId });
    }
  }
}

function isValidRadius(radius: number): boolean {
  return Number.isFinite(radius) && radius > 0;
}
