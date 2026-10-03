import { useEffect, useRef, useState } from 'react';
import { exerciseTimeAt, formatExerciseTime, type ClockAnchor, type GameState } from '@tds/engine';
import { useTicker } from '../clock/useTicker';
import { MapView } from '../map/MapView';
import { fitCamera, formatDistance, scaleBar, type Camera, type Viewport } from '../map/camera';
import { mapItemsFromState } from '../map/mapItems';
import { connectPresentation } from './sync';

/** Wie lange der Hinweis auf den Vollbildmodus sichtbar bleibt. */
const HINT_MS = 5000;

type Connection = 'waiting' | 'connected' | 'closed';

/**
 * Präsentationsmodus für den Beamer: zeigt nur, was die Übenden sehen dürfen, ohne
 * Bedienelemente. Lage, Uhr und Kartenausschnitt kommen live aus dem Fenster der Übungsleitung.
 */
export function PresentationApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MapView | undefined>();
  const [connection, setConnection] = useState<Connection>('waiting');
  const [exercise, setExercise] = useState<{ state: GameState; clock: ClockAnchor }>();
  const [source, setSource] = useState<{ camera: Camera; viewport: Viewport }>();
  const [ownViewport, setOwnViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera | undefined>();
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    document.title = 'TopDownSimulator – Beamer';
    const id = setTimeout(() => setShowHint(false), HINT_MS);
    return () => clearTimeout(id);
  }, []);

  // Nachrichten aus dem Fenster der Übungsleitung
  useEffect(
    () =>
      connectPresentation((message) => {
        switch (message.type) {
          case 'exercise':
            setConnection('connected');
            setExercise({ state: message.state, clock: message.clock });
            break;
          case 'camera':
            setSource({ camera: message.camera, viewport: message.viewport });
            break;
          case 'bye':
            setConnection('closed');
            break;
        }
      }),
    [],
  );

  // Kartenansicht ohne Bedienung erzeugen (wie in MapCanvas asynchron, daher mit `disposed`).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let created: MapView | undefined;
    void MapView.create(container, {
      interactive: false,
      onCameraChange: (camera, viewport) => {
        setCamera(camera);
        // Nur bei echter Größenänderung neu einpassen, sonst entstünde eine Endlosschleife.
        setOwnViewport((prev) =>
          prev.width === viewport.width && prev.height === viewport.height ? prev : viewport,
        );
      },
    }).then((v) => {
      if (disposed) return v.destroy();
      created = v;
      setView(v);
    });
    return () => {
      disposed = true;
      created?.destroy();
    };
  }, []);

  useEffect(() => {
    if (view && exercise) view.setItems(mapItemsFromState(exercise.state));
  }, [view, exercise]);

  useEffect(() => {
    if (view && source && ownViewport.width > 0) {
      view.setCamera(fitCamera(source.camera, source.viewport, ownViewport));
    }
  }, [view, source, ownViewport]);

  const running = exercise?.state.clock.running ?? false;
  const now = useTicker(running);

  const bar = camera && scaleBar(camera.scale);

  return (
    <main className="app presentation" onDoubleClick={() => void toggleFullscreen()}>
      <div className="map">
        <div ref={containerRef} className="map-canvas presentation-canvas" />
      </div>

      {exercise && (
        <div className={`presentation-clock clock${running ? '' : ' clock--paused'}`}>
          {formatExerciseTime(exerciseTimeAt(exercise.clock, now))}
        </div>
      )}

      {bar && (
        <div className="map-overlay map-overlay--bottom-left">
          <div className="scale-bar" style={{ width: bar.px }}>
            {formatDistance(bar.meters)}
          </div>
        </div>
      )}

      {connection !== 'connected' && (
        <div className="presentation-status" role="status">
          {connection === 'waiting'
            ? 'Warte auf das Fenster der Übungsleitung …'
            : 'Fenster der Übungsleitung wurde geschlossen. Die letzte Lage bleibt stehen.'}
        </div>
      )}

      {showHint && <div className="presentation-hint">Doppelklick: Vollbild ein/aus</div>}
    </main>
  );
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}
