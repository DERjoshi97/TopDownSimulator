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
  /**
   * Abmessungen in Metern, ungefähre Richtwerte. Das Zeichen wird maßstäblich in dieser Größe
   * gezeichnet: `length` waagerecht, `width` senkrecht (bei Drehung 0).
   */
  readonly length: number;
  readonly width: number;
}

export const unitTypes: readonly UnitTypeDefinition[] = [
  {
    id: 'HLF',
    name: 'Hilfeleistungslöschgruppenfahrzeug',
    shape: 'vehicle',
    organization: 'fire',
    length: 8.5,
    width: 2.5,
  },
  {
    id: 'LF',
    name: 'Löschgruppenfahrzeug',
    shape: 'vehicle',
    organization: 'fire',
    length: 8,
    width: 2.5,
  },
  {
    id: 'TLF',
    name: 'Tanklöschfahrzeug',
    shape: 'vehicle',
    organization: 'fire',
    length: 7.5,
    width: 2.5,
  },
  {
    id: 'DLK',
    name: 'Drehleiter mit Korb',
    shape: 'vehicle',
    organization: 'fire',
    length: 10,
    width: 2.5,
  },
  {
    id: 'ELW',
    name: 'Einsatzleitwagen',
    shape: 'vehicle',
    organization: 'fire',
    length: 5.5,
    width: 2.1,
  },
  {
    id: 'RTW',
    name: 'Rettungswagen',
    shape: 'vehicle',
    organization: 'ems',
    length: 6.5,
    width: 2.3,
  },
  { id: 'AT', name: 'Angriffstrupp', shape: 'team', organization: 'fire', length: 2.4, width: 1.4 },
  { id: 'WT', name: 'Wassertrupp', shape: 'team', organization: 'fire', length: 2.4, width: 1.4 },
  { id: 'ST', name: 'Schlauchtrupp', shape: 'team', organization: 'fire', length: 2.4, width: 1.4 },
];

const byId = new Map(unitTypes.map((t) => [t.id, t]));

export function findUnitType(id: string): UnitTypeDefinition | undefined {
  return byId.get(id);
}
