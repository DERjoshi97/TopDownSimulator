import type { GameEvent } from './events';
import {
  initialState,
  type GameState,
  type SituationObject,
  type SituationObjectId,
} from './state';

/**
 * Wendet ein Ereignis auf den Spielstand an und gibt einen *neuen* Spielstand zurück.
 * Der alte bleibt unverändert – so lässt sich jeder frühere Stand aufheben oder vergleichen.
 * Hier wird nichts mehr geprüft: Ereignisse sind bereits von `decide` geprüfte Tatsachen.
 */
export function applyEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'UnitPlaced':
      return {
        ...state,
        units: {
          ...state.units,
          [event.unitId]: {
            id: event.unitId,
            unitType: event.unitType,
            position: event.position,
            rotation: event.rotation,
          },
        },
      };

    case 'UnitMoved': {
      const unit = state.units[event.unitId];
      if (!unit) return state;
      return { ...state, units: { ...state.units, [unit.id]: { ...unit, position: event.to } } };
    }

    case 'UnitRotated': {
      const unit = state.units[event.unitId];
      if (!unit) return state;
      return {
        ...state,
        units: { ...state.units, [unit.id]: { ...unit, rotation: event.rotation } },
      };
    }

    case 'UnitRemoved': {
      // Erst kopieren, dann aus der Kopie löschen – der alte Zustand bleibt so unangetastet.
      const units = { ...state.units };
      delete units[event.unitId];
      return { ...state, units };
    }

    case 'SituationObjectPlaced':
      return withSituationObject(state, {
        id: event.objectId,
        objectType: event.objectType,
        position: event.position,
        rotation: event.rotation,
        ...(event.radius !== undefined && { radius: event.radius }),
        visibility: event.visibility,
      });

    case 'SituationObjectMoved':
      return updateSituationObject(state, event.objectId, { position: event.to });

    case 'SituationObjectRotated':
      return updateSituationObject(state, event.objectId, { rotation: event.rotation });

    case 'SituationObjectResized':
      return updateSituationObject(state, event.objectId, { radius: event.radius });

    case 'SituationObjectVisibilityChanged':
      return updateSituationObject(state, event.objectId, { visibility: event.visibility });

    case 'SituationObjectRemoved': {
      const situationObjects = { ...state.situationObjects };
      delete situationObjects[event.objectId];
      return { ...state, situationObjects };
    }
  }
}

function withSituationObject(state: GameState, object: SituationObject): GameState {
  return { ...state, situationObjects: { ...state.situationObjects, [object.id]: object } };
}

/** Ändert einzelne Felder eines Lageobjekts. Unbekannte IDs lassen den Zustand unverändert. */
function updateSituationObject(
  state: GameState,
  objectId: SituationObjectId,
  changes: Partial<Omit<SituationObject, 'id'>>,
): GameState {
  const object = state.situationObjects[objectId];
  return object ? withSituationObject(state, { ...object, ...changes }) : state;
}

/** Berechnet den Spielstand aus einer Liste von Ereignissen – z. B. beim Laden oder in der Nachbesprechung. */
export function replay(events: readonly GameEvent[], from: GameState = initialState): GameState {
  return events.reduce(applyEvent, from);
}
