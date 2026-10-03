import type { Command } from './commands';
import type { Vec2 } from './geometry';
import type { GameEvent } from './events';
import { isFiniteVec2, normalizeRotation, polygonArea } from './geometry';
import { changeMapFeature, invalidMapFeatureField } from './mapFeatures';
import {
  visibilities,
  type BuildingId,
  type GameState,
  type MapFeature,
  type MapFeatureId,
  type SituationObjectId,
} from './state';

/**
 * Grund, warum ein Befehl abgelehnt wurde. Bewusst als Code und nicht als Text:
 * Die Oberfläche entscheidet, wie sie den Fehler anzeigt.
 */
export type Rejection =
  | { readonly code: 'unit-already-exists'; readonly unitId: string }
  | { readonly code: 'unit-not-found'; readonly unitId: string }
  | { readonly code: 'invalid-position' }
  | { readonly code: 'invalid-rotation' }
  | { readonly code: 'invalid-unit-type' }
  | { readonly code: 'situation-object-already-exists'; readonly objectId: SituationObjectId }
  | { readonly code: 'situation-object-not-found'; readonly objectId: SituationObjectId }
  | { readonly code: 'invalid-object-type' }
  | { readonly code: 'invalid-radius' }
  | { readonly code: 'invalid-length' }
  /** Radius bzw. Länge ändern geht nur bei Objekten, die schon einen Radius bzw. eine Länge haben. */
  | { readonly code: 'not-resizable'; readonly objectId: SituationObjectId }
  | { readonly code: 'invalid-visibility' }
  | { readonly code: 'building-already-exists'; readonly buildingId: BuildingId }
  | { readonly code: 'building-not-found'; readonly buildingId: BuildingId }
  /** Weniger als drei Eckpunkte, ungültige Koordinaten oder (fast) keine Fläche. */
  | { readonly code: 'invalid-outline' }
  | { readonly code: 'invalid-storeys' }
  | { readonly code: 'invalid-name' }
  | { readonly code: 'map-feature-already-exists'; readonly featureId: MapFeatureId }
  | { readonly code: 'map-feature-not-found'; readonly featureId: MapFeatureId }
  /** Ein Feld des Kartenelements ist ungültig oder passt nicht zu seiner Art. */
  | { readonly code: 'invalid-map-feature'; readonly field: string }
  | { readonly code: 'clock-already-paused' }
  | { readonly code: 'clock-already-running' }
  | { readonly code: 'invalid-speed' };

export type DecideResult =
  | { readonly ok: true; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly rejection: Rejection };

const accept = (...events: GameEvent[]): DecideResult => ({ ok: true, events });
const reject = (rejection: Rejection): DecideResult => ({ ok: false, rejection });

/**
 * Prüft einen Befehl gegen den aktuellen Spielstand und liefert die daraus folgenden Ereignisse.
 * Verändert nichts – der Spielstand ändert sich erst, wenn die Ereignisse angewendet werden.
 */
export function decide(state: GameState, command: Command, exerciseTime: number): DecideResult {
  switch (command.type) {
    case 'PlaceUnit': {
      if (state.units[command.unitId]) {
        return reject({ code: 'unit-already-exists', unitId: command.unitId });
      }
      if (command.unitType.trim() === '') return reject({ code: 'invalid-unit-type' });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      const rotation = command.rotation ?? 0;
      if (!Number.isFinite(rotation)) return reject({ code: 'invalid-rotation' });
      return accept({
        type: 'UnitPlaced',
        exerciseTime,
        unitId: command.unitId,
        unitType: command.unitType,
        position: command.position,
        rotation: normalizeRotation(rotation),
      });
    }

    case 'MoveUnit': {
      const unit = state.units[command.unitId];
      if (!unit) return reject({ code: 'unit-not-found', unitId: command.unitId });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      return accept({
        type: 'UnitMoved',
        exerciseTime,
        unitId: unit.id,
        from: unit.position,
        to: command.position,
      });
    }

    case 'RotateUnit': {
      const unit = state.units[command.unitId];
      if (!unit) return reject({ code: 'unit-not-found', unitId: command.unitId });
      if (!Number.isFinite(command.rotation)) return reject({ code: 'invalid-rotation' });
      return accept({
        type: 'UnitRotated',
        exerciseTime,
        unitId: unit.id,
        rotation: normalizeRotation(command.rotation),
      });
    }

    case 'RemoveUnit': {
      if (!state.units[command.unitId]) {
        return reject({ code: 'unit-not-found', unitId: command.unitId });
      }
      return accept({ type: 'UnitRemoved', exerciseTime, unitId: command.unitId });
    }

    case 'PlaceSituationObject': {
      if (state.situationObjects[command.objectId]) {
        return reject({ code: 'situation-object-already-exists', objectId: command.objectId });
      }
      if (command.objectType.trim() === '') return reject({ code: 'invalid-object-type' });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      const rotation = command.rotation ?? 0;
      if (!Number.isFinite(rotation)) return reject({ code: 'invalid-rotation' });
      if (command.radius !== undefined && !isPositive(command.radius)) {
        return reject({ code: 'invalid-radius' });
      }
      if (command.length !== undefined && !isPositive(command.length)) {
        return reject({ code: 'invalid-length' });
      }
      const visibility = command.visibility ?? 'everyone';
      if (!visibilities.includes(visibility)) return reject({ code: 'invalid-visibility' });
      return accept({
        type: 'SituationObjectPlaced',
        exerciseTime,
        objectId: command.objectId,
        objectType: command.objectType,
        position: command.position,
        rotation: normalizeRotation(rotation),
        // Nur übernehmen, wenn vorhanden – sonst stünde `radius: undefined` im Ereignis.
        ...(command.radius !== undefined && { radius: command.radius }),
        ...(command.length !== undefined && { length: command.length }),
        visibility,
      });
    }

    case 'MoveSituationObject': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (!isFiniteVec2(command.position)) return reject({ code: 'invalid-position' });
      return accept({
        type: 'SituationObjectMoved',
        exerciseTime,
        objectId: object.id,
        from: object.position,
        to: command.position,
      });
    }

    case 'RotateSituationObject': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (!Number.isFinite(command.rotation)) return reject({ code: 'invalid-rotation' });
      return accept({
        type: 'SituationObjectRotated',
        exerciseTime,
        objectId: object.id,
        rotation: normalizeRotation(command.rotation),
      });
    }

    case 'ResizeSituationObject': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (object.radius === undefined)
        return reject({ code: 'not-resizable', objectId: object.id });
      if (!isPositive(command.radius)) return reject({ code: 'invalid-radius' });
      return accept({
        type: 'SituationObjectResized',
        exerciseTime,
        objectId: object.id,
        radius: command.radius,
      });
    }

    case 'ChangeSituationObjectLength': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (object.length === undefined)
        return reject({ code: 'not-resizable', objectId: object.id });
      if (!isPositive(command.length)) return reject({ code: 'invalid-length' });
      return accept({
        type: 'SituationObjectLengthChanged',
        exerciseTime,
        objectId: object.id,
        length: command.length,
      });
    }

    case 'ChangeSituationObjectVisibility': {
      const object = state.situationObjects[command.objectId];
      if (!object)
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      if (!visibilities.includes(command.visibility)) return reject({ code: 'invalid-visibility' });
      return accept({
        type: 'SituationObjectVisibilityChanged',
        exerciseTime,
        objectId: object.id,
        visibility: command.visibility,
      });
    }

    case 'RemoveSituationObject': {
      if (!state.situationObjects[command.objectId]) {
        return reject({ code: 'situation-object-not-found', objectId: command.objectId });
      }
      return accept({ type: 'SituationObjectRemoved', exerciseTime, objectId: command.objectId });
    }

    case 'AddBuilding': {
      if (state.buildings[command.buildingId]) {
        return reject({ code: 'building-already-exists', buildingId: command.buildingId });
      }
      if (!isValidOutline(command.outline)) return reject({ code: 'invalid-outline' });
      const storeys = command.storeys ?? 1;
      if (!isValidStoreys(storeys)) return reject({ code: 'invalid-storeys' });
      const name = command.name?.trim();
      if (name !== undefined && name.length > MAX_NAME_LENGTH)
        return reject({ code: 'invalid-name' });
      return accept({
        type: 'BuildingAdded',
        exerciseTime,
        buildingId: command.buildingId,
        outline: command.outline,
        storeys,
        ...(name && { name }),
      });
    }

    case 'MoveBuilding': {
      const building = state.buildings[command.buildingId];
      if (!building) return reject({ code: 'building-not-found', buildingId: command.buildingId });
      if (!isFiniteVec2(command.offset)) return reject({ code: 'invalid-position' });
      return accept({
        type: 'BuildingMoved',
        exerciseTime,
        buildingId: building.id,
        offset: command.offset,
      });
    }

    case 'ChangeBuilding': {
      const building = state.buildings[command.buildingId];
      if (!building) return reject({ code: 'building-not-found', buildingId: command.buildingId });
      const storeys = command.storeys ?? building.storeys;
      if (!isValidStoreys(storeys)) return reject({ code: 'invalid-storeys' });
      const name = command.name === undefined ? building.name : command.name.trim();
      if (name !== undefined && name.length > MAX_NAME_LENGTH)
        return reject({ code: 'invalid-name' });
      return accept({
        type: 'BuildingChanged',
        exerciseTime,
        buildingId: building.id,
        storeys,
        ...(name && { name }),
      });
    }

    case 'RemoveBuilding':
      if (!state.buildings[command.buildingId]) {
        return reject({ code: 'building-not-found', buildingId: command.buildingId });
      }
      return accept({ type: 'BuildingRemoved', exerciseTime, buildingId: command.buildingId });

    case 'AddMapFeature': {
      const { feature } = command;
      if (state.mapFeatures[feature.id]) {
        return reject({ code: 'map-feature-already-exists', featureId: feature.id });
      }
      const field = invalidMapFeatureField(feature);
      if (field) return reject({ code: 'invalid-map-feature', field });
      return accept({ type: 'MapFeatureAdded', exerciseTime, feature: normalizeFeature(feature) });
    }

    case 'MoveMapFeature': {
      const feature = state.mapFeatures[command.featureId];
      if (!feature) return reject({ code: 'map-feature-not-found', featureId: command.featureId });
      if (!isFiniteVec2(command.offset)) return reject({ code: 'invalid-position' });
      return accept({
        type: 'MapFeatureMoved',
        exerciseTime,
        featureId: feature.id,
        offset: command.offset,
      });
    }

    case 'ChangeMapFeature': {
      const feature = state.mapFeatures[command.featureId];
      if (!feature) return reject({ code: 'map-feature-not-found', featureId: command.featureId });
      const changed = changeMapFeature(feature, command.changes);
      if ('invalidField' in changed) {
        return reject({ code: 'invalid-map-feature', field: changed.invalidField });
      }
      return accept({ type: 'MapFeatureChanged', exerciseTime, feature: changed });
    }

    case 'RemoveMapFeature':
      if (!state.mapFeatures[command.featureId]) {
        return reject({ code: 'map-feature-not-found', featureId: command.featureId });
      }
      return accept({ type: 'MapFeatureRemoved', exerciseTime, featureId: command.featureId });

    case 'PauseClock':
      if (!state.clock.running) return reject({ code: 'clock-already-paused' });
      return accept({ type: 'ClockPaused', exerciseTime });

    case 'ResumeClock':
      if (state.clock.running) return reject({ code: 'clock-already-running' });
      return accept({ type: 'ClockResumed', exerciseTime });

    case 'SetClockSpeed':
      if (!Number.isFinite(command.speed) || command.speed <= 0) {
        return reject({ code: 'invalid-speed' });
      }
      return accept({ type: 'ClockSpeedChanged', exerciseTime, speed: command.speed });
  }
}

/** Entfernt Leerzeichen am Rand von Namen und Texten, leere Straßennamen fallen weg. */
function normalizeFeature(feature: MapFeature): MapFeature {
  switch (feature.kind) {
    case 'road': {
      const { name, ...rest } = feature;
      const trimmed = name?.trim();
      return { ...rest, ...(trimmed && { name: trimmed }) };
    }
    case 'label':
      return { ...feature, text: feature.text.trim() };
    case 'hydrant':
      return feature;
  }
}

/** Längster erlaubter Gebäudename – reicht für "Mehrfamilienhaus Hauptstraße 12". */
const MAX_NAME_LENGTH = 60;

/** Kleinste Grundfläche in m², damit versehentliche Mini-Klicks kein Gebäude ergeben. */
const MIN_BUILDING_AREA = 1;

function isValidOutline(outline: readonly Vec2[]): boolean {
  return (
    outline.length >= 3 && outline.every(isFiniteVec2) && polygonArea(outline) >= MIN_BUILDING_AREA
  );
}

/** Ganze Zahl von 1 bis 100 – mehr Geschosse hat kaum ein Hochhaus. */
function isValidStoreys(storeys: number): boolean {
  return Number.isInteger(storeys) && storeys >= 1 && storeys <= 100;
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
