import { useEffect } from 'react';
import { findUnitType } from '@tds/catalog';
import type { UnitId } from '@tds/engine';
import { ROTATION_STEP } from '../map/hitTest';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';

/**
 * Zeigt die ausgewählte Einheit und bietet Drehen und Entfernen an –
 * per Knopf oder Tastatur (R / Umschalt+R drehen, Entf / ⌫ entfernen, Esc abwählen).
 */
export function SelectionPanel() {
  const selectedUnitId = useToolStore((s) => s.selectedUnitId);
  const unit = useGameStore((s) => (selectedUnitId ? s.state.units[selectedUnitId] : undefined));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Tastenkürzel des Browsers (z. B. Cmd+R) und Eingaben in Textfeldern nicht abfangen.
      if (e.metaKey || e.ctrlKey || e.altKey || isTextInput(e.target)) return;
      const { selectedUnitId, selectUnit } = useToolStore.getState();
      if (!selectedUnitId) return;

      if (e.key === 'Escape') {
        selectUnit(undefined);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeUnit(selectedUnitId);
      } else if (e.key === 'r' || e.key === 'R') {
        rotateUnitBy(selectedUnitId, e.shiftKey ? -ROTATION_STEP : ROTATION_STEP);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!unit) return null;
  const name = findUnitType(unit.unitType)?.name ?? unit.unitType;

  return (
    <section className="selection-panel" aria-label="Ausgewählte Einheit">
      <h2>{unit.unitType}</h2>
      <p className="selection-panel-name">{name}</p>
      <p className="selection-panel-rotation">Drehung {Math.round(unit.rotation)}°</p>
      <div className="selection-panel-buttons">
        <button
          type="button"
          title="Gegen den Uhrzeigersinn drehen (Umschalt+R)"
          onClick={() => rotateUnitBy(unit.id, -ROTATION_STEP)}
        >
          ↺ {ROTATION_STEP}°
        </button>
        <button
          type="button"
          title="Im Uhrzeigersinn drehen (R)"
          onClick={() => rotateUnitBy(unit.id, ROTATION_STEP)}
        >
          ↻ {ROTATION_STEP}°
        </button>
        <button
          type="button"
          className="selection-panel-remove"
          title="Einheit entfernen (Entf)"
          onClick={() => removeUnit(unit.id)}
        >
          Entfernen
        </button>
      </div>
    </section>
  );
}

function rotateUnitBy(unitId: UnitId, degrees: number): void {
  const { state, execute } = useGameStore.getState();
  const unit = state.units[unitId];
  if (!unit) return;
  execute({ type: 'RotateUnit', unitId, rotation: unit.rotation + degrees });
}

function removeUnit(unitId: UnitId): void {
  const result = useGameStore.getState().execute({ type: 'RemoveUnit', unitId });
  if (result.ok) useToolStore.getState().selectUnit(undefined);
}

function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
