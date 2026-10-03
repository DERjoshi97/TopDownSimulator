import type { GameEvent } from './events';
import { visibilities } from './state';

// Eine Übung wird als Liste ihrer Ereignisse gespeichert, nicht als Schnappschuss des Zustands:
// So bleiben Einsatztagebuch und Zeitverlauf erhalten, und der Zustand lässt sich jederzeit
// daraus nachrechnen.

/** Kennung im Dateikopf, damit fremde JSON-Dateien sofort erkannt werden. */
export const EXERCISE_FILE_FORMAT = 'topdownsimulator-exercise';

/** Wird erhöht, wenn sich das Format so ändert, dass alte Programme neue Dateien nicht lesen können. */
export const EXERCISE_FILE_VERSION = 1;

export interface ExerciseFile {
  readonly format: typeof EXERCISE_FILE_FORMAT;
  readonly version: typeof EXERCISE_FILE_VERSION;
  /** Zeitpunkt des Speicherns als ISO-Text, nur zur Information. */
  readonly savedAt: string;
  /**
   * Stand der Einsatzuhr beim Speichern. Läuft die Uhr, liegt er hinter dem letzten Ereignis –
   * ohne dieses Feld ginge die Zeit seit dem letzten Ereignis verloren.
   */
  readonly exerciseTime: number;
  readonly events: readonly GameEvent[];
}

/** Warum eine Datei nicht geladen werden konnte. Die Oberfläche macht daraus einen Text. */
export type ExerciseFileError =
  | { readonly code: 'invalid-json' }
  | { readonly code: 'unknown-format' }
  | { readonly code: 'unsupported-version'; readonly version: unknown }
  | { readonly code: 'invalid-event'; readonly index: number };

export type ParseExerciseResult =
  | { readonly ok: true; readonly file: ExerciseFile }
  | { readonly ok: false; readonly error: ExerciseFileError };

/** Erzeugt den Dateiinhalt (eingerücktes JSON, damit man ihn notfalls lesen kann). */
export function serializeExercise(
  events: readonly GameEvent[],
  exerciseTime: number,
  savedAt: Date,
): string {
  const file: ExerciseFile = {
    format: EXERCISE_FILE_FORMAT,
    version: EXERCISE_FILE_VERSION,
    savedAt: savedAt.toISOString(),
    exerciseTime,
    events,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Liest und prüft eine Übungsdatei. Jedes Ereignis wird auf Typ und Felder geprüft, weil die
 * Engine Ereignisse sonst ungeprüft anwendet – eine beschädigte Datei darf keinen kaputten
 * Spielstand erzeugen.
 */
export function parseExercise(text: string): ParseExerciseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail({ code: 'invalid-json' });
  }
  if (!isRecord(data) || data.format !== EXERCISE_FILE_FORMAT || !Array.isArray(data.events)) {
    return fail({ code: 'unknown-format' });
  }
  if (data.version !== EXERCISE_FILE_VERSION) {
    return fail({ code: 'unsupported-version', version: data.version });
  }

  let previousTime = 0;
  for (const [index, event] of data.events.entries()) {
    // Übungszeit darf nicht rückwärts laufen – sonst stimmt die Reihenfolge im Tagebuch nicht.
    if (!isValidEvent(event) || event.exerciseTime < previousTime) {
      return fail({ code: 'invalid-event', index });
    }
    previousTime = event.exerciseTime;
  }
  // Der Uhrstand beim Speichern kann nicht vor dem letzten Ereignis liegen.
  if (typeof data.exerciseTime !== 'number' || !(data.exerciseTime >= previousTime)) {
    return fail({ code: 'unknown-format' });
  }

  return {
    ok: true,
    file: {
      format: EXERCISE_FILE_FORMAT,
      version: EXERCISE_FILE_VERSION,
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
      exerciseTime: data.exerciseTime,
      events: data.events as GameEvent[],
    },
  };
}

const fail = (error: ExerciseFileError): ParseExerciseResult => ({ ok: false, error });

// --- Prüfung der Ereignisse ----------------------------------------------------------------

type FieldCheck = (value: unknown) => boolean;

const isString: FieldCheck = (v) => typeof v === 'string' && v.length > 0;
const isNumber: FieldCheck = (v) => typeof v === 'number' && Number.isFinite(v);
const isPositive: FieldCheck = (v) => isNumber(v) && (v as number) > 0;
const isVec2: FieldCheck = (v) => isRecord(v) && isNumber(v.x) && isNumber(v.y);
const isOutline: FieldCheck = (v) => Array.isArray(v) && v.length >= 3 && v.every(isVec2);
const isVisibility: FieldCheck = (v) => visibilities.includes(v as never);
const optional =
  (check: FieldCheck): FieldCheck =>
  (v) =>
    v === undefined || check(v);

/**
 * Pflichtfelder je Ereignistyp. `satisfies` sorgt dafür, dass TypeScript meckert, wenn ein neuer
 * Ereignistyp dazukommt und hier fehlt.
 */
const EVENT_FIELDS = {
  UnitPlaced: { unitId: isString, unitType: isString, position: isVec2, rotation: isNumber },
  UnitMoved: { unitId: isString, from: isVec2, to: isVec2 },
  UnitRotated: { unitId: isString, rotation: isNumber },
  UnitRemoved: { unitId: isString },
  SituationObjectPlaced: {
    objectId: isString,
    objectType: isString,
    position: isVec2,
    rotation: isNumber,
    radius: optional(isPositive),
    length: optional(isPositive),
    visibility: isVisibility,
  },
  SituationObjectMoved: { objectId: isString, from: isVec2, to: isVec2 },
  SituationObjectRotated: { objectId: isString, rotation: isNumber },
  SituationObjectResized: { objectId: isString, radius: isPositive },
  SituationObjectLengthChanged: { objectId: isString, length: isPositive },
  SituationObjectVisibilityChanged: { objectId: isString, visibility: isVisibility },
  SituationObjectRemoved: { objectId: isString },
  BuildingAdded: {
    buildingId: isString,
    outline: isOutline,
    storeys: isPositive,
    name: optional(isString),
  },
  BuildingMoved: { buildingId: isString, offset: isVec2 },
  BuildingChanged: { buildingId: isString, storeys: isPositive, name: optional(isString) },
  BuildingRemoved: { buildingId: isString },
  ClockPaused: {},
  ClockResumed: {},
  ClockSpeedChanged: { speed: isPositive },
} satisfies Record<GameEvent['type'], Record<string, FieldCheck>>;

function isValidEvent(event: unknown): event is GameEvent {
  if (!isRecord(event) || typeof event.type !== 'string') return false;
  if (!Object.hasOwn(EVENT_FIELDS, event.type)) return false;
  if (!isNumber(event.exerciseTime) || (event.exerciseTime as number) < 0) return false;
  const fields: Record<string, FieldCheck> = EVENT_FIELDS[event.type as GameEvent['type']];
  return Object.entries(fields).every(([name, check]) => check(event[name]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
