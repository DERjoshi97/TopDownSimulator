import type { Vec2 } from './geometry';
import type { SituationObjectId, UnitId, Visibility } from './state';

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

export interface ChangeSituationObjectVisibility {
  readonly type: 'ChangeSituationObjectVisibility';
  readonly objectId: SituationObjectId;
  readonly visibility: Visibility;
}

export interface RemoveSituationObject {
  readonly type: 'RemoveSituationObject';
  readonly objectId: SituationObjectId;
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
  | ChangeSituationObjectVisibility
  | RemoveSituationObject;
