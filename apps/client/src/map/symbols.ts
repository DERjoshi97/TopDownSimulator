import { Container, Graphics, Text } from 'pixi.js';
import { findUnitType, type Organization } from '@tds/catalog';
import { HANDLE_RADIUS, rotationHandleOffset } from './hitTest';
import type { Vec2 } from '@tds/engine';
import { isArea, type MapItem } from './mapItems';

// Taktische Zeichen, vereinfacht nach DV 102. Werden im Code gezeichnet (keine Bilddateien):
// keine Lizenzfragen, scharf bei jeder Bildschirmauflösung, neue Typen nur per Katalogeintrag.
//
// Alle Zeichen sind maßstäblich: Sie werden in ihrer realen Größe gezeichnet und wachsen bzw.
// schrumpfen mit dem Zoom. Gezeichnet wird einmal bei `SYMBOL_PX_PER_METER`; die Kartenansicht
// skaliert das Zeichen danach auf den aktuellen Zoom.

/** Auflösung, in der Zeichen erzeugt werden. Höher = schärfer beim Hereinzoomen, aber mehr Speicher. */
export const SYMBOL_PX_PER_METER = 20;

/** Beschriftungen werden höher aufgelöst gerendert, damit sie auch stark vergrößert scharf bleiben. */
const LABEL_RESOLUTION = 4;

interface SymbolColors {
  fill: number;
  stroke: number;
  text: number;
}

const COLORS: Record<Organization, SymbolColors> = {
  fire: { fill: 0xc8102e, stroke: 0x1a1a1a, text: 0xffffff },
  ems: { fill: 0xffffff, stroke: 0x1a1a1a, text: 0x1a1a1a },
};

/** Für Einheitentypen, die (noch) nicht im Katalog stehen. */
const UNKNOWN_COLORS: SymbolColors = { fill: 0xb0b0b0, stroke: 0x1a1a1a, text: 0x1a1a1a };

const OUTLINE = 0x1a1a1a;

/** Farbe der Fläche je Lageobjekttyp. Unbekannte Typen werden grau. */
const AREA_COLORS: Record<string, number> = {
  fire: 0xe8590c,
  smoke: 0x6b6b6b,
  'hazardous-material': 0xf59f00,
};
const UNKNOWN_AREA_COLOR = 0x999999;

/** Blau statt Rot, damit sich die Auswahl deutlich von den Feuerwehr-Zeichen abhebt. */
const SELECTION_COLOR = 0x1f6feb;

/** Abstand des Auswahlrahmens zum Zeichen in Pixeln. */
const SELECTION_PADDING = 6;

/**
 * Erzeugt das Zeichen für eine Einheit oder ein Lageobjekt in der Auflösung `SYMBOL_PX_PER_METER`.
 * Mittelpunkt ist (0|0), damit Position und Drehung sich auf die Mitte beziehen.
 * Objekte mit einstellbarer Länge (Absperrung) zeichnet stattdessen `drawLengthSymbol`.
 */
export function createItemSymbol(item: MapItem): Container {
  const width = item.size.width * SYMBOL_PX_PER_METER;
  const height = item.size.height * SYMBOL_PX_PER_METER;
  switch (item.ref.kind) {
    case 'unit':
      return createUnitSymbol(item.symbolType, width, height);
    case 'mapFeature':
      return createHydrantSymbol(item.symbolType === 'hydrant-above-ground', width);
    default:
      return createSituationSymbol(item.symbolType, width, height);
  }
}

/**
 * Hydrant, angelehnt an die Hydrantenschilder: Überflurhydrant rot gefüllt mit weißem „Ü“,
 * Unterflurhydrant weiß mit rotem Ring und rotem „U“.
 */
function createHydrantSymbol(aboveGround: boolean, size: number): Container {
  const radius = size / 2;
  const g = new Graphics().circle(0, 0, radius);
  if (aboveGround) g.fill(0xc8102e).stroke({ color: OUTLINE, width: size * 0.06 });
  else g.fill(0xffffff).stroke({ color: 0xc8102e, width: size * 0.12 });
  const symbol = new Container();
  symbol.addChild(
    g,
    label(aboveGround ? 'Ü' : 'U', size * 0.55, aboveGround ? 0xffffff : 0xc8102e),
  );
  return symbol;
}

function createUnitSymbol(unitType: string, width: number, height: number): Container {
  const definition = findUnitType(unitType);
  const colors = definition ? COLORS[definition.organization] : UNKNOWN_COLORS;
  const left = -width / 2;
  const top = -height / 2;

  const shape = new Graphics();

  if (definition?.shape === 'vehicle') {
    // Zwei Räder unter dem Rechteck
    const wheel = height * 0.14;
    for (const x of [left + height * 0.4, -left - height * 0.4]) {
      shape.circle(x, -top + wheel, wheel).fill(colors.stroke);
    }
  }
  if (definition?.shape === 'team') {
    // Ein Punkt über dem Rechteck = Truppstärke
    const dot = height * 0.12;
    shape.circle(0, top - dot * 2, dot).fill(colors.stroke);
  }

  shape
    .rect(left, top, width, height)
    .fill(colors.fill)
    .stroke({ color: colors.stroke, width: height * 0.06 });

  const symbol = new Container();
  symbol.addChild(shape, label(unitType, height * 0.52, colors.text));
  return symbol;
}

/**
 * Zeichen der Lageobjekte. Sie sind für eine feste Entwurfsgröße gestaltet und werden
 * auf die Größe aus dem Katalog skaliert.
 */
function createSituationSymbol(objectType: string, width: number, height: number): Container {
  const design = new Container();
  const g = new Graphics();
  design.addChild(g);
  /** Entwurfsgröße in Pixeln, für die die Formen unten gezeichnet sind. */
  let designSize = { width: 24, height: 24 };

  switch (objectType) {
    case 'fire':
      // Flamme: außen rot, innen gelb
      g.moveTo(0, -11)
        .bezierCurveTo(7, -4, 10, 3, 6, 8)
        .bezierCurveTo(3, 11, -3, 11, -6, 8)
        .bezierCurveTo(-10, 3, -6, -3, 0, -11)
        .fill(0xc8102e)
        .stroke({ color: OUTLINE, width: 1 })
        .moveTo(0, -2)
        .bezierCurveTo(4, 2, 4, 7, 0, 8)
        .bezierCurveTo(-4, 7, -4, 2, 0, -2)
        .fill(0xffd43b);
      break;

    case 'smoke':
      // Rauchwolke aus drei Kreisen
      for (const [x, y, r] of [
        [-5, 2, 6],
        [5, 2, 6],
        [0, -4, 7],
      ] as const) {
        g.circle(x, y, r).fill(0x8a8a8a).stroke({ color: OUTLINE, width: 1 });
      }
      break;

    case 'hazardous-material':
      // Auf der Spitze stehendes Quadrat mit Ausrufezeichen
      g.poly([0, -12, 12, 0, 0, 12, -12, 0]).fill(0xf59f00).stroke({ color: OUTLINE, width: 1.5 });
      design.addChild(label('!', 14, OUTLINE));
      break;

    case 'person':
      // Kopf und Körper
      designSize = { width: 22, height: 30 };
      g.circle(0, -9, 5).fill(OUTLINE);
      g.roundRect(-7, -3, 14, 17, 4).fill(OUTLINE);
      break;

    default:
      g.circle(0, 0, 11).fill(0xb0b0b0).stroke({ color: OUTLINE, width: 1.5 });
      design.addChild(label('?', 13, OUTLINE));
  }

  design.scale.set(Math.min(width / designSize.width, height / designSize.height));
  const symbol = new Container();
  symbol.addChild(design);
  return symbol;
}

/**
 * Zeichnet ein Objekt mit einstellbarer Länge (Absperrung) direkt in Bildschirmpixeln:
 * rot-weiß gestreiftes Band mit Pfosten an den Enden. Wird bei jeder Änderung von Zoom oder
 * Länge neu gezeichnet, damit die Streifen nicht verzerrt werden.
 */
export function drawLengthSymbol(g: Graphics, item: MapItem, scale: number): void {
  const length = item.size.width * scale;
  const thickness = item.size.height * scale;
  // Streifen von 1 m, aber nie schmaler als 4 px – sonst flimmert es beim Herauszoomen.
  const stripe = Math.max(scale, 4);
  const left = -length / 2;

  g.clear();
  for (let x = left, i = 0; x < length / 2; x += stripe, i++) {
    const w = Math.min(stripe, length / 2 - x);
    g.rect(x, -thickness / 2, w, thickness).fill(i % 2 === 0 ? 0xc8102e : 0xffffff);
  }
  g.rect(left, -thickness / 2, length, thickness).stroke({
    color: OUTLINE,
    width: Math.max(0.5, thickness * 0.15),
  });
  for (const x of [left, -left]) {
    g.circle(x, 0, thickness * 0.9).fill(OUTLINE);
  }
}

/**
 * Zeichnet die Fläche eines Lageobjekts als Kreis. Wird bei jeder Änderung von Zoom oder Radius
 * neu gezeichnet, damit der Rand unabhängig vom Zoom gleich dünn bleibt.
 */
export function drawArea(g: Graphics, objectType: string, radiusPx: number): void {
  const color = AREA_COLORS[objectType] ?? UNKNOWN_AREA_COLOR;
  g.clear()
    .circle(0, 0, radiusPx)
    .fill({ color, alpha: 0.22 })
    .stroke({ color, alpha: 0.8, width: 2 });
}

/**
 * Markierung des ausgewählten Objekts in seinem eigenen Koordinatensystem (Mitte = 0|0):
 * bei Flächen ein Kreis mit Größen-Griff, sonst ein Rahmen mit Drehgriff darüber und – bei
 * einstellbarer Länge – einem Längen-Griff am rechten Ende.
 * Rahmen und Griffe sind Bedienelemente und bleiben beim Zoomen gleich dick.
 */
export function drawSelection(g: Graphics, item: MapItem, radiusPx: number, scale: number): void {
  const line = { color: SELECTION_COLOR, width: 2 };
  g.clear();

  if (isArea(item)) {
    g.circle(0, 0, radiusPx).stroke(line);
    g.circle(radiusPx, 0, HANDLE_RADIUS).fill(0xffffff).stroke(line);
    return;
  }

  const symbolWidth = item.size.width * scale;
  const symbolHeight = item.size.height * scale;
  const width = symbolWidth + 2 * SELECTION_PADDING;
  const height = symbolHeight + 2 * SELECTION_PADDING;
  const top = -height / 2;
  g.rect(-width / 2, top, width, height).stroke(line);

  if (item.rotatable) {
    const handleY = -rotationHandleOffset(symbolHeight);
    g.moveTo(0, top)
      .lineTo(0, handleY + HANDLE_RADIUS)
      .stroke(line);
    g.circle(0, handleY, HANDLE_RADIUS).fill(0xffffff).stroke(line);
  }
  if (item.length !== undefined) {
    g.circle(symbolWidth / 2, 0, HANDLE_RADIUS)
      .fill(0xffffff)
      .stroke(line);
  }
}

function label(text: string, fontSize: number, fill: number): Text {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize, fontWeight: 'bold', fill },
    resolution: LABEL_RESOLUTION,
  });
  t.anchor.set(0.5);
  return t;
}

const BUILDING_FILL = 0xd6d1c8;
const BUILDING_STROKE = 0x5a5650;

/**
 * Zeichnet einen Gebäudegrundriss. `points` sind schon Bildschirmkoordinaten; neu gezeichnet
 * wird bei jeder Änderung, damit der Rand unabhängig vom Zoom gleich dick bleibt.
 */
export function drawBuilding(g: Graphics, points: readonly Vec2[]): void {
  g.clear()
    .poly(points.flatMap((p) => [p.x, p.y]))
    .fill(BUILDING_FILL)
    .stroke({ color: BUILDING_STROKE, width: 1.5 });
}

/** Auswahlmarkierung eines Gebäudes: der Grundriss in Blau mit Punkten an den Ecken. */
export function drawBuildingSelection(g: Graphics, points: readonly Vec2[]): void {
  g.clear()
    .poly(points.flatMap((p) => [p.x, p.y]))
    .stroke({ color: SELECTION_COLOR, width: 2 });
  for (const p of points) g.circle(p.x, p.y, 3.5).fill(SELECTION_COLOR);
}

/**
 * Vorschau beim Zeichnen eines Gebäudes (Bildschirmkoordinaten): gesetzte Eckpunkte, Linie bis
 * zum Mauszeiger und – wenn das Polygon geschlossen werden kann – ein Ring um den ersten Punkt.
 */
export function drawShapePreview(
  g: Graphics,
  points: readonly Vec2[],
  cursor: Vec2 | undefined,
  canClose: boolean,
): void {
  g.clear();
  const path = cursor ? [...points, cursor] : points;
  if (path.length >= 3) {
    g.poly(path.flatMap((p) => [p.x, p.y])).fill({ color: SELECTION_COLOR, alpha: 0.12 });
  }
  if (path.length >= 2) {
    g.moveTo(path[0]!.x, path[0]!.y);
    for (const p of path.slice(1)) g.lineTo(p.x, p.y);
    g.stroke({ color: SELECTION_COLOR, width: 2 });
  }
  for (const p of points)
    g.circle(p.x, p.y, 4).fill(0xffffff).stroke({ color: SELECTION_COLOR, width: 2 });
  if (canClose && points[0]) {
    g.circle(points[0].x, points[0].y, 9).stroke({ color: SELECTION_COLOR, width: 2 });
  }
}

/** Beschriftung eines Gebäudes. Bleibt beim Zoomen gleich groß, damit sie lesbar ist. */
export function createCaption(): Text {
  const t = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 12,
      fontWeight: '600',
      fill: 0x3a3732,
      align: 'center',
    },
  });
  t.anchor.set(0.5);
  return t;
}

const ROAD_FILL = 0xc9c5bd;
const ROAD_EDGE = 0x8f8a80;

/**
 * Zeichnet eine Straße in Bildschirmpixeln: dunkler Rand, darüber die hellere Fahrbahn.
 * Neu gezeichnet bei jeder Änderung von Zoom oder Verlauf.
 */
export function drawRoad(g: Graphics, path: readonly Vec2[], widthPx: number): void {
  g.clear();
  if (path.length < 2) return;
  const trace = () => {
    g.moveTo(path[0]!.x, path[0]!.y);
    for (const p of path.slice(1)) g.lineTo(p.x, p.y);
  };
  trace();
  g.stroke({ color: ROAD_EDGE, width: widthPx + 2, cap: 'round', join: 'round' });
  trace();
  g.stroke({ color: ROAD_FILL, width: Math.max(1, widthPx), cap: 'round', join: 'round' });
}

/**
 * Auswahlmarkierung einer Straße: leichter blauer Saum über der Fahrbahn, die Mittellinie und
 * Punkte am Verlauf. Bewusst durchscheinend, damit Hydranten auf der Straße sichtbar bleiben.
 */
export function drawPathSelection(g: Graphics, path: readonly Vec2[], widthPx: number): void {
  g.clear();
  if (path.length < 2) return;
  const trace = () => {
    g.moveTo(path[0]!.x, path[0]!.y);
    for (const p of path.slice(1)) g.lineTo(p.x, p.y);
  };
  trace();
  g.stroke({
    color: SELECTION_COLOR,
    width: widthPx + 6,
    alpha: 0.15,
    cap: 'round',
    join: 'round',
  });
  trace();
  g.stroke({ color: SELECTION_COLOR, width: 2, join: 'round' });
  for (const p of path) g.circle(p.x, p.y, 3.5).fill(SELECTION_COLOR);
}

/** Auswahlrahmen um ein Objekt mit fester Bildschirmgröße, z. B. eine Beschriftung. */
export function drawScreenFrame(g: Graphics, width: number, height: number): void {
  g.clear()
    .rect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6)
    .stroke({ color: SELECTION_COLOR, width: 2 });
}

/** Freie Beschriftung auf der Karte: dunkle Schrift mit hellem Rand, damit sie überall lesbar ist. */
export function createMapLabel(): Text {
  const t = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 13,
      fontWeight: '600',
      fill: 0x1a1a1a,
      stroke: { color: 0xffffff, width: 4, join: 'round' },
    },
  });
  t.anchor.set(0.5);
  return t;
}
