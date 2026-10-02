/**
 * Wie ein Lageobjekt auf der Karte Platz einnimmt:
 * - `area`: Fläche mit Radius in Metern, wächst beim Hereinzoomen mit (Feuer, Rauch, Gefahrstoff)
 * - `symbol`: drehbares Zeichen in fester Bildschirmgröße wie die Einheiten (Person, Absperrung)
 */
export type SituationObjectExtent = 'area' | 'symbol';

export interface SituationObjectTypeDefinition {
  /** Kennung, z. B. "fire". */
  readonly id: string;
  /** Anzeigename, z. B. "Feuer". */
  readonly name: string;
  readonly extent: SituationObjectExtent;
  /** Radius in Metern beim Platzieren, nur bei Flächen. */
  readonly defaultRadius?: number;
}

export const situationObjectTypes: readonly SituationObjectTypeDefinition[] = [
  { id: 'fire', name: 'Feuer', extent: 'area', defaultRadius: 3 },
  { id: 'smoke', name: 'Rauch', extent: 'area', defaultRadius: 6 },
  { id: 'hazardous-material', name: 'Gefahrstoff', extent: 'area', defaultRadius: 10 },
  { id: 'person', name: 'Person', extent: 'symbol' },
  { id: 'cordon', name: 'Absperrung', extent: 'symbol' },
];

const byId = new Map(situationObjectTypes.map((t) => [t.id, t]));

export function findSituationObjectType(id: string): SituationObjectTypeDefinition | undefined {
  return byId.get(id);
}
