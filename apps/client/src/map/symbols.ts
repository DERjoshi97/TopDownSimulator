import { Container, Graphics, Text } from 'pixi.js';
import { findUnitType, type Organization } from '@tds/catalog';
import { HANDLE_RADIUS, rotationHandleOffset } from './hitTest';
import { UNIT_SYMBOL_SIZE, isArea, type MapItem } from './mapItems';

// Taktische Zeichen, vereinfacht nach DV 102. Werden im Code gezeichnet (keine Bilddateien):
// keine Lizenzfragen, scharf bei jeder Bildschirmauflösung, neue Typen nur per Katalogeintrag.

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
 * Erzeugt das Zeichen für eine Einheit oder ein Lageobjekt. Mittelpunkt ist (0|0),
 * damit Position und Drehung sich auf die Mitte beziehen.
 */
export function createItemSymbol(item: MapItem): Container {
  return item.ref.kind === 'unit'
    ? createUnitSymbol(item.symbolType)
    : createSituationSymbol(item.symbolType);
}

function createUnitSymbol(unitType: string): Container {
  const definition = findUnitType(unitType);
  const colors = definition ? COLORS[definition.organization] : UNKNOWN_COLORS;
  const { width, height } = UNIT_SYMBOL_SIZE;
  const left = -width / 2;
  const top = -height / 2;

  const shape = new Graphics();

  if (definition?.shape === 'vehicle') {
    // Zwei Räder unter dem Rechteck
    for (const x of [left + 10, -left - 10]) {
      shape.circle(x, -top + 4, 3.5).fill(colors.stroke);
    }
  }
  if (definition?.shape === 'team') {
    // Ein Punkt über dem Rechteck = Truppstärke
    shape.circle(0, top - 6, 3).fill(colors.stroke);
  }

  shape
    .rect(left, top, width, height)
    .fill(colors.fill)
    .stroke({ color: colors.stroke, width: 1.5 });

  const symbol = new Container();
  symbol.addChild(shape, label(unitType, 13, colors.text));
  return symbol;
}

function createSituationSymbol(objectType: string): Container {
  const g = new Graphics();
  const symbol = new Container();
  symbol.addChild(g);

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
      symbol.addChild(label('!', 14, OUTLINE));
      break;

    case 'person':
      // Kopf und Körper
      g.circle(0, -9, 5).fill(OUTLINE);
      g.roundRect(-7, -3, 14, 17, 4).fill(OUTLINE);
      break;

    case 'cordon': {
      // Rot-weiß gestreiftes Band mit Pfosten an beiden Enden
      // 6 Streifen à 8 px, mit Pfosten passt das in die 64 px breite Zeichenfläche.
      const width = 48;
      const stripe = 8;
      for (let x = -width / 2, i = 0; x < width / 2; x += stripe, i++) {
        g.rect(x, -4, stripe, 8).fill(i % 2 === 0 ? 0xc8102e : 0xffffff);
      }
      g.rect(-width / 2, -4, width, 8).stroke({ color: OUTLINE, width: 1 });
      for (const x of [-width / 2 - 3, width / 2 + 3]) {
        g.circle(x, 0, 4).fill(OUTLINE);
      }
      break;
    }

    default:
      g.circle(0, 0, 11).fill(0xb0b0b0).stroke({ color: OUTLINE, width: 1.5 });
      symbol.addChild(label('?', 13, OUTLINE));
  }
  return symbol;
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
 * bei Flächen ein Kreis mit Größen-Griff, sonst ein Rahmen mit Drehgriff darüber.
 */
export function drawSelection(g: Graphics, item: MapItem, radiusPx: number): void {
  const line = { color: SELECTION_COLOR, width: 2 };
  g.clear();

  if (isArea(item)) {
    g.circle(0, 0, radiusPx).stroke(line);
    g.circle(radiusPx, 0, HANDLE_RADIUS).fill(0xffffff).stroke(line);
    return;
  }

  const width = item.size.width + 2 * SELECTION_PADDING;
  const height = item.size.height + 2 * SELECTION_PADDING;
  const top = -height / 2;
  g.rect(-width / 2, top, width, height).stroke(line);

  if (item.rotatable) {
    const handleY = -rotationHandleOffset(item.size.height);
    g.moveTo(0, top)
      .lineTo(0, handleY + HANDLE_RADIUS)
      .stroke(line);
    g.circle(0, handleY, HANDLE_RADIUS).fill(0xffffff).stroke(line);
  }
}

function label(text: string, fontSize: number, fill: number): Text {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize, fontWeight: 'bold', fill },
  });
  t.anchor.set(0.5);
  return t;
}
