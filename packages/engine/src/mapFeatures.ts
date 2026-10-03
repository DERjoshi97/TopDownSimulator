import { isFiniteVec2, translatePoints, type Vec2 } from './geometry';
import { hydrantTypes, type MapFeature, type MapFeatureChanges } from './state';

// Regeln für Kartenelemente (Straßen, Hydranten, Beschriftungen) an einer Stelle,
// damit `decide` und das Laden von Übungsdateien dasselbe prüfen.

/** Längster Straßenname, z. B. "Bürgermeister-Müller-Straße". */
const MAX_NAME_LENGTH = 60;
/** Längste Beschriftung – ein kurzer Hinweis, kein Absatz. */
const MAX_TEXT_LENGTH = 80;
/** Fahrbahnbreite in Metern: vom Fußweg bis zur mehrspurigen Straße. */
const MIN_ROAD_WIDTH = 1;
const MAX_ROAD_WIDTH = 50;
/** Kürzeste Straße in Metern, damit versehentliche Doppelklicks keine Straße ergeben. */
const MIN_ROAD_LENGTH = 1;

/** Name des ersten ungültigen Feldes – oder `undefined`, wenn das Element gültig ist. */
export function invalidMapFeatureField(feature: MapFeature): string | undefined {
  if (typeof feature.id !== 'string' || feature.id === '') return 'id';
  switch (feature.kind) {
    case 'road':
      if (
        !Array.isArray(feature.path) ||
        feature.path.length < 2 ||
        !feature.path.every(isFiniteVec2) ||
        pathLength(feature.path) < MIN_ROAD_LENGTH
      ) {
        return 'path';
      }
      if (!isNumberBetween(feature.width, MIN_ROAD_WIDTH, MAX_ROAD_WIDTH)) return 'width';
      if (feature.name !== undefined && !isText(feature.name, MAX_NAME_LENGTH)) return 'name';
      return undefined;
    case 'hydrant':
      if (!isFiniteVec2(feature.position)) return 'position';
      if (!hydrantTypes.includes(feature.hydrantType)) return 'hydrantType';
      return undefined;
    case 'label':
      if (!isFiniteVec2(feature.position)) return 'position';
      if (!isText(feature.text, MAX_TEXT_LENGTH)) return 'text';
      return undefined;
    default:
      return 'kind';
  }
}

/**
 * Wendet Änderungen auf ein Kartenelement an. Liefert das neue Element oder den Namen des
 * Feldes, das nicht passt (z. B. eine Breite für einen Hydranten).
 */
export function changeMapFeature(
  feature: MapFeature,
  changes: MapFeatureChanges,
): MapFeature | { readonly invalidField: string } {
  const allowed: Record<MapFeature['kind'], readonly (keyof MapFeatureChanges)[]> = {
    road: ['width', 'name'],
    hydrant: ['hydrantType'],
    label: ['text'],
  };
  for (const key of Object.keys(changes) as (keyof MapFeatureChanges)[]) {
    if (changes[key] !== undefined && !allowed[feature.kind].includes(key)) {
      return { invalidField: key };
    }
  }

  let changed: MapFeature;
  switch (feature.kind) {
    case 'road': {
      const name = changes.name === undefined ? feature.name : changes.name.trim();
      changed = {
        kind: 'road',
        id: feature.id,
        path: feature.path,
        width: changes.width ?? feature.width,
        ...(name && { name }),
      };
      break;
    }
    case 'hydrant':
      changed = { ...feature, hydrantType: changes.hydrantType ?? feature.hydrantType };
      break;
    case 'label':
      changed = { ...feature, text: changes.text?.trim() ?? feature.text };
      break;
  }
  const invalidField = invalidMapFeatureField(changed);
  return invalidField ? { invalidField } : changed;
}

/** Verschiebt ein Kartenelement um `offset`. */
export function translateMapFeature(feature: MapFeature, offset: Vec2): MapFeature {
  if (feature.kind === 'road') return { ...feature, path: translatePoints(feature.path, offset) };
  return {
    ...feature,
    position: { x: feature.position.x + offset.x, y: feature.position.y + offset.y },
  };
}

/** Gesamtlänge eines Linienzugs in Metern. */
export function pathLength(path: readonly Vec2[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
  }
  return length;
}

function isNumberBetween(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isText(value: unknown, maxLength: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}
