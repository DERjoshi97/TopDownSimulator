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

/** Eindeutige Kennung eines Lageobjekts. Wird wie `UnitId` vom Aufrufer erzeugt. */
export type SituationObjectId = string;

/**
 * Wer ein Lageobjekt sehen darf:
 * - `director`: nur die Übungsleitung, z. B. ein Brand, der noch nicht entdeckt ist
 * - `reconnoitered`: wer es erkundet hat
 * - `everyone`: alle
 */
export type Visibility = 'director' | 'reconnoitered' | 'everyone';

export const visibilities: readonly Visibility[] = ['director', 'reconnoitered', 'everyone'];

/** Ein Lageobjekt auf der Karte, z. B. Feuer, Rauch, eine Person oder eine Absperrung. */
export interface SituationObject {
  readonly id: SituationObjectId;
  /** Kennung des Typs im Katalog, z. B. "fire". */
  readonly objectType: string;
  readonly position: Vec2;
  /** Drehung in Grad wie bei `Unit.rotation`. */
  readonly rotation: number;
  /** Ausdehnung in Metern bei Flächen wie Feuer oder Rauch. Fehlt bei reinen Symbolen. */
  readonly radius?: number;
  /** Länge in Metern bei linienförmigen Objekten wie einer Absperrung. Fehlt sonst. */
  readonly length?: number;
  readonly visibility: Visibility;
}

/** Eindeutige Kennung eines Gebäudes. Wird wie `UnitId` vom Aufrufer erzeugt. */
export type BuildingId = string;

/** Ein Gebäude auf der Karte – Teil des Kartenbilds, für alle sichtbar. */
export interface Building {
  readonly id: BuildingId;
  /** Grundriss als Eckpunkte in Metern (mindestens drei). */
  readonly outline: readonly Vec2[];
  /** Anzahl der Geschosse über der Erde, mindestens 1. Grundlage für die spätere 3D-Ansicht. */
  readonly storeys: number;
  /** Optionaler Name, z. B. "Schule" oder "Haus A". */
  readonly name?: string;
}

/** Zustand der Einsatzuhr. Wie viel Übungszeit vergangen ist, rechnet `exerciseTimeAt` aus. */
export interface ClockState {
  readonly running: boolean;
  /** Zeitraffer-Faktor: 1 = Echtzeit, 5 = fünfmal so schnell. */
  readonly speed: number;
}

/**
 * Der komplette Spielstand zu einem Zeitpunkt.
 * Er wird nie direkt verändert, sondern nur durch Anwenden von Ereignissen neu berechnet.
 */
export interface GameState {
  readonly units: Readonly<Record<UnitId, Unit>>;
  readonly situationObjects: Readonly<Record<SituationObjectId, SituationObject>>;
  readonly buildings: Readonly<Record<BuildingId, Building>>;
  readonly clock: ClockState;
}

export const initialState: GameState = {
  units: {},
  situationObjects: {},
  buildings: {},
  // Eine Übung beginnt angehalten: Die Übungsleitung baut erst die Ausgangslage auf.
  clock: { running: false, speed: 1 },
};
