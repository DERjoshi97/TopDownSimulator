import { useEffect, useRef, useState } from 'react';
import type { Vec2 } from '@tds/engine';
import { findUnitType } from '@tds/catalog';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';
import { MapView } from './MapView';
import { defaultCamera, formatDistance, scaleBar, type Camera } from './camera';

/**
 * React-Hülle um die PixiJS-Kartenansicht, mit Maßstabsleiste und Mauskoordinaten darüber.
 * Hier werden Benutzeraktionen auf der Karte zu Engine-Befehlen.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | undefined>(undefined);
  const [camera, setCamera] = useState<Camera>(defaultCamera);
  const [cursor, setCursor] = useState<Vec2 | undefined>();
  const activeUnitType = useToolStore((s) => s.activeUnitType);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // In den Callbacks lesen wir die Stores mit `getState()` statt über Hooks:
    // Die MapView wird nur einmal erzeugt und soll immer den *aktuellen* Stand sehen.
    const view = MapView.create(container, {
      onCameraChange: setCamera,
      onCursorMove: setCursor,
      onMapClick: (world, { shiftKey }) => {
        const { activeUnitType, selectUnitType } = useToolStore.getState();
        if (!activeUnitType) return;
        useGameStore.getState().execute({
          type: 'PlaceUnit',
          unitId: crypto.randomUUID(),
          unitType: activeUnitType,
          position: world,
        });
        // Mit gedrückter Umschalttaste bleibt das Werkzeug aktiv, um mehrere Einheiten zu setzen.
        if (!shiftKey) selectUnitType(undefined);
      },
      onUnitDragEnd: (unitId, position) => {
        useGameStore.getState().execute({ type: 'MoveUnit', unitId, position });
      },
    });

    // PixiJS startet asynchron. Wird die Komponente vorher wieder entfernt (passiert im
    // React-Entwicklungsmodus absichtlich einmal), zerstören wir die Ansicht direkt nach dem Start.
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void view.then((v) => {
      if (disposed) {
        v.destroy();
        return;
      }
      viewRef.current = v;
      v.setUnits(useGameStore.getState().state.units);
      unsubscribe = useGameStore.subscribe((s) => v.setUnits(s.state.units));
    });

    return () => {
      disposed = true;
      unsubscribe?.();
      viewRef.current?.destroy();
      viewRef.current = undefined;
    };
  }, []);

  const bar = scaleBar(camera.scale);
  const activeName = activeUnitType && (findUnitType(activeUnitType)?.name ?? activeUnitType);

  return (
    <div className="map">
      <div
        ref={containerRef}
        className={`map-canvas${activeUnitType ? ' map-canvas--placing' : ''}`}
      />

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
