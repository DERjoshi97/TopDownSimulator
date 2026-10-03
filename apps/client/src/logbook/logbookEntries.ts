import {
  applyEvent,
  initialState,
  type GameEvent,
  type GameState,
  type Visibility,
} from '@tds/engine';
import { typeName, type MapItemRef } from '../map/mapItems';

/** Eine Zeile im Einsatztagebuch. */
export interface LogbookEntry {
  readonly exerciseTime: number;
  readonly text: string;
  /** Objekt, auf das sich der Eintrag bezieht – zum Anklicken. Fehlt z. B. bei der Uhr. */
  readonly ref?: MapItemRef;
}

const VISIBILITY_TEXT: Record<Visibility, string> = {
  director: 'nur Übungsleitung',
  reconnoitered: 'erkundet',
  everyone: 'alle',
};

/**
 * Erzeugt das Einsatztagebuch aus der Ereignisliste.
 * Gleichartige Objekte werden in der Reihenfolge ihres Erscheinens durchnummeriert
 * („HLF 1“, „HLF 2“), damit man sie im Tagebuch auseinanderhalten kann.
 */
export function logbookEntries(events: readonly GameEvent[]): LogbookEntry[] {
  const labels = new Map<string, string>();
  const counters = new Map<string, number>();
  const label = (kind: MapItemRef['kind'], id: string, typeId?: string): string => {
    const key = `${kind}:${id}`;
    const existing = labels.get(key);
    if (existing) return existing;
    // Kommt nur vor, wenn ein Objekt vor seinem Platzieren auftaucht – dann die Kennung zeigen.
    if (!typeId) return id;
    const counterKey = `${kind}:${typeId}`;
    const n = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, n);
    const text = `${kind === 'unit' ? typeId : typeName(kind, typeId)} ${n}`;
    labels.set(key, text);
    return text;
  };

  const entries: LogbookEntry[] = [];
  let state: GameState = initialState;
  let started = false;
  for (const event of events) {
    const entry = describe(event, state, { label, started });
    if (event.type === 'ClockResumed') started = true;
    if (entry) entries.push({ exerciseTime: event.exerciseTime, ...entry });
    state = applyEvent(state, event);
  }
  return entries;
}

interface Context {
  readonly label: (kind: MapItemRef['kind'], id: string, typeId?: string) => string;
  /** Wurde die Uhr vorher schon einmal gestartet? */
  readonly started: boolean;
}

/** Beschreibt ein Ereignis. `state` ist der Stand *vor* dem Ereignis, z. B. für den alten Radius. */
function describe(
  event: GameEvent,
  state: GameState,
  { label, started }: Context,
): Omit<LogbookEntry, 'exerciseTime'> | undefined {
  switch (event.type) {
    case 'UnitPlaced':
      return {
        ref: unit(event.unitId),
        text: `${label('unit', event.unitId, event.unitType)} platziert`,
      };
    case 'UnitMoved':
      return {
        ref: unit(event.unitId),
        text: `${label('unit', event.unitId)} verschoben (${formatMeters(distance(event.from, event.to))})`,
      };
    case 'UnitRotated':
      return {
        ref: unit(event.unitId),
        text: `${label('unit', event.unitId)} gedreht auf ${Math.round(event.rotation)}°`,
      };
    case 'UnitRemoved':
      return { text: `${label('unit', event.unitId)} entfernt` };

    case 'SituationObjectPlaced': {
      const name = label('situationObject', event.objectId, event.objectType);
      const radius = event.radius !== undefined ? `, Radius ${formatMeters(event.radius)}` : '';
      return {
        ref: object(event.objectId),
        text: `Lage: ${name} eingespielt${radius}, sichtbar für ${VISIBILITY_TEXT[event.visibility]}`,
      };
    }
    case 'SituationObjectMoved':
      return {
        ref: object(event.objectId),
        text: `${label('situationObject', event.objectId)} verschoben (${formatMeters(distance(event.from, event.to))})`,
      };
    case 'SituationObjectRotated':
      return {
        ref: object(event.objectId),
        text: `${label('situationObject', event.objectId)} gedreht auf ${Math.round(event.rotation)}°`,
      };
    case 'SituationObjectResized': {
      const before = state.situationObjects[event.objectId]?.radius;
      const change = before !== undefined && event.radius > before ? 'ausgeweitet' : 'verkleinert';
      return {
        ref: object(event.objectId),
        text: `${label('situationObject', event.objectId)} ${change} auf ${formatMeters(event.radius)}`,
      };
    }
    case 'SituationObjectVisibilityChanged':
      return {
        ref: object(event.objectId),
        text: `${label('situationObject', event.objectId)} jetzt sichtbar für ${VISIBILITY_TEXT[event.visibility]}`,
      };
    case 'SituationObjectRemoved':
      return { text: `${label('situationObject', event.objectId)} entfernt` };

    case 'ClockResumed':
      // Erster Start der Uhr = Übungsbeginn, danach geht es nach einer Pause weiter.
      return { text: started ? 'Übung fortgesetzt' : 'Übung gestartet' };
    case 'ClockPaused':
      return { text: 'Übung angehalten' };
    case 'ClockSpeedChanged':
      return {
        text: event.speed === 1 ? 'Zeit läuft in Echtzeit' : `Zeitraffer ${event.speed}-fach`,
      };
  }
}

const unit = (id: string): MapItemRef => ({ kind: 'unit', id });
const object = (id: string): MapItemRef => ({ kind: 'situationObject', id });

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatMeters(meters: number): string {
  return `${meters.toLocaleString('de-DE', { maximumFractionDigits: 1 })} m`;
}
