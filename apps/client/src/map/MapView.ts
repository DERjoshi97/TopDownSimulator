import { Application, Container, Graphics } from 'pixi.js';
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
import {
  ROTATION_STEP,
  hitTestHandle,
  hitTestItems,
  resizeHandlePosition,
  rotationHandlePosition,
  rotationTowards,
} from './hitTest';
import { isArea, refKey, sameRef, type MapItem, type MapItemRef } from './mapItems';
import { createItemSymbol, drawArea, drawSelection } from './symbols';

export interface MapViewOptions {
  /** Wird aufgerufen, wenn sich Ausschnitt oder Zoom ändern. */
  onCameraChange?: (camera: Camera) => void;
  /** Weltposition unter dem Mauszeiger, `undefined` wenn die Maus die Karte verlässt. */
  onCursorMove?: (world: Vec2 | undefined) => void;
  /** Klick auf eine freie Stelle der Karte (ohne Ziehen). */
  onMapClick?: (world: Vec2, modifiers: { shiftKey: boolean }) => void;
  /** Ein Objekt wurde angeklickt (auch zu Beginn des Ziehens). */
  onItemSelect?: (ref: MapItemRef) => void;
  /** Ein Objekt wurde mit der Maus an eine neue Position gezogen. */
  onItemMoveEnd?: (ref: MapItemRef, position: Vec2) => void;
  /** Ein Objekt wurde am Drehgriff gedreht. */
  onItemRotateEnd?: (ref: MapItemRef, rotation: number) => void;
  /** Eine Fläche wurde am Größen-Griff auf einen neuen Radius in Metern gezogen. */
  onItemResizeEnd?: (ref: MapItemRef, radius: number) => void;
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

/** Deckkraft von Objekten, die nur die Übungsleitung sieht. */
const DIMMED_ALPHA = 0.45;

/** Kleinster Radius einer Fläche in Metern beim Ziehen am Größen-Griff. */
const MIN_RADIUS = 0.5;

/**
 * Was gerade mit gedrückter Maustaste passiert: Karte verschieben, Objekt ziehen, drehen
 * oder in der Größe ändern. Während des Ziehens hält `Drag` den Zwischenstand; erst beim
 * Loslassen wird daraus ein Befehl.
 */
type Drag = { pointerId: number; start: Vec2; moved: boolean } & (
  | { kind: 'pan'; last: Vec2 }
  | {
      kind: 'move';
      ref: MapItemRef;
      /** Abstand zwischen Objektmitte und Griffpunkt, damit das Zeichen nicht zur Maus springt. */
      grabOffset: Vec2;
      position: Vec2;
    }
  | { kind: 'rotate'; ref: MapItemRef; rotation: number }
  | { kind: 'resize'; ref: MapItemRef; radius: number }
);

/** Was für ein Objekt gezeichnet wird: das Zeichen und bei Flächen der Kreis darunter. */
interface ItemDisplay {
  readonly symbol: Container;
  readonly area?: Graphics;
}

/**
 * Die Kartenansicht: zeichnet mit PixiJS (WebGL) und verarbeitet Maus und Mausrad.
 * Kennt weder React noch die Engine-Befehle – sie zeigt Einheiten und Lageobjekte an und meldet
 * Benutzeraktionen über die Callbacks in `MapViewOptions`. Was daraus wird, entscheidet `MapCanvas`.
 */
export class MapView {
  readonly #app: Application;
  readonly #options: MapViewOptions;
  readonly #grid = new Graphics();
  /** Flächen liegen unter allen Zeichen, damit ein Feuer kein Fahrzeug verdeckt. */
  readonly #areaLayer = new Container();
  readonly #symbolLayer = new Container();
  readonly #selection = new Graphics();
  /** Anzeige je Objekt, damit bei Änderungen nicht alles neu erzeugt werden muss. */
  readonly #displays = new Map<string, ItemDisplay>();
  #items: readonly MapItem[] = [];
  #selected: MapItemRef | undefined;
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
    app.stage.addChild(this.#grid, this.#areaLayer, this.#symbolLayer, this.#selection);
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

  /** Übernimmt die Objekte aus dem Spielstand: legt neue Zeichen an und entfernt alte. */
  setItems(items: readonly MapItem[]): void {
    this.#items = items;
    const keys = new Set(items.map((item) => refKey(item.ref)));

    for (const [key, display] of this.#displays) {
      if (!keys.has(key)) {
        display.symbol.destroy({ children: true });
        display.area?.destroy();
        this.#displays.delete(key);
      }
    }
    for (const item of items) {
      const key = refKey(item.ref);
      if (this.#displays.has(key)) continue;
      const display: ItemDisplay = {
        symbol: createItemSymbol(item),
        ...(isArea(item) && { area: new Graphics() }),
      };
      this.#displays.set(key, display);
      this.#symbolLayer.addChild(display.symbol);
      if (display.area) this.#areaLayer.addChild(display.area);
    }
    // Zeichenreihenfolge an die Liste anpassen: Was später kommt, liegt oben.
    items.forEach((item, index) => {
      const symbol = this.#displays.get(refKey(item.ref))?.symbol;
      if (symbol) this.#symbolLayer.setChildIndex(symbol, index);
    });
    this.#dirty = true;
  }

  /** Markiert ein Objekt als ausgewählt. `undefined` hebt die Auswahl auf. */
  setSelection(ref: MapItemRef | undefined): void {
    this.#selected = ref;
    this.#dirty = true;
  }

  destroy(): void {
    this.#removeListeners();
    this.#app.destroy(true, { children: true });
  }

  get #viewport(): Viewport {
    return { width: this.#app.screen.width, height: this.#app.screen.height };
  }

  #screenPosition(item: MapItem): Vec2 {
    return worldToScreen(this.#camera, this.#viewport, item.position);
  }

  #selectedItem(): MapItem | undefined {
    const selected = this.#selected;
    return selected && this.#items.find((item) => sameRef(item.ref, selected));
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
    this.#positionItems(viewport);
  };

  /** Setzt Zeichen, Flächen und Auswahlmarkierung an die Bildschirmposition ihres Objekts. */
  #positionItems(viewport: Viewport): void {
    this.#selection.visible = false;
    for (const original of this.#items) {
      const display = this.#displays.get(refKey(original.ref));
      if (!display) continue;
      const item = this.#displayedItem(original);
      const screen = worldToScreen(this.#camera, viewport, item.position);
      const radiusPx = (item.radius ?? 0) * this.#camera.scale;
      const alpha = item.dimmed ? DIMMED_ALPHA : 1;

      display.symbol.position.set(screen.x, screen.y);
      display.symbol.angle = item.rotation;
      display.symbol.alpha = alpha;
      if (display.area) {
        drawArea(display.area, item.symbolType, radiusPx);
        display.area.position.set(screen.x, screen.y);
        display.area.alpha = alpha;
      }
      if (this.#selected && sameRef(item.ref, this.#selected)) {
        drawSelection(this.#selection, item, radiusPx);
        this.#selection.position.set(screen.x, screen.y);
        this.#selection.angle = item.rotation;
        this.#selection.visible = true;
      }
    }
  }

  /**
   * Wie ein Objekt gerade gezeigt wird. Während Ziehen, Drehen oder Größe ändern folgt das
   * Zeichen der Maus; das Objekt selbst ändert sich erst beim Loslassen per Befehl.
   */
  #displayedItem(item: MapItem): MapItem {
    const drag = this.#drag;
    if (!drag || drag.kind === 'pan' || !sameRef(drag.ref, item.ref)) return item;
    switch (drag.kind) {
      case 'move':
        return { ...item, position: drag.position };
      case 'rotate':
        return { ...item, rotation: drag.rotation };
      case 'resize':
        return { ...item, radius: drag.radius };
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

  /**
   * Welcher Griff des ausgewählten Objekts liegt unter `point`? Griffe liegen außerhalb des
   * Zeichens und werden daher vor den Objekten selbst geprüft.
   */
  #hitTestHandles(point: Vec2): 'rotate' | 'resize' | undefined {
    const selected = this.#selectedItem();
    if (!selected) return undefined;
    const center = this.#screenPosition(selected);
    if (isArea(selected)) {
      const handle = resizeHandlePosition(center, selected.radius * this.#camera.scale);
      return hitTestHandle(handle, point) ? 'resize' : undefined;
    }
    if (selected.rotatable && hitTestHandle(rotationHandlePosition(center, selected), point)) {
      return 'rotate';
    }
    return undefined;
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
      canvas.style.cursor = 'grabbing';
      const point = localPoint(e);
      const base = { pointerId: e.pointerId, start: point, moved: false };

      // Linke Maustaste: zuerst die Griffe der Auswahl, dann die Objekte.
      // Alles andere (und die mittlere Taste) verschiebt die Karte.
      const handle = e.button === 0 ? this.#hitTestHandles(point) : undefined;
      const selected = this.#selectedItem();
      if (handle && selected) {
        this.#drag =
          handle === 'rotate'
            ? { ...base, kind: 'rotate', ref: selected.ref, rotation: selected.rotation }
            : { ...base, kind: 'resize', ref: selected.ref, radius: selected.radius ?? 0 };
        return;
      }

      const item =
        e.button === 0 ? hitTestItems(this.#items, this.#camera, this.#viewport, point) : undefined;
      if (item) {
        this.#options.onItemSelect?.(item.ref);
        const world = toWorld(point);
        this.#drag = {
          ...base,
          kind: 'move',
          ref: item.ref,
          grabOffset: { x: item.position.x - world.x, y: item.position.y - world.y },
          position: item.position,
        };
      } else {
        this.#drag = { ...base, kind: 'pan', last: point };
      }
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
          this.#updateDrag(drag, point, e.shiftKey);
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

      if (drag.kind === 'pan') {
        if (!drag.moved && e.type === 'pointerup') {
          this.#options.onMapClick?.(toWorld(localPoint(e)), { shiftKey: e.shiftKey });
        }
        return;
      }
      if (!drag.moved) return;
      switch (drag.kind) {
        case 'move':
          this.#options.onItemMoveEnd?.(drag.ref, drag.position);
          break;
        case 'rotate':
          this.#options.onItemRotateEnd?.(drag.ref, drag.rotation);
          break;
        case 'resize':
          this.#options.onItemResizeEnd?.(drag.ref, drag.radius);
          break;
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

  /** Aktualisiert den Zwischenstand beim Ziehen, Drehen oder Größe ändern. */
  #updateDrag(drag: Exclude<Drag, { kind: 'pan' }>, point: Vec2, shiftKey: boolean): void {
    if (drag.kind === 'move') {
      const world = screenToWorld(this.#camera, this.#viewport, point);
      drag.position = { x: world.x + drag.grabOffset.x, y: world.y + drag.grabOffset.y };
      return;
    }
    const item = this.#items.find((i) => sameRef(i.ref, drag.ref));
    if (!item) return;
    const center = this.#screenPosition(item);

    if (drag.kind === 'rotate') {
      const rotation = rotationTowards(center, point);
      // Mit Umschalt rastet die Drehung in festen Schritten ein, z. B. für exakt 90°.
      drag.rotation = shiftKey
        ? (Math.round(rotation / ROTATION_STEP) * ROTATION_STEP) % 360
        : rotation;
    } else {
      const meters = distance(center, point) / this.#camera.scale;
      // Auf 0,1 m runden, damit im Einsatztagebuch keine krummen Werte stehen;
      // mit Umschalt auf ganze Meter.
      // (Teilen statt mit 0,1 malnehmen, sonst entstehen Werte wie 3.3000000000000003.)
      const perMeter = shiftKey ? 1 : 10;
      drag.radius = Math.max(MIN_RADIUS, Math.round(meters * perMeter) / perMeter);
    }
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
