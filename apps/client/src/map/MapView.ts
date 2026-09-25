import { Application, Container, Graphics } from 'pixi.js';
import type { Unit, UnitId, Vec2 } from '@tds/engine';
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
import { hitTestUnits } from './hitTest';
import { createUnitSymbol } from './symbols';

export interface MapViewOptions {
  /** Wird aufgerufen, wenn sich Ausschnitt oder Zoom ändern. */
  onCameraChange?: (camera: Camera) => void;
  /** Weltposition unter dem Mauszeiger, `undefined` wenn die Maus die Karte verlässt. */
  onCursorMove?: (world: Vec2 | undefined) => void;
  /** Klick auf eine freie Stelle der Karte (ohne Ziehen). */
  onMapClick?: (world: Vec2, modifiers: { shiftKey: boolean }) => void;
  /** Eine Einheit wurde mit der Maus an eine neue Position gezogen. */
  onUnitDragEnd?: (unitId: UnitId, position: Vec2) => void;
}

const COLORS = {
  background: 0xf4f4f2,
  gridMinor: 0xe2e2dc,
  gridMajor: 0xc4c4bc,
  origin: 0xc8102e,
};

/** Wie stark ein Mausrad-Schritt zoomt. Größer = schneller. */
const WHEEL_ZOOM_SPEED = 0.0015;

/** Bis zu dieser Mausbewegung in Pixeln zählt Drücken + Loslassen als Klick, nicht als Ziehen. */
const CLICK_TOLERANCE_PX = 4;

/** Was gerade mit gedrückter Maustaste passiert: Karte verschieben oder Einheit ziehen. */
type Drag =
  | { kind: 'pan'; pointerId: number; start: Vec2; last: Vec2; moved: boolean }
  | {
      kind: 'unit';
      pointerId: number;
      start: Vec2;
      unitId: UnitId;
      /** Abstand zwischen Einheitenmitte und Griffpunkt, damit das Zeichen nicht zur Maus springt. */
      grabOffset: Vec2;
      position: Vec2;
      moved: boolean;
    };

/**
 * Die Kartenansicht: zeichnet mit PixiJS (WebGL) und verarbeitet Maus und Mausrad.
 * Kennt weder React noch die Engine-Befehle – sie zeigt Einheiten an und meldet Benutzeraktionen
 * über die Callbacks in `MapViewOptions`. Was daraus wird, entscheidet `MapCanvas`.
 */
export class MapView {
  readonly #app: Application;
  readonly #options: MapViewOptions;
  readonly #grid = new Graphics();
  readonly #unitLayer = new Container();
  /** Ein Zeichen je Einheit, damit bei Änderungen nicht alles neu erzeugt werden muss. */
  readonly #symbols = new Map<UnitId, Container>();
  #units: readonly Unit[] = [];
  #camera: Camera = defaultCamera;
  /** Muss neu gezeichnet werden? Verhindert Zeichnen in jedem Bild, wenn sich nichts ändert. */
  #dirty = true;
  #lastViewport: Viewport = { width: 0, height: 0 };
  #drag: Drag | undefined;
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
    app.stage.addChild(this.#grid, this.#unitLayer);
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

  /** Übernimmt die Einheiten aus dem Spielstand: legt neue Zeichen an und entfernt alte. */
  setUnits(units: Readonly<Record<UnitId, Unit>>): void {
    this.#units = Object.values(units);

    for (const [id, symbol] of this.#symbols) {
      if (!units[id]) {
        symbol.destroy({ children: true });
        this.#symbols.delete(id);
      }
    }
    for (const unit of this.#units) {
      if (!this.#symbols.has(unit.id)) {
        const symbol = createUnitSymbol(unit.unitType);
        this.#symbols.set(unit.id, symbol);
        this.#unitLayer.addChild(symbol);
      }
    }
    this.#dirty = true;
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
    this.#positionUnits(viewport);
  };

  /** Setzt jedes Zeichen an die Bildschirmposition seiner Einheit. */
  #positionUnits(viewport: Viewport): void {
    const drag = this.#drag?.kind === 'unit' ? this.#drag : undefined;
    for (const unit of this.#units) {
      const symbol = this.#symbols.get(unit.id);
      if (!symbol) continue;
      // Während des Ziehens steht das Zeichen an der Mausposition, die Einheit selbst noch am alten Ort.
      const position = drag?.unitId === unit.id ? drag.position : unit.position;
      const screen = worldToScreen(this.#camera, viewport, position);
      symbol.position.set(screen.x, screen.y);
      symbol.angle = unit.rotation;
    }
  }

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
    const toWorld = (screen: Vec2) => screenToWorld(this.#camera, this.#viewport, screen);

    const onPointerDown = (e: PointerEvent) => {
      // Linke (0) oder mittlere (1) Maustaste
      if (e.button !== 0 && e.button !== 1) return;
      canvas.setPointerCapture(e.pointerId);
      const point = localPoint(e);

      // Linke Maustaste auf einer Einheit → Einheit ziehen, sonst Karte verschieben.
      const unit =
        e.button === 0 ? hitTestUnits(this.#units, this.#camera, this.#viewport, point) : undefined;
      if (unit) {
        const world = toWorld(point);
        this.#drag = {
          kind: 'unit',
          pointerId: e.pointerId,
          start: point,
          unitId: unit.id,
          grabOffset: { x: unit.position.x - world.x, y: unit.position.y - world.y },
          position: unit.position,
          moved: false,
        };
      } else {
        this.#drag = {
          kind: 'pan',
          pointerId: e.pointerId,
          start: point,
          last: point,
          moved: false,
        };
      }
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      const point = localPoint(e);
      const drag = this.#drag;
      if (drag?.pointerId === e.pointerId) {
        drag.moved ||= distance(point, drag.start) > CLICK_TOLERANCE_PX;
        if (drag.kind === 'pan') {
          this.setCamera(panBy(this.#camera, point.x - drag.last.x, point.y - drag.last.y));
          drag.last = point;
        } else if (drag.moved) {
          const world = toWorld(point);
          drag.position = { x: world.x + drag.grabOffset.x, y: world.y + drag.grabOffset.y };
          this.#dirty = true;
        }
      }
      this.#options.onCursorMove?.(toWorld(point));
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = this.#drag;
      if (drag?.pointerId !== e.pointerId) return;
      this.#drag = undefined;
      this.#dirty = true;
      canvas.style.cursor = '';

      if (drag.kind === 'unit' && drag.moved) {
        this.#options.onUnitDragEnd?.(drag.unitId, drag.position);
      } else if (drag.kind === 'pan' && !drag.moved && e.type === 'pointerup') {
        this.#options.onMapClick?.(toWorld(localPoint(e)), { shiftKey: e.shiftKey });
      }
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

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
