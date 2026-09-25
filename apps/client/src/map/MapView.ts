import { Application, Graphics } from 'pixi.js';
import type { Vec2 } from '@tds/engine';
import {
  defaultCamera,
  gridStep,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Camera,
  type Viewport,
} from './camera';

export interface MapViewOptions {
  /** Wird aufgerufen, wenn sich Ausschnitt oder Zoom ändern. */
  onCameraChange?: (camera: Camera) => void;
  /** Weltposition unter dem Mauszeiger, `undefined` wenn die Maus die Karte verlässt. */
  onCursorMove?: (world: Vec2 | undefined) => void;
}

const COLORS = {
  background: 0xf4f4f2,
  gridMinor: 0xe2e2dc,
  gridMajor: 0xc4c4bc,
  origin: 0xc8102e,
};

/** Wie stark ein Mausrad-Schritt zoomt. Größer = schneller. */
const WHEEL_ZOOM_SPEED = 0.0015;

/**
 * Die Kartenansicht: zeichnet mit PixiJS (WebGL) und verarbeitet Maus und Mausrad.
 * Kennt React nicht – die React-Komponente `MapCanvas` erzeugt und zerstört sie nur.
 */
export class MapView {
  readonly #app: Application;
  readonly #options: MapViewOptions;
  readonly #grid = new Graphics();
  #camera: Camera = defaultCamera;
  /** Muss neu gezeichnet werden? Verhindert Zeichnen in jedem Bild, wenn sich nichts ändert. */
  #dirty = true;
  #lastViewport: Viewport = { width: 0, height: 0 };
  #drag: { pointerId: number; last: Vec2 } | undefined;
  readonly #removeListeners: () => void;

  /** PixiJS startet asynchron, daher erzeugt man die Ansicht über `MapView.create`. */
  static async create(container: HTMLElement, options: MapViewOptions = {}): Promise<MapView> {
    const app = new Application();
    await app.init({
      resizeTo: container,
      background: COLORS.background,
      antialias: true,
      // Scharfe Darstellung auf hochauflösenden Bildschirmen
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    container.appendChild(app.canvas);
    return new MapView(app, options);
  }

  private constructor(app: Application, options: MapViewOptions) {
    this.#app = app;
    this.#options = options;
    app.stage.addChild(this.#grid);
    app.ticker.add(this.#render);
    this.#removeListeners = this.#attachInput(app.canvas);
    options.onCameraChange?.(this.#camera);
  }

  get camera(): Camera {
    return this.#camera;
  }

  setCamera(camera: Camera): void {
    this.#camera = camera;
    this.#dirty = true;
    this.#options.onCameraChange?.(camera);
  }

  destroy(): void {
    this.#removeListeners();
    this.#app.destroy(true, { children: true });
  }

  get #viewport(): Viewport {
    return { width: this.#app.screen.width, height: this.#app.screen.height };
  }

  /** Läuft in jedem Bild (ca. 60× pro Sekunde), zeichnet aber nur bei Änderungen. */
  #render = (): void => {
    const viewport = this.#viewport;
    const resized =
      viewport.width !== this.#lastViewport.width || viewport.height !== this.#lastViewport.height;
    if (!this.#dirty && !resized) return;
    this.#lastViewport = viewport;
    this.#dirty = false;
    this.#drawGrid(viewport);
  };

  /**
   * Das Raster wird in Bildschirmpixeln gezeichnet, nicht in Metern:
   * So bleiben die Linien bei jedem Zoom genau 1 px dünn.
   */
  #drawGrid(viewport: Viewport): void {
    const camera = this.#camera;
    const step = gridStep(camera.scale);
    const majorStep = step * 10;
    const topLeft = screenToWorld(camera, viewport, { x: 0, y: 0 });
    const bottomRight = screenToWorld(camera, viewport, { x: viewport.width, y: viewport.height });

    const g = this.#grid;
    g.clear();

    // Erst alle dünnen, dann alle kräftigen Linien, damit die kräftigen oben liegen.
    for (const major of [false, true]) {
      const every = major ? majorStep : step;
      for (let x = Math.ceil(topLeft.x / every) * every; x <= bottomRight.x; x += every) {
        if (!major && isMultiple(x, majorStep)) continue;
        const sx = worldToScreen(camera, viewport, { x, y: 0 }).x;
        g.moveTo(sx, 0).lineTo(sx, viewport.height);
      }
      for (let y = Math.ceil(topLeft.y / every) * every; y <= bottomRight.y; y += every) {
        if (!major && isMultiple(y, majorStep)) continue;
        const sy = worldToScreen(camera, viewport, { x: 0, y }).y;
        g.moveTo(0, sy).lineTo(viewport.width, sy);
      }
      g.stroke({ color: major ? COLORS.gridMajor : COLORS.gridMinor, pixelLine: true });
    }

    // Nullpunkt als kleines Kreuz, damit man sich orientieren kann.
    const origin = worldToScreen(camera, viewport, { x: 0, y: 0 });
    g.moveTo(origin.x - 8, origin.y)
      .lineTo(origin.x + 8, origin.y)
      .moveTo(origin.x, origin.y - 8)
      .lineTo(origin.x, origin.y + 8)
      .stroke({ color: COLORS.origin, width: 2 });
  }

  /** Verbindet Maus und Mausrad mit der Kamera. Gibt eine Funktion zurück, die alles wieder löst. */
  #attachInput(canvas: HTMLCanvasElement): () => void {
    const localPoint = (e: MouseEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      // Linke (0) oder mittlere (1) Maustaste verschiebt die Karte.
      if (e.button !== 0 && e.button !== 1) return;
      canvas.setPointerCapture(e.pointerId);
      this.#drag = { pointerId: e.pointerId, last: localPoint(e) };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      const point = localPoint(e);
      if (this.#drag?.pointerId === e.pointerId) {
        this.setCamera(
          panBy(this.#camera, point.x - this.#drag.last.x, point.y - this.#drag.last.y),
        );
        this.#drag.last = point;
      }
      this.#options.onCursorMove?.(screenToWorld(this.#camera, this.#viewport, point));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.#drag?.pointerId !== e.pointerId) return;
      this.#drag = undefined;
      canvas.style.cursor = '';
    };

    const onPointerLeave = () => this.#options.onCursorMove?.(undefined);

    const onWheel = (e: WheelEvent) => {
      // Verhindert, dass die ganze Seite mitscrollt oder der Browser selbst zoomt.
      e.preventDefault();
      // deltaMode 1 = Zeilen statt Pixel (manche Mäuse unter Firefox) → grob in Pixel umrechnen.
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-delta * WHEEL_ZOOM_SPEED);
      this.setCamera(zoomAt(this.#camera, this.#viewport, localPoint(e), factor));
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    // `passive: false`, weil wir preventDefault aufrufen
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
    };
  }
}

/** Liegt `value` (ungefähr) auf einem Vielfachen von `step`? Toleranz wegen Rundungsfehlern. */
function isMultiple(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}
