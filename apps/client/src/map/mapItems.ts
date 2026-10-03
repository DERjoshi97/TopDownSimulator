import { findSituationObjectType, findUnitType } from '@tds/catalog';
import type { GameState, SituationObject, Unit, Vec2 } from '@tds/engine';

/** Verweis auf etwas, das auf der Karte liegt – eine Einheit oder ein Lageobjekt. */
export interface MapItemRef {
  readonly kind: 'unit' | 'situationObject';
  readonly id: string;
}

/** Größe eines Zeichens in Metern (ungedreht): `width` waagerecht, `height` senkrecht. */
export interface SymbolSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Einheitliche Sicht der Kartenansicht auf Einheiten und Lageobjekte.
 * So muss die Karte Auswahl, Ziehen, Drehen und Trefferprüfung nur einmal kennen.
 */
export interface MapItem {
  readonly ref: MapItemRef;
  /** Typ-Kennung aus dem Katalog, z. B. "HLF" oder "fire". Bestimmt das Zeichen. */
  readonly symbolType: string;
  readonly position: Vec2;
  readonly rotation: number;
  /** Maßstäbliche Größe des Zeichens in Metern – es wächst und schrumpft mit dem Zoom. */
  readonly size: SymbolSize;
  /** Ausdehnung in Metern bei Flächen (Feuer, Rauch …). Das Zeichen sitzt in der Mitte. */
  readonly radius?: number;
  /** Einstellbare Länge in Metern, z. B. bei einer Absperrung. Entspricht dann `size.width`. */
  readonly length?: number;
  readonly rotatable: boolean;
  /** Halbtransparent zeichnen, z. B. weil nur die Übungsleitung das Objekt sieht. */
  readonly dimmed: boolean;
}

/** Für Typen ohne Maße im Katalog. */
const UNKNOWN_SIZE: SymbolSize = { width: 2, height: 2 };

/** Zeichen in der Mitte einer Fläche. */
const AREA_SIGN_SIZE: SymbolSize = { width: 2.4, height: 2.4 };

export function unitItem(unit: Unit): MapItem {
  const definition = findUnitType(unit.unitType);
  return {
    ref: { kind: 'unit', id: unit.id },
    symbolType: unit.unitType,
    position: unit.position,
    rotation: unit.rotation,
    size: definition ? { width: definition.length, height: definition.width } : UNKNOWN_SIZE,
    rotatable: true,
    dimmed: false,
  };
}

export function situationObjectItem(object: SituationObject): MapItem {
  const isArea = object.radius !== undefined;
  const definition = findSituationObjectType(object.objectType);
  const catalogSize =
    definition?.length !== undefined && definition.width !== undefined
      ? { width: definition.length, height: definition.width }
      : UNKNOWN_SIZE;
  const size = isArea
    ? AREA_SIGN_SIZE
    : object.length !== undefined
      ? { width: object.length, height: catalogSize.height }
      : catalogSize;
  return {
    ref: { kind: 'situationObject', id: object.id },
    symbolType: object.objectType,
    position: object.position,
    // Flächen sind Kreise – eine Drehung hätte keine sichtbare Wirkung.
    rotation: isArea ? 0 : object.rotation,
    size,
    ...(isArea && { radius: object.radius }),
    ...(object.length !== undefined && { length: object.length }),
    rotatable: !isArea,
    dimmed: object.visibility === 'director',
  };
}

/**
 * Alle Objekte des Spielstands in Zeichenreihenfolge: zuerst die Lageobjekte, darüber die Einheiten.
 * Wer später kommt, liegt oben und wird beim Klicken zuerst getroffen.
 */
export function mapItemsFromState(state: GameState): MapItem[] {
  return [
    ...Object.values(state.situationObjects).map(situationObjectItem),
    ...Object.values(state.units).map(unitItem),
  ];
}

/** Sucht die Einheit oder das Lageobjekt zu einem Verweis im Spielstand. */
export function findMapItem(state: GameState, ref: MapItemRef | undefined): MapItem | undefined {
  if (!ref) return undefined;
  if (ref.kind === 'unit') {
    const unit = state.units[ref.id];
    return unit && unitItem(unit);
  }
  const object = state.situationObjects[ref.id];
  return object && situationObjectItem(object);
}

export function sameRef(a: MapItemRef, b: MapItemRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

/** Text-Schlüssel für Maps, z. B. "unit:hlf-1". */
export function refKey(ref: MapItemRef): string {
  return `${ref.kind}:${ref.id}`;
}

/** Ausgeschriebener Name aus dem Katalog, z. B. "Feuer". Unbekannte Typen zeigen ihre Kennung. */
export function typeName(kind: MapItemRef['kind'], typeId: string): string {
  const definition = kind === 'unit' ? findUnitType(typeId) : findSituationObjectType(typeId);
  return definition?.name ?? typeId;
}

export function isArea(item: MapItem): item is MapItem & { radius: number } {
  return item.radius !== undefined;
}
