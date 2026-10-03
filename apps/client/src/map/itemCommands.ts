import { findSituationObjectType } from '@tds/catalog';
import type { Command, Vec2 } from '@tds/engine';
import type { PlacementTool } from '../store/toolStore';
import type { MapItemRef } from './mapItems';

// Übersetzt Aktionen auf der Karte in Engine-Befehle. Die Karte selbst unterscheidet nicht
// zwischen Einheiten, Lageobjekten und Gebäuden – die Engine schon, daher passiert die
// Zuordnung hier.

/** Geschosszahl neu gezeichneter Gebäude – das typische Wohnhaus der Übungsobjekte. */
export const DEFAULT_STOREYS = 2;

/** Platziert eine Einheit oder ein Lageobjekt. Gebäude entstehen über `addBuildingCommand`. */
export function placeCommand(
  tool: Extract<PlacementTool, { kind: 'unit' | 'situationObject' }>,
  id: string,
  position: Vec2,
): Command {
  if (tool.kind === 'unit') {
    return { type: 'PlaceUnit', unitId: id, unitType: tool.typeId, position };
  }
  const definition = findSituationObjectType(tool.typeId);
  const radius = definition?.defaultRadius;
  // Nur Objekte mit einstellbarer Länge speichern sie – sonst gilt die Länge aus dem Katalog.
  const length = definition?.adjustableLength ? definition.length : undefined;
  return {
    type: 'PlaceSituationObject',
    objectId: id,
    objectType: tool.typeId,
    position,
    ...(radius !== undefined && { radius }),
    ...(length !== undefined && { length }),
  };
}

export function addBuildingCommand(id: string, outline: Vec2[]): Command {
  return { type: 'AddBuilding', buildingId: id, outline, storeys: DEFAULT_STOREYS };
}

/** Fahrbahnbreite neu gezeichneter Straßen in Metern – eine typische Ortsstraße. */
export const DEFAULT_ROAD_WIDTH = 6;

/** Text einer neu gesetzten Beschriftung; das Panel bietet ihn gleich zum Überschreiben an. */
export const DEFAULT_LABEL_TEXT = 'Beschriftung';

export function addRoadCommand(id: string, path: Vec2[]): Command {
  return {
    type: 'AddMapFeature',
    feature: { kind: 'road', id, path, width: DEFAULT_ROAD_WIDTH },
  };
}

/** Setzt einen Hydranten (Standard: Unterflur, in Deutschland die häufigste Bauart) oder eine Beschriftung. */
export function placeMapFeatureCommand(
  typeId: 'hydrant' | 'label',
  id: string,
  position: Vec2,
): Command {
  return {
    type: 'AddMapFeature',
    feature:
      typeId === 'hydrant'
        ? { kind: 'hydrant', id, position, hydrantType: 'underground' }
        : { kind: 'label', id, position, text: DEFAULT_LABEL_TEXT },
  };
}

/** Verschiebt ein Objekt von `from` nach `position`. Gebäude bekommen die Verschiebung. */
export function moveCommand(ref: MapItemRef, position: Vec2, from: Vec2): Command {
  switch (ref.kind) {
    case 'unit':
      return { type: 'MoveUnit', unitId: ref.id, position };
    case 'situationObject':
      return { type: 'MoveSituationObject', objectId: ref.id, position };
    case 'building':
      return { type: 'MoveBuilding', buildingId: ref.id, offset: roundedOffset(position, from) };
    case 'mapFeature':
      return { type: 'MoveMapFeature', featureId: ref.id, offset: roundedOffset(position, from) };
  }
}

export function rotateCommand(ref: MapItemRef, rotation: number): Command {
  switch (ref.kind) {
    case 'unit':
      return { type: 'RotateUnit', unitId: ref.id, rotation };
    case 'situationObject':
      return { type: 'RotateSituationObject', objectId: ref.id, rotation };
    case 'building':
    case 'mapFeature':
      // Die Oberfläche bietet Drehen hier gar nicht an (`rotatable: false`).
      throw new Error('Gebäude und Kartenelemente lassen sich nicht drehen');
  }
}

export function removeCommand(ref: MapItemRef): Command {
  switch (ref.kind) {
    case 'unit':
      return { type: 'RemoveUnit', unitId: ref.id };
    case 'situationObject':
      return { type: 'RemoveSituationObject', objectId: ref.id };
    case 'building':
      return { type: 'RemoveBuilding', buildingId: ref.id };
    case 'mapFeature':
      return { type: 'RemoveMapFeature', featureId: ref.id };
  }
}

/** Auf 0,1 m gerundete Verschiebung, damit sich keine Rundungsfehler in Grundrissen ansammeln. */
function roundedOffset(position: Vec2, from: Vec2): Vec2 {
  return {
    x: Math.round((position.x - from.x) * 10) / 10,
    y: Math.round((position.y - from.y) * 10) / 10,
  };
}
