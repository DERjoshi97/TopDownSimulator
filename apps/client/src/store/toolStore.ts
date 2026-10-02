import { create } from 'zustand';
import type { UnitId } from '@tds/engine';

interface ToolStore {
  /** Einheitentyp, der beim nächsten Klick auf die Karte platziert wird. `undefined` = kein Werkzeug. */
  readonly activeUnitType: string | undefined;
  readonly selectUnitType: (unitType: string | undefined) => void;
  /** Auf der Karte ausgewählte Einheit, auf die sich Drehen und Entfernen beziehen. */
  readonly selectedUnitId: UnitId | undefined;
  readonly selectUnit: (unitId: UnitId | undefined) => void;
}

/**
 * Zustand der Werkzeuge und der Auswahl – reine Oberfläche, gehört nicht zum Spielstand.
 * Platzieren und Auswählen schließen sich aus: Wer ein Werkzeug wählt, hebt die Auswahl auf
 * und umgekehrt.
 */
export const useToolStore = create<ToolStore>()((set) => ({
  activeUnitType: undefined,
  selectUnitType: (unitType) =>
    set(
      unitType
        ? { activeUnitType: unitType, selectedUnitId: undefined }
        : { activeUnitType: undefined },
    ),
  selectedUnitId: undefined,
  selectUnit: (unitId) =>
    set(
      unitId
        ? { selectedUnitId: unitId, activeUnitType: undefined }
        : { selectedUnitId: undefined },
    ),
}));
