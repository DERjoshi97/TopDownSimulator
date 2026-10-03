import { findSituationObjectType, findUnitType } from '@tds/catalog';
import {
  pathLength,
  polygonCentroid,
  type Building,
  type GameState,
  type MapFeature,
  type SituationObject,
  type Unit,
  type Vec2,
} from '@tds/engine';

/** Verweis auf etwas, das auf der Karte liegt – eine Einheit, ein Lageobjekt oder ein Gebäude. */
export interface MapItemRef {
  readonly kind: 'unit' | 'situationObject' | 'building' | 'mapFeature';
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
  /**
   * Grundriss in Metern bei Gebäuden. `position` ist dann der Schwerpunkt; `size` spielt keine
   * Rolle, getroffen wird innerhalb des Grundrisses.
   */
  readonly outline?: readonly Vec2[];
  /** Verlauf in Metern bei Straßen; `pathWidth` ist die Fahrbahnbreite in Metern. */
  readonly path?: readonly Vec2[];
  readonly pathWidth?: number;
  /** Beschriftung, z. B. Name und Geschosszahl eines Gebäudes. */
  readonly caption?: string;
  /**
   * Feste Größe in Bildschirmpixeln statt maßstäblicher Größe – bei Beschriftungen, die beim
   * Zoomen lesbar bleiben sollen.
   */
  readonly screenSize?: SymbolSize;
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

export function buildingItem(building: Building): MapItem {
  const storeys = `${building.storeys} ${building.storeys === 1 ? 'Geschoss' : 'Geschosse'}`;
  return {
    ref: { kind: 'building', id: building.id },
    symbolType: 'building',
    position: polygonCentroid(building.outline),
    rotation: 0,
    size: { width: 0, height: 0 },
    outline: building.outline,
    caption: building.name ? `${building.name}\n${storeys}` : storeys,
    rotatable: false,
    dimmed: false,
  };
}

/** Hydranten sind klein – etwa so groß wie ihr Schild im Hydrantenplan. */
const HYDRANT_SIZE: SymbolSize = { width: 1.2, height: 1.2 };

/** Ungefähre Breite eines Zeichens der Beschriftungsschrift in Pixeln – für die Trefferfläche. */
const LABEL_CHAR_WIDTH_PX = 7;

export function mapFeatureItem(feature: MapFeature): MapItem {
  const ref: MapItemRef = { kind: 'mapFeature', id: feature.id };
  const base = { ref, rotation: 0, rotatable: false, dimmed: false };
  switch (feature.kind) {
    case 'road':
      return {
        ...base,
        symbolType: 'road',
        position: pointAlongPath(feature.path, 0.5),
        size: { width: 0, height: 0 },
        path: feature.path,
        pathWidth: feature.width,
        ...(feature.name && { caption: feature.name }),
      };
    case 'hydrant':
      return {
        ...base,
        symbolType: `hydrant-${feature.hydrantType}`,
        position: feature.position,
        size: HYDRANT_SIZE,
      };
    case 'label':
      return {
        ...base,
        symbolType: 'label',
        position: feature.position,
        size: { width: 0, height: 0 },
        caption: feature.text,
        screenSize: { width: feature.text.length * LABEL_CHAR_WIDTH_PX + 12, height: 20 },
      };
  }
}

/** Punkt auf einem Linienzug, `fraction` 0 = Anfang, 1 = Ende – z. B. für den Straßennamen. */
export function pointAlongPath(path: readonly Vec2[], fraction: number): Vec2 {
  const target = pathLength(path) * fraction;
  let walked = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + segment >= target && segment > 0) {
      const t = (target - walked) / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    walked += segment;
  }
  return path.at(-1) ?? { x: 0, y: 0 };
}

/**
 * Alle Objekte des Spielstands in Zeichenreihenfolge: zuunterst Straßen und Gebäude, darüber
 * Hydranten, Lageobjekte und Einheiten, ganz oben die Beschriftungen.
 * Wer später kommt, liegt oben und wird beim Klicken zuerst getroffen.
 */
export function mapItemsFromState(state: GameState): MapItem[] {
  const features = Object.values(state.mapFeatures);
  const ofKind = (kind: MapFeature['kind']) =>
    features.filter((f) => f.kind === kind).map(mapFeatureItem);
  return [
    ...ofKind('road'),
    ...Object.values(state.buildings).map(buildingItem),
    ...ofKind('hydrant'),
    ...Object.values(state.situationObjects).map(situationObjectItem),
    ...Object.values(state.units).map(unitItem),
    ...ofKind('label'),
  ];
}

/** Sucht die Einheit oder das Lageobjekt zu einem Verweis im Spielstand. */
export function findMapItem(state: GameState, ref: MapItemRef | undefined): MapItem | undefined {
  if (!ref) return undefined;
  if (ref.kind === 'unit') {
    const unit = state.units[ref.id];
    return unit && unitItem(unit);
  }
  if (ref.kind === 'building') {
    const building = state.buildings[ref.id];
    return building && buildingItem(building);
  }
  if (ref.kind === 'mapFeature') {
    const feature = state.mapFeatures[ref.id];
    return feature && mapFeatureItem(feature);
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
  if (kind === 'building') return 'Gebäude';
  if (kind === 'mapFeature') return MAP_FEATURE_NAMES[typeId] ?? typeId;
  const definition = kind === 'unit' ? findUnitType(typeId) : findSituationObjectType(typeId);
  return definition?.name ?? typeId;
}

/** Namen der Kartenelemente nach `symbolType`. */
const MAP_FEATURE_NAMES: Record<string, string> = {
  road: 'Straße',
  hydrant: 'Hydrant',
  'hydrant-underground': 'Unterflurhydrant',
  'hydrant-above-ground': 'Überflurhydrant',
  label: 'Beschriftung',
};

export function isArea(item: MapItem): item is MapItem & { radius: number } {
  return item.radius !== undefined;
}
