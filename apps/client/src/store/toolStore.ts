import { create } from 'zustand';
import type { MapItemRef } from '../map/mapItems';

/**
 * Aktives Werkzeug: Einheit oder Lageobjekt platzieren (Typ aus dem Katalog) oder ein Gebäude
 * zeichnen (als Rechteck oder Polygon).
 */
export type PlacementTool =
  | { readonly kind: 'unit' | 'situationObject'; readonly typeId: string }
  | { readonly kind: 'building'; readonly typeId: 'rectangle' | 'polygon' }
  /** Straße wird gezeichnet, Hydrant und Beschriftung werden per Klick gesetzt. */
  | { readonly kind: 'mapFeature'; readonly typeId: 'road' | 'hydrant' | 'label' };

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
