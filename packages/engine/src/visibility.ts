import type { GameState, SituationObject } from './state';

/**
 * Spielstand, wie ihn die Übenden sehen dürfen – z. B. im Präsentationsmodus auf dem Beamer.
 * Lageobjekte, die nur die Übungsleitung sieht, werden entfernt. Erkundete und für alle
 * freigegebene Objekte bleiben, ebenso alle Einheiten.
 *
 * Gefiltert wird beim Absender: Was hier herausfällt, verlässt das Fenster der Übungsleitung nie.
 * Mit dem Mehrspieler-Server gilt später dasselbe je Rolle.
 */
export function presentationState(state: GameState): GameState {
  const situationObjects: Record<string, SituationObject> = {};
  for (const object of Object.values(state.situationObjects)) {
    if (object.visibility !== 'director') situationObjects[object.id] = object;
  }
  return { ...state, situationObjects };
}
