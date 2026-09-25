import type { Vec2 } from './geometry';
import type { UnitId } from './state';

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

export type GameEvent = UnitPlaced | UnitMoved | UnitRotated | UnitRemoved;
