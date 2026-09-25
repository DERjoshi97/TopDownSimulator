import type { GameEvent } from './events';
import { initialState, type GameState } from './state';

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
  }
}

/** Berechnet den Spielstand aus einer Liste von Ereignissen – z. B. beim Laden oder in der Nachbesprechung. */
export function replay(events: readonly GameEvent[], from: GameState = initialState): GameState {
  return events.reduce(applyEvent, from);
}
