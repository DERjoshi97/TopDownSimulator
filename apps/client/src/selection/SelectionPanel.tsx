import { useEffect } from 'react';
import { visibilities, type Visibility } from '@tds/engine';
import { ROTATION_STEP } from '../map/hitTest';
import { removeCommand, rotateCommand } from '../map/itemCommands';
import { findMapItem, isArea, typeName, type MapItemRef } from '../map/mapItems';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';

/** Schritt in Metern für die Knöpfe zum Vergrößern und Verkleinern einer Fläche. */
const RADIUS_STEP = 1;

/** Kleinster Radius, den die Knöpfe einstellen – passend zum Größen-Griff auf der Karte. */
const MIN_RADIUS = 0.5;

const VISIBILITY_LABELS: Record<Visibility, string> = {
  director: 'Übungsleitung',
  reconnoitered: 'Erkundet',
  everyone: 'Alle',
};

/**
 * Zeigt das ausgewählte Objekt und bietet passende Aktionen an – per Knopf oder Tastatur
 * (R / Umschalt+R drehen, Entf / ⌫ entfernen, Esc abwählen).
 */
export function SelectionPanel() {
  const selection = useToolStore((s) => s.selection);
  const state = useGameStore((s) => s.state);
  const item = findMapItem(state, selection);
  const visibility =
    selection?.kind === 'situationObject'
      ? state.situationObjects[selection.id]?.visibility
      : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Tastenkürzel des Browsers (z. B. Cmd+R) und Eingaben in Textfeldern nicht abfangen.
      if (e.metaKey || e.ctrlKey || e.altKey || isTextInput(e.target)) return;
      const { selection, select } = useToolStore.getState();
      const item = findMapItem(useGameStore.getState().state, selection);
      if (!item) return;

      if (e.key === 'Escape') {
        select(undefined);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove(item.ref);
      } else if ((e.key === 'r' || e.key === 'R') && item.rotatable) {
        rotateBy(item.ref, item.rotation, e.shiftKey ? -ROTATION_STEP : ROTATION_STEP);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!item) return null;
  const name = typeName(item.ref.kind, item.symbolType);

  return (
    <section className="selection-panel" aria-label="Auswahl">
      {item.ref.kind === 'unit' ? (
        <>
          <h2>{item.symbolType}</h2>
          <p className="selection-panel-name">{name}</p>
        </>
      ) : (
        <h2>{name}</h2>
      )}

      {item.rotatable && (
        <div className="selection-panel-row">
          <span>Drehung {Math.round(item.rotation)}°</span>
          <button
            type="button"
            title="Gegen den Uhrzeigersinn drehen (Umschalt+R)"
            onClick={() => rotateBy(item.ref, item.rotation, -ROTATION_STEP)}
          >
            ↺ {ROTATION_STEP}°
          </button>
          <button
            type="button"
            title="Im Uhrzeigersinn drehen (R)"
            onClick={() => rotateBy(item.ref, item.rotation, ROTATION_STEP)}
          >
            ↻ {ROTATION_STEP}°
          </button>
        </div>
      )}

      {isArea(item) && (
        <div className="selection-panel-row">
          <span>Radius {formatMeters(item.radius)}</span>
          <button
            type="button"
            title="Verkleinern"
            aria-label="Radius verkleinern"
            disabled={item.radius <= MIN_RADIUS}
            onClick={() => resize(item.ref, Math.max(MIN_RADIUS, item.radius - RADIUS_STEP))}
          >
            −
          </button>
          <button
            type="button"
            title="Vergrößern"
            aria-label="Radius vergrößern"
            onClick={() => resize(item.ref, item.radius + RADIUS_STEP)}
          >
            +
          </button>
        </div>
      )}

      {visibility && (
        <fieldset className="selection-panel-visibility">
          <legend>Sichtbar für</legend>
          {visibilities.map((v) => (
            <label key={v}>
              <input
                type="radio"
                name="visibility"
                checked={visibility === v}
                onChange={() => changeVisibility(item.ref, v)}
              />
              {VISIBILITY_LABELS[v]}
            </label>
          ))}
        </fieldset>
      )}

      <button
        type="button"
        className="selection-panel-remove"
        title="Entfernen (Entf)"
        onClick={() => remove(item.ref)}
      >
        Entfernen
      </button>
    </section>
  );
}

function rotateBy(ref: MapItemRef, current: number, degrees: number): void {
  useGameStore.getState().execute(rotateCommand(ref, current + degrees));
}

function resize(ref: MapItemRef, radius: number): void {
  // Auf 0,1 m runden, sonst ergibt z. B. 3,3 − 1 den Wert 2.2999999999999998.
  const rounded = Math.round(radius * 10) / 10;
  useGameStore
    .getState()
    .execute({ type: 'ResizeSituationObject', objectId: ref.id, radius: rounded });
}

function changeVisibility(ref: MapItemRef, visibility: Visibility): void {
  useGameStore
    .getState()
    .execute({ type: 'ChangeSituationObjectVisibility', objectId: ref.id, visibility });
}

function remove(ref: MapItemRef): void {
  const result = useGameStore.getState().execute(removeCommand(ref));
  if (result.ok) useToolStore.getState().select(undefined);
}

function formatMeters(meters: number): string {
  return `${meters.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}

/** Auswahlknöpfe wie die Sichtbarkeit zählen nicht als Textfeld – dort sollen Kürzel weiter gehen. */
function isTextInput(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return !['radio', 'checkbox'].includes(target.type);
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
