/** Organisation, zu der eine Einheit gehört. Bestimmt die Farbe des taktischen Zeichens. */
export type Organization = 'fire' | 'ems';

/**
 * Grundzeichen des taktischen Zeichens (vereinfacht nach DV 102):
 * - `vehicle`: Fahrzeug – Rechteck mit zwei Rädern
 * - `team`: taktische Einheit in Truppstärke – Rechteck mit einem Punkt darüber
 */
export type SymbolShape = 'vehicle' | 'team';

export interface UnitTypeDefinition {
  /** Kennung und zugleich Beschriftung im Zeichen, z. B. "HLF". */
  readonly id: string;
  /** Ausgeschriebener Name, z. B. für Tooltips. */
  readonly name: string;
  readonly shape: SymbolShape;
  readonly organization: Organization;
}

export const unitTypes: readonly UnitTypeDefinition[] = [
  { id: 'HLF', name: 'Hilfeleistungslöschgruppenfahrzeug', shape: 'vehicle', organization: 'fire' },
  { id: 'LF', name: 'Löschgruppenfahrzeug', shape: 'vehicle', organization: 'fire' },
  { id: 'TLF', name: 'Tanklöschfahrzeug', shape: 'vehicle', organization: 'fire' },
  { id: 'DLK', name: 'Drehleiter mit Korb', shape: 'vehicle', organization: 'fire' },
  { id: 'ELW', name: 'Einsatzleitwagen', shape: 'vehicle', organization: 'fire' },
  { id: 'RTW', name: 'Rettungswagen', shape: 'vehicle', organization: 'ems' },
  { id: 'AT', name: 'Angriffstrupp', shape: 'team', organization: 'fire' },
  { id: 'WT', name: 'Wassertrupp', shape: 'team', organization: 'fire' },
  { id: 'ST', name: 'Schlauchtrupp', shape: 'team', organization: 'fire' },
];

const byId = new Map(unitTypes.map((t) => [t.id, t]));

export function findUnitType(id: string): UnitTypeDefinition | undefined {
  return byId.get(id);
}
