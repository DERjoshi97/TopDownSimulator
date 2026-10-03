import type { Vec2 } from './geometry';
import type {
  BuildingId,
  MapFeature,
  MapFeatureChanges,
  MapFeatureId,
  SituationObjectId,
  UnitId,
  Visibility,
} from './state';

// Befehle beschreiben, was jemand tun *möchte*. Die Engine prüft sie in `decide`
// und macht daraus Ereignisse – oder lehnt sie ab.
// Das Feld `type` unterscheidet die Befehle; TypeScript erkennt daran, welche Felder vorhanden sind.

export interface PlaceUnit {
  readonly type: 'PlaceUnit';
  readonly unitId: UnitId;
  readonly unitType: string;
  readonly position: Vec2;
  /** Optional, Standard ist 0 (nach Norden). */
  readonly rotation?: number;
}

export interface MoveUnit {
  readonly type: 'MoveUnit';
  readonly unitId: UnitId;
  readonly position: Vec2;
}

export interface RotateUnit {
  readonly type: 'RotateUnit';
  readonly unitId: UnitId;
  readonly rotation: number;
}

export interface RemoveUnit {
  readonly type: 'RemoveUnit';
  readonly unitId: UnitId;
}

export interface PlaceSituationObject {
  readonly type: 'PlaceSituationObject';
  readonly objectId: SituationObjectId;
  readonly objectType: string;
  readonly position: Vec2;
  /** Optional, Standard ist 0. */
  readonly rotation?: number;
  /** Nur bei Flächen, in Metern. */
  readonly radius?: number;
  /** Nur bei linienförmigen Objekten wie einer Absperrung, in Metern. */
  readonly length?: number;
  /** Optional, Standard ist `everyone`. */
  readonly visibility?: Visibility;
}

export interface MoveSituationObject {
  readonly type: 'MoveSituationObject';
  readonly objectId: SituationObjectId;
  readonly position: Vec2;
}

export interface RotateSituationObject {
  readonly type: 'RotateSituationObject';
  readonly objectId: SituationObjectId;
  readonly rotation: number;
}

export interface ResizeSituationObject {
  readonly type: 'ResizeSituationObject';
  readonly objectId: SituationObjectId;
  readonly radius: number;
}

export interface ChangeSituationObjectLength {
  readonly type: 'ChangeSituationObjectLength';
  readonly objectId: SituationObjectId;
  readonly length: number;
}

export interface ChangeSituationObjectVisibility {
  readonly type: 'ChangeSituationObjectVisibility';
  readonly objectId: SituationObjectId;
  readonly visibility: Visibility;
}

export interface RemoveSituationObject {
  readonly type: 'RemoveSituationObject';
  readonly objectId: SituationObjectId;
}

export interface AddBuilding {
  readonly type: 'AddBuilding';
  readonly buildingId: BuildingId;
  readonly outline: readonly Vec2[];
  /** Optional, Standard ist 1. */
  readonly storeys?: number;
  readonly name?: string;
}

export interface MoveBuilding {
  readonly type: 'MoveBuilding';
  readonly buildingId: BuildingId;
  /** Verschiebung in Metern – der ganze Grundriss wandert mit. */
  readonly offset: Vec2;
}

export interface ChangeBuilding {
  readonly type: 'ChangeBuilding';
  readonly buildingId: BuildingId;
  /** Nur die angegebenen Felder ändern sich. Ein leerer Name entfernt den Namen. */
  readonly storeys?: number;
  readonly name?: string;
}

export interface RemoveBuilding {
  readonly type: 'RemoveBuilding';
  readonly buildingId: BuildingId;
}

export interface AddMapFeature {
  readonly type: 'AddMapFeature';
  readonly feature: MapFeature;
}

export interface MoveMapFeature {
  readonly type: 'MoveMapFeature';
  readonly featureId: MapFeatureId;
  /** Verschiebung in Metern – bei Straßen wandert der ganze Verlauf mit. */
  readonly offset: Vec2;
}

export interface ChangeMapFeature {
  readonly type: 'ChangeMapFeature';
  readonly featureId: MapFeatureId;
  readonly changes: MapFeatureChanges;
}

export interface RemoveMapFeature {
  readonly type: 'RemoveMapFeature';
  readonly featureId: MapFeatureId;
}

export interface PauseClock {
  readonly type: 'PauseClock';
}

export interface ResumeClock {
  readonly type: 'ResumeClock';
}

export interface SetClockSpeed {
  readonly type: 'SetClockSpeed';
  readonly speed: number;
}

export type Command =
  | PlaceUnit
  | MoveUnit
  | RotateUnit
  | RemoveUnit
  | PlaceSituationObject
  | MoveSituationObject
  | RotateSituationObject
  | ResizeSituationObject
  | ChangeSituationObjectLength
  | ChangeSituationObjectVisibility
  | RemoveSituationObject
  | AddBuilding
  | MoveBuilding
  | ChangeBuilding
  | RemoveBuilding
  | AddMapFeature
  | MoveMapFeature
  | ChangeMapFeature
  | RemoveMapFeature
  | PauseClock
  | ResumeClock
  | SetClockSpeed;
