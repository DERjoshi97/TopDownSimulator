/**
 * Wie ein Lageobjekt auf der Karte Platz einnimmt:
 * - `area`: Fläche mit einstellbarem Radius in Metern (Feuer, Rauch, Gefahrstoff)
 * - `symbol`: drehbares Zeichen mit festen Abmessungen wie die Einheiten (Person, Absperrung)
 *
 * Beides ist maßstäblich und wächst beim Hereinzoomen mit.
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
  /** Abmessungen in Metern, nur bei Symbolen. `length` waagerecht, `width` senkrecht. */
  readonly length?: number;
  readonly width?: number;
  /** Ist die Länge je Objekt einstellbar (z. B. Absperrung)? `length` ist dann der Startwert. */
  readonly adjustableLength?: boolean;
}

export const situationObjectTypes: readonly SituationObjectTypeDefinition[] = [
  { id: 'fire', name: 'Feuer', extent: 'area', defaultRadius: 3 },
  { id: 'smoke', name: 'Rauch', extent: 'area', defaultRadius: 6 },
  { id: 'hazardous-material', name: 'Gefahrstoff', extent: 'area', defaultRadius: 10 },
  { id: 'person', name: 'Person', extent: 'symbol', length: 0.6, width: 0.6 },
  {
    id: 'cordon',
    name: 'Absperrung',
    extent: 'symbol',
    length: 10,
    width: 0.3,
    adjustableLength: true,
  },
];

const byId = new Map(situationObjectTypes.map((t) => [t.id, t]));

export function findSituationObjectType(id: string): SituationObjectTypeDefinition | undefined {
  return byId.get(id);
}
