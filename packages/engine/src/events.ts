import type { Vec2 } from './geometry';
import type {
  BuildingId,
  MapFeature,
  MapFeatureId,
  SituationObjectId,
  UnitId,
  Visibility,
} from './state';

// Ereignisse beschreiben, was tatsächlich *passiert ist* (daher Vergangenheitsform).
// Sie sind bereits geprüft und werden nie verändert oder gelöscht –
// die Liste aller Ereignisse ist zugleich das Einsatztagebuch.

interface BaseEvent {
  /** Übungszeit in Millisekunden, zu der das Ereignis eingetreten ist. */
  readonly exerciseTime: number;
}

export interface UnitPlaced extends BaseEvent {
  readonly type: 'UnitPlaced';
  readonly unitId: UnitId;
  readonly unitType: string;
  readonly position: Vec2;
  readonly rotation: number;
}

export interface UnitMoved extends BaseEvent {
  readonly type: 'UnitMoved';
  readonly unitId: UnitId;
  /** Die alte Position wird mitgespeichert, damit Tagebuch und Rückgängig ohne Nachrechnen auskommen. */
  readonly from: Vec2;
  readonly to: Vec2;
}

export interface UnitRotated extends BaseEvent {
  readonly type: 'UnitRotated';
  readonly unitId: UnitId;
  readonly rotation: number;
}

export interface UnitRemoved extends BaseEvent {
  readonly type: 'UnitRemoved';
  readonly unitId: UnitId;
}

export interface SituationObjectPlaced extends BaseEvent {
  readonly type: 'SituationObjectPlaced';
  readonly objectId: SituationObjectId;
  readonly objectType: string;
  readonly position: Vec2;
  readonly rotation: number;
  /** Nur bei Flächen vorhanden. */
  readonly radius?: number;
  /** Nur bei linienförmigen Objekten vorhanden. */
  readonly length?: number;
  readonly visibility: Visibility;
}

export interface SituationObjectMoved extends BaseEvent {
  readonly type: 'SituationObjectMoved';
  readonly objectId: SituationObjectId;
  readonly from: Vec2;
  readonly to: Vec2;
}

export interface SituationObjectRotated extends BaseEvent {
  readonly type: 'SituationObjectRotated';
  readonly objectId: SituationObjectId;
  readonly rotation: number;
}

export interface SituationObjectResized extends BaseEvent {
  readonly type: 'SituationObjectResized';
  readonly objectId: SituationObjectId;
  readonly radius: number;
}

export interface SituationObjectLengthChanged extends BaseEvent {
  readonly type: 'SituationObjectLengthChanged';
  readonly objectId: SituationObjectId;
  readonly length: number;
}

export interface SituationObjectVisibilityChanged extends BaseEvent {
  readonly type: 'SituationObjectVisibilityChanged';
  readonly objectId: SituationObjectId;
  readonly visibility: Visibility;
}

export interface SituationObjectRemoved extends BaseEvent {
  readonly type: 'SituationObjectRemoved';
  readonly objectId: SituationObjectId;
}

export interface BuildingAdded extends BaseEvent {
  readonly type: 'BuildingAdded';
  readonly buildingId: BuildingId;
  readonly outline: readonly Vec2[];
  readonly storeys: number;
  readonly name?: string;
}

export interface BuildingMoved extends BaseEvent {
  readonly type: 'BuildingMoved';
  readonly buildingId: BuildingId;
  readonly offset: Vec2;
}

export interface BuildingChanged extends BaseEvent {
  readonly type: 'BuildingChanged';
  readonly buildingId: BuildingId;
  readonly storeys: number;
  /** Fehlt, wenn das Gebäude keinen Namen (mehr) hat. */
  readonly name?: string;
}

export interface BuildingRemoved extends BaseEvent {
  readonly type: 'BuildingRemoved';
  readonly buildingId: BuildingId;
}

export interface MapFeatureAdded extends BaseEvent {
  readonly type: 'MapFeatureAdded';
  readonly feature: MapFeature;
}

export interface MapFeatureMoved extends BaseEvent {
  readonly type: 'MapFeatureMoved';
  readonly featureId: MapFeatureId;
  readonly offset: Vec2;
}

/** Enthält das ganze geänderte Element – so muss beim Anwenden nichts zusammengesetzt werden. */
export interface MapFeatureChanged extends BaseEvent {
  readonly type: 'MapFeatureChanged';
  readonly feature: MapFeature;
}

export interface MapFeatureRemoved extends BaseEvent {
  readonly type: 'MapFeatureRemoved';
  readonly featureId: MapFeatureId;
}

export interface ClockPaused extends BaseEvent {
  readonly type: 'ClockPaused';
}

export interface ClockResumed extends BaseEvent {
  readonly type: 'ClockResumed';
}

export interface ClockSpeedChanged extends BaseEvent {
  readonly type: 'ClockSpeedChanged';
  readonly speed: number;
}

export type GameEvent =
  | UnitPlaced
  | UnitMoved
  | UnitRotated
  | UnitRemoved
  | SituationObjectPlaced
  | SituationObjectMoved
  | SituationObjectRotated
  | SituationObjectResized
  | SituationObjectLengthChanged
  | SituationObjectVisibilityChanged
  | SituationObjectRemoved
  | BuildingAdded
  | BuildingMoved
  | BuildingChanged
  | BuildingRemoved
  | MapFeatureAdded
  | MapFeatureMoved
  | MapFeatureChanged
  | MapFeatureRemoved
  | ClockPaused
  | ClockResumed
  | ClockSpeedChanged;
