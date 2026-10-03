import { findSituationObjectType } from '@tds/catalog';
import type { Command, Vec2 } from '@tds/engine';
import type { PlacementTool } from '../store/toolStore';
import type { MapItemRef } from './mapItems';

// Übersetzt Aktionen auf der Karte in Engine-Befehle. Die Karte selbst unterscheidet nicht
// zwischen Einheiten und Lageobjekten – die Engine schon, daher passiert die Zuordnung hier.

export function placeCommand(tool: PlacementTool, id: string, position: Vec2): Command {
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

export function moveCommand(ref: MapItemRef, position: Vec2): Command {
  return ref.kind === 'unit'
    ? { type: 'MoveUnit', unitId: ref.id, position }
    : { type: 'MoveSituationObject', objectId: ref.id, position };
}

export function rotateCommand(ref: MapItemRef, rotation: number): Command {
  return ref.kind === 'unit'
    ? { type: 'RotateUnit', unitId: ref.id, rotation }
    : { type: 'RotateSituationObject', objectId: ref.id, rotation };
}

export function removeCommand(ref: MapItemRef): Command {
  return ref.kind === 'unit'
    ? { type: 'RemoveUnit', unitId: ref.id }
    : { type: 'RemoveSituationObject', objectId: ref.id };
}
