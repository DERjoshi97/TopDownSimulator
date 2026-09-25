import { useEffect, useRef, useState } from 'react';
import type { Vec2 } from '@tds/engine';
import { MapView } from './MapView';
import { defaultCamera, formatDistance, scaleBar, type Camera } from './camera';

/** React-Hülle um die PixiJS-Kartenansicht, mit Maßstabsleiste und Mauskoordinaten darüber. */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | undefined>(undefined);
  const [camera, setCamera] = useState<Camera>(defaultCamera);
  const [cursor, setCursor] = useState<Vec2 | undefined>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // PixiJS startet asynchron. Wird die Komponente vorher wieder entfernt (passiert im
    // React-Entwicklungsmodus absichtlich einmal), zerstören wir die Ansicht direkt nach dem Start.
    let disposed = false;
    void MapView.create(container, { onCameraChange: setCamera, onCursorMove: setCursor }).then(
      (view) => {
        if (disposed) view.destroy();
        else viewRef.current = view;
      },
    );

    return () => {
      disposed = true;
      viewRef.current?.destroy();
      viewRef.current = undefined;
    };
  }, []);

  const bar = scaleBar(camera.scale);

  return (
    <div className="map">
      <div ref={containerRef} className="map-canvas" />

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
