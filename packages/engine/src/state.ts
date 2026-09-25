import type { Vec2 } from './geometry';

/** Eindeutige Kennung einer Einheit. Wird vom Aufrufer erzeugt (z. B. per `crypto.randomUUID()`). */
export type UnitId = string;

/** Eine Einheit auf der Karte, z. B. ein HLF oder ein Angriffstrupp. */
export interface Unit {
  readonly id: UnitId;
  /** Kennung des Einheitentyps im Katalog, z. B. "HLF". Der Katalog folgt in einem eigenen Paket. */
  readonly unitType: string;
  readonly position: Vec2;
  /** Drehung in Grad im Uhrzeigersinn, 0 = nach oben (Norden). Immer im Bereich 0 bis unter 360. */
  readonly rotation: number;
}

/**
 * Der komplette Spielstand zu einem Zeitpunkt.
 * Er wird nie direkt verändert, sondern nur durch Anwenden von Ereignissen neu berechnet.
 */
export interface GameState {
  readonly units: Readonly<Record<UnitId, Unit>>;
}

export const initialState: GameState = {
  units: {},
};
