import { Application, Container, Graphics, type Text } from 'pixi.js';
import { translatePoints, type Vec2 } from '@tds/engine';
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
  lengthHandlePosition,
  lengthTowards,
  resizeHandlePosition,
  rotationHandlePosition,
  rotationTowards,
} from './hitTest';
import { isArea, refKey, sameRef, type MapItem, type MapItemRef } from './mapItems';
import {
  SYMBOL_PX_PER_METER,
  createCaption,
  createItemSymbol,
  drawArea,
  drawBuilding,
  drawBuildingSelection,
  drawLengthSymbol,
  drawSelection,
  drawShapePreview,
} from './symbols';

/** Zeichenwerkzeug für Gebäude: Rechteck aufziehen oder Polygon Punkt für Punkt setzen. */
export type DrawMode = 'rectangle' | 'polygon';

export interface MapViewOptions {
  /** Wird aufgerufen, wenn sich Ausschnitt, Zoom oder die Fenstergröße ändern. */
  onCameraChange?: (camera: Camera, viewport: Viewport) => void;
  /**
   * `false` = nur anzeigen, keine Maus- und Mausradbedienung (z. B. auf dem Beamer).
   * Den Ausschnitt setzt dann nur noch `setCamera`. Standard: `true`.
   */
  interactive?: boolean;
  /** Weltposition unter dem Mauszeiger, `undefined` wenn die Maus die Karte verlässt. */
  onCursorMove?: (world: Vec2 | undefined) => void;
  /** Klick auf eine freie Stelle der Karte (ohne Ziehen). */
  onMapClick?: (world: Vec2, modifiers: { shiftKey: boolean }) => void;
  /** Ein Objekt wurde angeklickt (auch zu Beginn des Ziehens). */
  onItemSelect?: (ref: MapItemRef) => void;
  /** Ein Objekt wurde mit der Maus von `from` an eine neue Position gezogen. */
  onItemMoveEnd?: (ref: MapItemRef, position: Vec2, from: Vec2) => void;
  /** Mit dem Zeichenwerkzeug wurde ein Grundriss fertig gezeichnet (Eckpunkte in Metern). */
  onShapeDrawn?: (outline: Vec2[]) => void;
  /** Ein Objekt wurde am Drehgriff gedreht. */
  onItemRotateEnd?: (ref: MapItemRef, rotation: number) => void;
  /** Eine Fläche wurde am Größen-Griff auf einen neuen Radius in Metern gezogen. */
  onItemResizeEnd?: (ref: MapItemRef, radius: number) => void;
  /** Ein Objekt wurde am Längen-Griff auf eine neue Länge in Metern gezogen. */
  onItemLengthEnd?: (ref: MapItemRef, length: number) => void;
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

/** Kleinste Länge in Metern beim Ziehen am Längen-Griff. */
const MIN_LENGTH = 1;

/** Klick so nah am ersten Eckpunkt schließt das Polygon. */
const CLOSE_POLYGON_PX = 9;

/** Beschriftungen von Gebäuden erst zeigen, wenn das Gebäude auf dem Bildschirm so breit ist. */
const MIN_CAPTION_WIDTH_PX = 50;

/**
 * Was gerade mit gedrückter Maustaste passiert: Karte verschieben, Objekt ziehen, drehen
 * oder in der Größe ändern. Während des Ziehens hält `Drag` den Zwischenstand; erst beim
 * Loslassen wird daraus ein Befehl.
 */
type Drag = { pointerId: number; start: Vec2; moved: boolean } & (
  | {
      kind: 'move';
      ref: MapItemRef;
      /** Abstand zwischen Objektmitte und Griffpunkt, damit das Zeichen nicht zur Maus springt. */
      grabOffset: Vec2;
      position: Vec2;
      from: Vec2;
    }
  /**
   * Karte verschieben, die in einem (noch nicht ausgewählten) Gebäude begann: Ein Klick ohne
   * Bewegung wählt das Gebäude aus, Ziehen verschiebt die Karte – auch in großen Gebäuden.
   */
  | { kind: 'pan'; last: Vec2; selectOnClick?: MapItemRef }
  | { kind: 'draw-rectangle'; from: Vec2; to: Vec2 }
  | { kind: 'rotate'; ref: MapItemRef; rotation: number }
  | { kind: 'resize'; ref: MapItemRef; radius: number }
  | { kind: 'length'; ref: MapItemRef; length: number }
);

/**
 * Was für ein Objekt gezeichnet wird: das Zeichen, bei Flächen der Kreis darunter und bei
 * einstellbarer Länge eine Grafik, die bei jeder Änderung neu gezeichnet wird.
 */
interface ItemDisplay {
  readonly symbol: Container;
  readonly area?: Graphics;
  readonly lengthGraphic?: Graphics;
  /** Bei Gebäuden: Grundriss (in Bildschirmpixeln gezeichnet) und Beschriftung. */
  readonly outlineGraphic?: Graphics;
  readonly caption?: Text;
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
  /** Gebäude liegen ganz unten, darüber Flächen, darüber alle Zeichen. */
  readonly #buildingLayer = new Container();
  /** Flächen liegen unter allen Zeichen, damit ein Feuer kein Fahrzeug verdeckt. */
  readonly #areaLayer = new Container();
  readonly #symbolLayer = new Container();
  readonly #selection = new Graphics();
  /** Vorschau beim Zeichnen eines Gebäudes. */
  readonly #preview = new Graphics();
  #drawMode: DrawMode | undefined;
  /** Bereits gesetzte Eckpunkte beim Polygon-Zeichnen, in Metern. */
  #polygonPoints: Vec2[] = [];
  /** Letzte Mausposition in Metern – für die Linie zum nächsten Eckpunkt. */
  #cursorWorld: Vec2 | undefined;
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
    app.stage.addChild(
      this.#grid,
      this.#buildingLayer,
      this.#areaLayer,
      this.#symbolLayer,
      this.#selection,
      this.#preview,
    );
    app.ticker.add(this.#render);
    this.#removeListeners =
      options.interactive === false ? () => {} : this.#attachInput(app.canvas);
    options.onCameraChange?.(this.#camera, this.#viewport);
  }

  get camera(): Camera {
    return this.#camera;
  }

  /** Größe des Kartenfensters in Pixeln. */
  get viewport(): Viewport {
    return this.#viewport;
  }

  setCamera(camera: Camera): void {
    this.#camera = camera;
    this.#dirty = true;
    this.#options.onCameraChange?.(camera, this.#viewport);
  }

  /** Übernimmt die Objekte aus dem Spielstand: legt neue Zeichen an und entfernt alte. */
  setItems(items: readonly MapItem[]): void {
    this.#items = items;
    const keys = new Set(items.map((item) => refKey(item.ref)));

    for (const [key, display] of this.#displays) {
      if (!keys.has(key)) {
        display.symbol.destroy({ children: true });
        display.area?.destroy();
        display.outlineGraphic?.destroy();
        this.#displays.delete(key);
      }
    }
    for (const item of items) {
      const key = refKey(item.ref);
      if (this.#displays.has(key)) continue;
      const display = createDisplay(item);
      this.#displays.set(key, display);
      if (display.outlineGraphic) {
        this.#buildingLayer.addChild(display.outlineGraphic);
        // Beschriftungen über den Flächen, damit ein Feuer den Gebäudenamen nicht verdeckt.
        this.#symbolLayer.addChildAt(display.symbol, 0);
      } else {
        this.#symbolLayer.addChild(display.symbol);
      }
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

  /**
   * Schaltet das Zeichenwerkzeug für Gebäude ein oder aus. Solange es aktiv ist, lassen sich
   * keine Objekte auswählen; Karte verschieben und zoomen geht weiter.
   */
  setDrawMode(mode: DrawMode | undefined): void {
    if (mode === this.#drawMode) return;
    this.#drawMode = mode;
    this.#polygonPoints = [];
    this.#dirty = true;
  }

  /** Schließt das Polygon ab (z. B. mit Enter). Mit weniger als drei Punkten passiert nichts. */
  finishPolygon(): void {
    const points = withoutDuplicates(this.#polygonPoints);
    if (points.length < 3) return;
    this.#polygonPoints = [];
    this.#dirty = true;
    this.#options.onShapeDrawn?.(points);
  }

  /** Nimmt den zuletzt gesetzten Eckpunkt zurück (z. B. mit ⌫). */
  undoPolygonPoint(): void {
    this.#polygonPoints = this.#polygonPoints.slice(0, -1);
    this.#dirty = true;
  }

  /** Verwirft das angefangene Polygon. */
  cancelPolygon(): void {
    this.#polygonPoints = [];
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
    if (resized) this.#options.onCameraChange?.(this.#camera, viewport);
    this.#dirty = false;
    this.#drawGrid(viewport);
    this.#positionItems(viewport);
    this.#drawPreview(viewport);
  };

  /** Vorschau des Gebäudes, das gerade gezeichnet wird. */
  #drawPreview(viewport: Viewport): void {
    const toScreen = (p: Vec2) => worldToScreen(this.#camera, viewport, p);
    const drag = this.#drag;
    if (drag?.kind === 'draw-rectangle' && drag.moved) {
      drawShapePreview(
        this.#preview,
        rectangle(drag.from, drag.to).map(toScreen),
        undefined,
        false,
      );
    } else if (this.#drawMode === 'polygon' && this.#polygonPoints.length > 0) {
      const points = this.#polygonPoints.map(toScreen);
      const cursor = this.#cursorWorld && toScreen(this.#cursorWorld);
      drawShapePreview(this.#preview, points, cursor, this.#canClosePolygonAt(cursor));
    } else {
      this.#preview.clear();
    }
  }

  /** Würde ein Klick an `screenPoint` das Polygon schließen (nahe am ersten Punkt)? */
  #canClosePolygonAt(screenPoint: Vec2 | undefined): boolean {
    const first = this.#polygonPoints[0];
    if (!screenPoint || !first || this.#polygonPoints.length < 3) return false;
    return (
      distance(screenPoint, worldToScreen(this.#camera, this.#viewport, first)) <= CLOSE_POLYGON_PX
    );
  }

  /** Setzt Zeichen, Flächen und Auswahlmarkierung an die Bildschirmposition ihres Objekts. */
  #positionItems(viewport: Viewport): void {
    this.#selection.visible = false;
    for (const original of this.#items) {
      const display = this.#displays.get(refKey(original.ref));
      if (!display) continue;
      const item = this.#displayedItem(original);
      const screen = worldToScreen(this.#camera, viewport, item.position);
      const isSelected = this.#selected !== undefined && sameRef(item.ref, this.#selected);

      if (item.outline && display.outlineGraphic && display.caption) {
        const outline = item.outline.map((p) => worldToScreen(this.#camera, viewport, p));
        drawBuilding(display.outlineGraphic, outline);
        updateCaption(display.caption, item.caption ?? '', screen, outline);
        if (isSelected) {
          drawBuildingSelection(this.#selection, outline);
          this.#selection.position.set(0, 0);
          this.#selection.angle = 0;
          this.#selection.visible = true;
        }
        continue;
      }
      const radiusPx = (item.radius ?? 0) * this.#camera.scale;
      const alpha = item.dimmed ? DIMMED_ALPHA : 1;

      display.symbol.position.set(screen.x, screen.y);
      display.symbol.angle = item.rotation;
      display.symbol.alpha = alpha;
      // Maßstäblich: Zeichen sind bei SYMBOL_PX_PER_METER erzeugt und werden auf den Zoom skaliert.
      // Objekte mit einstellbarer Länge werden direkt in Pixeln neu gezeichnet.
      if (display.lengthGraphic) {
        drawLengthSymbol(display.lengthGraphic, item, this.#camera.scale);
      } else {
        display.symbol.scale.set(this.#camera.scale / SYMBOL_PX_PER_METER);
      }
      if (display.area) {
        drawArea(display.area, item.symbolType, radiusPx);
        display.area.position.set(screen.x, screen.y);
        display.area.alpha = alpha;
      }
      if (isSelected) {
        drawSelection(this.#selection, item, radiusPx, this.#camera.scale);
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
    if (!drag || drag.kind === 'pan' || drag.kind === 'draw-rectangle') return item;
    if (!sameRef(drag.ref, item.ref)) return item;
    switch (drag.kind) {
      case 'move': {
        // Gebäude wandern samt Grundriss mit.
        const offset = {
          x: drag.position.x - item.position.x,
          y: drag.position.y - item.position.y,
        };
        return {
          ...item,
          position: drag.position,
          ...(item.outline && { outline: translatePoints(item.outline, offset) }),
        };
      }
      case 'rotate':
        return { ...item, rotation: drag.rotation };
      case 'resize':
        return { ...item, radius: drag.radius };
      case 'length':
        return {
          ...item,
          length: drag.length,
          size: { ...item.size, width: drag.length },
        };
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
  #hitTestHandles(point: Vec2): 'rotate' | 'resize' | 'length' | undefined {
    const selected = this.#selectedItem();
    if (!selected) return undefined;
    const center = this.#screenPosition(selected);
    const scale = this.#camera.scale;
    if (isArea(selected)) {
      const handle = resizeHandlePosition(center, selected.radius * scale);
      return hitTestHandle(handle, point) ? 'resize' : undefined;
    }
    if (
      selected.length !== undefined &&
      hitTestHandle(lengthHandlePosition(center, selected, scale), point)
    ) {
      return 'length';
    }
    if (
      selected.rotatable &&
      hitTestHandle(rotationHandlePosition(center, selected, scale), point)
    ) {
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

      // Zeichenwerkzeug: Rechteck wird aufgezogen; beim Polygon setzt ein Klick (ohne Ziehen)
      // einen Eckpunkt, Ziehen verschiebt wie gewohnt die Karte.
      if (this.#drawMode) {
        const world = toWorld(point);
        this.#drag =
          this.#drawMode === 'rectangle' && e.button === 0
            ? { ...base, kind: 'draw-rectangle', from: world, to: world }
            : { ...base, kind: 'pan', last: point };
        return;
      }

      // Linke Maustaste: zuerst die Griffe der Auswahl, dann die Objekte.
      // Alles andere (und die mittlere Taste) verschiebt die Karte.
      const handle = e.button === 0 ? this.#hitTestHandles(point) : undefined;
      const selected = this.#selectedItem();
      if (handle && selected) {
        const { ref } = selected;
        this.#drag =
          handle === 'rotate'
            ? { ...base, kind: 'rotate', ref, rotation: selected.rotation }
            : handle === 'resize'
              ? { ...base, kind: 'resize', ref, radius: selected.radius ?? 0 }
              : { ...base, kind: 'length', ref, length: selected.length ?? 0 };
        return;
      }

      const item =
        e.button === 0 ? hitTestItems(this.#items, this.#camera, this.#viewport, point) : undefined;
      // Ein noch nicht ausgewähltes Gebäude wird erst beim Loslassen ausgewählt; Ziehen
      // verschiebt bis dahin die Karte (siehe `selectOnClick`).
      const isUnselectedBuilding =
        item?.outline !== undefined && !(selected && sameRef(selected.ref, item.ref));
      if (item && isUnselectedBuilding) {
        this.#drag = { ...base, kind: 'pan', last: point, selectOnClick: item.ref };
      } else if (item) {
        this.#options.onItemSelect?.(item.ref);
        const world = toWorld(point);
        this.#drag = {
          ...base,
          kind: 'move',
          ref: item.ref,
          grabOffset: { x: item.position.x - world.x, y: item.position.y - world.y },
          position: item.position,
          from: item.position,
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
        } else if (drag.kind === 'draw-rectangle') {
          drag.to = roundPoint(toWorld(point));
          this.#dirty = true;
        } else if (drag.moved) {
          this.#updateDrag(drag, point, e.shiftKey);
          this.#dirty = true;
        }
      }
      this.#cursorWorld = toWorld(point);
      if (this.#drawMode === 'polygon') this.#dirty = true;
      this.#options.onCursorMove?.(this.#cursorWorld);
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = this.#drag;
      if (drag?.pointerId !== e.pointerId) return;
      this.#drag = undefined;
      this.#dirty = true;
      canvas.style.cursor = '';

      if (drag.kind === 'pan') {
        if (drag.moved || e.type !== 'pointerup') return;
        const point = localPoint(e);
        if (this.#drawMode === 'polygon') {
          this.#addPolygonPoint(point);
        } else if (drag.selectOnClick) {
          this.#options.onItemSelect?.(drag.selectOnClick);
        } else {
          this.#options.onMapClick?.(toWorld(point), { shiftKey: e.shiftKey });
        }
        return;
      }
      if (drag.kind === 'draw-rectangle') {
        if (drag.moved) this.#options.onShapeDrawn?.(rectangle(drag.from, drag.to));
        return;
      }
      if (!drag.moved) return;
      switch (drag.kind) {
        case 'move':
          this.#options.onItemMoveEnd?.(drag.ref, drag.position, drag.from);
          break;
        case 'rotate':
          this.#options.onItemRotateEnd?.(drag.ref, drag.rotation);
          break;
        case 'resize':
          this.#options.onItemResizeEnd?.(drag.ref, drag.radius);
          break;
        case 'length':
          this.#options.onItemLengthEnd?.(drag.ref, drag.length);
          break;
      }
    };

    const onPointerLeave = () => {
      this.#cursorWorld = undefined;
      this.#dirty = true;
      this.#options.onCursorMove?.(undefined);
    };

    // Doppelklick schließt das Polygon. Die beiden Klicks davor haben schon Punkte gesetzt –
    // doppelte Punkte entfernt `finishPolygon`.
    const onDoubleClick = () => {
      if (this.#drawMode === 'polygon') this.finishPolygon();
    };

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
    canvas.addEventListener('dblclick', onDoubleClick);
    // `passive: false`, weil wir preventDefault aufrufen
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  /** Setzt beim Polygon-Zeichnen einen Eckpunkt – oder schließt ab, wenn nah am ersten Punkt. */
  #addPolygonPoint(screenPoint: Vec2): void {
    if (this.#canClosePolygonAt(screenPoint)) {
      this.finishPolygon();
      return;
    }
    const world = screenToWorld(this.#camera, this.#viewport, screenPoint);
    this.#polygonPoints = [...this.#polygonPoints, roundPoint(world)];
    this.#dirty = true;
  }

  /** Aktualisiert den Zwischenstand beim Ziehen, Drehen oder Größe ändern. */
  #updateDrag(
    drag: Exclude<Drag, { kind: 'pan' } | { kind: 'draw-rectangle' }>,
    point: Vec2,
    shiftKey: boolean,
  ): void {
    if (drag.kind === 'move') {
      const world = screenToWorld(this.#camera, this.#viewport, point);
      drag.position = { x: world.x + drag.grabOffset.x, y: world.y + drag.grabOffset.y };
      return;
    }
    const item = this.#items.find((i) => sameRef(i.ref, drag.ref));
    if (!item) return;
    const center = this.#screenPosition(item);

    // Längen und Radien auf 0,1 m runden, damit im Einsatztagebuch keine krummen Werte stehen;
    // mit Umschalt auf ganze Meter.
    // (Teilen statt mit 0,1 malnehmen, sonst entstehen Werte wie 3.3000000000000003.)
    const perMeter = shiftKey ? 1 : 10;
    const round = (meters: number) => Math.round(meters * perMeter) / perMeter;

    if (drag.kind === 'rotate') {
      const rotation = rotationTowards(center, point);
      // Mit Umschalt rastet die Drehung in festen Schritten ein, z. B. für exakt 90°.
      drag.rotation = shiftKey
        ? (Math.round(rotation / ROTATION_STEP) * ROTATION_STEP) % 360
        : rotation;
    } else if (drag.kind === 'resize') {
      drag.radius = Math.max(MIN_RADIUS, round(distance(center, point) / this.#camera.scale));
    } else {
      const meters = lengthTowards(center, item.rotation, point, this.#camera.scale);
      drag.length = Math.max(MIN_LENGTH, round(meters));
    }
  }
}

function createDisplay(item: MapItem): ItemDisplay {
  if (item.outline) {
    const caption = createCaption();
    const symbol = new Container();
    symbol.addChild(caption);
    return { symbol, outlineGraphic: new Graphics(), caption };
  }
  if (item.length !== undefined) {
    const lengthGraphic = new Graphics();
    const symbol = new Container();
    symbol.addChild(lengthGraphic);
    return { symbol, lengthGraphic };
  }
  return { symbol: createItemSymbol(item), ...(isArea(item) && { area: new Graphics() }) };
}

/** Setzt die Beschriftung eines Gebäudes in die Mitte; zu kleine Gebäude bleiben unbeschriftet. */
function updateCaption(caption: Text, text: string, center: Vec2, outline: readonly Vec2[]): void {
  if (caption.text !== text) caption.text = text;
  const xs = outline.map((p) => p.x);
  const width = Math.max(...xs) - Math.min(...xs);
  caption.visible = width >= Math.max(MIN_CAPTION_WIDTH_PX, caption.width + 8);
  caption.position.set(center.x, center.y);
}

/** Achsparalleles Rechteck aus zwei gegenüberliegenden Ecken (im Uhrzeigersinn). */
function rectangle(a: Vec2, b: Vec2): Vec2[] {
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y },
  ];
}

/** Auf 0,1 m runden, damit im Einsatztagebuch und in der Datei keine krummen Werte stehen. */
function roundPoint(p: Vec2): Vec2 {
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
}

/** Entfernt aufeinanderfolgende (fast) gleiche Punkte, z. B. die zwei Klicks eines Doppelklicks. */
function withoutDuplicates(points: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = [];
  for (const p of points) {
    const last = result.at(-1);
    if (!last || distance(last, p) > 0.2) result.push(p);
  }
  if (result.length > 1 && distance(result[0]!, result.at(-1)!) <= 0.2) result.pop();
  return result;
}

/** Liegt `value` (ungefähr) auf einem Vielfachen von `step`? Toleranz wegen Rundungsfehlern. */
function isMultiple(value: number, step: number): boolean {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
