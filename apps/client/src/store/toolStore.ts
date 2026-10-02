import { create } from 'zustand';
import type { MapItemRef } from '../map/mapItems';

/** Was beim nächsten Klick auf die Karte platziert wird: eine Einheit oder ein Lageobjekt. */
export interface PlacementTool {
  readonly kind: MapItemRef['kind'];
  /** Kennung des Typs im Katalog, z. B. "HLF" oder "fire". */
  readonly typeId: string;
}

interface ToolStore {
  /** Aktives Platzier-Werkzeug. `undefined` = kein Werkzeug. */
  readonly activeTool: PlacementTool | undefined;
  readonly selectTool: (tool: PlacementTool | undefined) => void;
  /** Auf der Karte ausgewähltes Objekt, auf das sich Drehen, Größe und Entfernen beziehen. */
  readonly selection: MapItemRef | undefined;
  readonly select: (ref: MapItemRef | undefined) => void;
}

/**
 * Zustand der Werkzeuge und der Auswahl – reine Oberfläche, gehört nicht zum Spielstand.
 * Platzieren und Auswählen schließen sich aus: Wer ein Werkzeug wählt, hebt die Auswahl auf
 * und umgekehrt.
 */
export const useToolStore = create<ToolStore>()((set) => ({
  activeTool: undefined,
  selectTool: (tool) =>
    set(tool ? { activeTool: tool, selection: undefined } : { activeTool: undefined }),
  selection: undefined,
  select: (ref) => set(ref ? { selection: ref, activeTool: undefined } : { selection: undefined }),
}));

export function isSameTool(a: PlacementTool | undefined, b: PlacementTool): boolean {
  return a?.kind === b.kind && a.typeId === b.typeId;
}
