import { create } from 'zustand';

interface ToolStore {
  /** Einheitentyp, der beim nächsten Klick auf die Karte platziert wird. `undefined` = kein Werkzeug. */
  readonly activeUnitType: string | undefined;
  readonly selectUnitType: (unitType: string | undefined) => void;
}

/** Zustand der Werkzeugleiste – reine Oberfläche, gehört nicht zum Spielstand. */
export const useToolStore = create<ToolStore>()((set) => ({
  activeUnitType: undefined,
  selectUnitType: (unitType) => set({ activeUnitType: unitType }),
}));
