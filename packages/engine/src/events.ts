import type { Vec2 } from './geometry';
import type { SituationObjectId, UnitId, Visibility } from './state';

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
  | ClockPaused
  | ClockResumed
  | ClockSpeedChanged;
