import type { Vec2 } from './geometry';
import type { UnitId } from './state';

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

export type Command = PlaceUnit | MoveUnit | RotateUnit | RemoveUnit;
