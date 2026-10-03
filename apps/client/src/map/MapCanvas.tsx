import { useEffect, useRef, useState } from 'react';
import type { Vec2 } from '@tds/engine';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';
import { MapView } from './MapView';
import { defaultCamera, formatDistance, scaleBar, type Camera } from './camera';
import { moveCommand, placeCommand, rotateCommand } from './itemCommands';
import { mapItemsFromState, typeName } from './mapItems';

/**
 * React-Hülle um die PixiJS-Kartenansicht, mit Maßstabsleiste und Mauskoordinaten darüber.
 * Hier werden Benutzeraktionen auf der Karte zu Engine-Befehlen.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | undefined>(undefined);
  const [camera, setCamera] = useState<Camera>(defaultCamera);
  const [cursor, setCursor] = useState<Vec2 | undefined>();
  const activeTool = useToolStore((s) => s.activeTool);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // In den Callbacks lesen wir die Stores mit `getState()` statt über Hooks:
    // Die MapView wird nur einmal erzeugt und soll immer den *aktuellen* Stand sehen.
    const view = MapView.create(container, {
      onCameraChange: setCamera,
      onCursorMove: setCursor,
      onMapClick: (world, { shiftKey }) => {
        const { activeTool, select } = useToolStore.getState();
        // Klick ins Leere ohne Werkzeug hebt die Auswahl auf.
        if (!activeTool) {
          select(undefined);
          return;
        }
        const id = crypto.randomUUID();
        const result = useGameStore.getState().execute(placeCommand(activeTool, id, world));
        // Mit gedrückter Umschalttaste bleibt das Werkzeug aktiv, um mehrere Objekte zu setzen.
        // Sonst wird das neue Objekt gleich ausgewählt, damit man es direkt anpassen kann.
        if (!shiftKey && result.ok) select({ kind: activeTool.kind, id });
      },
      onItemSelect: (ref) => useToolStore.getState().select(ref),
      onItemMoveEnd: (ref, position) => {
        useGameStore.getState().execute(moveCommand(ref, position));
      },
      onItemRotateEnd: (ref, rotation) => {
        useGameStore.getState().execute(rotateCommand(ref, rotation));
      },
      onItemResizeEnd: (ref, radius) => {
        useGameStore
          .getState()
          .execute({ type: 'ResizeSituationObject', objectId: ref.id, radius });
      },
      onItemLengthEnd: (ref, length) => {
        useGameStore
          .getState()
          .execute({ type: 'ChangeSituationObjectLength', objectId: ref.id, length });
      },
    });

    // PixiJS startet asynchron. Wird die Komponente vorher wieder entfernt (passiert im
    // React-Entwicklungsmodus absichtlich einmal), zerstören wir die Ansicht direkt nach dem Start.
    let disposed = false;
    const unsubscribers: (() => void)[] = [];
    void view.then((v) => {
      if (disposed) {
        v.destroy();
        return;
      }
      viewRef.current = v;
      v.setItems(mapItemsFromState(useGameStore.getState().state));
      v.setSelection(useToolStore.getState().selection);
      unsubscribers.push(
        useGameStore.subscribe((s) => v.setItems(mapItemsFromState(s.state))),
        useToolStore.subscribe((s) => v.setSelection(s.selection)),
      );
    });

    return () => {
      disposed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      viewRef.current?.destroy();
      viewRef.current = undefined;
    };
  }, []);

  const bar = scaleBar(camera.scale);
  const activeName = activeTool && typeName(activeTool.kind, activeTool.typeId);

  return (
    <div className="map">
      <div ref={containerRef} className={`map-canvas${activeTool ? ' map-canvas--placing' : ''}`} />

      {activeName && (
        <div className="map-hint" role="status">
          Klicken, um <strong>{activeName}</strong> zu platzieren · Umschalt: mehrere · Esc:
          abbrechen
        </div>
      )}

      <div className="map-overlay map-overlay--bottom-left">
        <div className="scale-bar" style={{ width: bar.px }}>
          {formatDistance(bar.meters)}
        </div>
      </div>

      <div className="map-overlay map-overlay--bottom-right">
        {cursor && (
          <span className="cursor-position">
            x {formatCoordinate(cursor.x)} · y {formatCoordinate(cursor.y)}
          </span>
        )}
        <button type="button" onClick={() => viewRef.current?.setCamera(defaultCamera)}>
          Ansicht zurücksetzen
        </button>
      </div>
    </div>
  );
}

function formatCoordinate(meters: number): string {
  return `${meters.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}
