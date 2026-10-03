import type { Vec2 } from '@tds/engine';
import { worldToScreen, type Camera, type Viewport } from './camera';
import { isArea, type MapItem } from './mapItems';

/** Abstand des Drehgriffs über der Oberkante eines Zeichens in Pixeln. */
const ROTATION_HANDLE_GAP = 26;

/** Radius der Griffe zum Drehen und zum Ändern der Größe in Pixeln. */
export const HANDLE_RADIUS = 6;

/** Schrittweite in Grad beim Drehen per Taste und beim Einrasten mit Umschalt. */
export const ROTATION_STEP = 15;

/** Zusätzlicher Rand in Pixeln, damit man Zeichen nicht pixelgenau treffen muss. */
const HIT_MARGIN = 4;

/** So viele Pixel innen und außen am Kreisrand einer Fläche zählen als Treffer. */
const AREA_EDGE_TOLERANCE = 6;

/**
 * Findet das Objekt, das unter `screenPoint` liegt.
 * Bei Überlappung gewinnt das zuletzt gezeichnete (also das oben liegende).
 * Flächen werden nur an ihrem Zeichen und am Kreisrand getroffen, nicht im Inneren:
 * Sonst ließe sich die Karte nicht mehr verschieben, wenn eine große Fläche den Bildschirm füllt.
 */
export function hitTestItems(
  items: readonly MapItem[],
  camera: Camera,
  viewport: Viewport,
  screenPoint: Vec2,
): MapItem | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    const center = worldToScreen(camera, viewport, item.position);
    if (item.outline) {
      const outline = item.outline.map((p) => worldToScreen(camera, viewport, p));
      if (
        pointInPolygon(screenPoint, outline) ||
        distanceToOutline(screenPoint, outline) <= HIT_MARGIN
      ) {
        return item;
      }
      continue;
    }
    const offset = { x: screenPoint.x - center.x, y: screenPoint.y - center.y };
    if (
      isArea(item) &&
      Math.abs(Math.hypot(offset.x, offset.y) - item.radius * camera.scale) <= AREA_EDGE_TOLERANCE
    ) {
      return item;
    }
    // Punkt in das Koordinatensystem des Zeichens zurückdrehen, dann reicht ein einfacher Rechteck-Test.
    // Die Zeichen sind maßstäblich: Größe in Metern × Zoom = Größe in Pixeln.
    const local = rotate(offset, -item.rotation);
    if (
      Math.abs(local.x) <= (item.size.width * camera.scale) / 2 + HIT_MARGIN &&
      Math.abs(local.y) <= (item.size.height * camera.scale) / 2 + HIT_MARGIN
    ) {
      return item;
    }
  }
  return undefined;
}

/**
 * Abstand des Drehgriffs von der Zeichenmitte in Pixeln – bei Drehung 0 genau darüber.
 * Die Griffe selbst sind Bedienelemente und bleiben beim Zoomen gleich groß.
 */
export function rotationHandleOffset(symbolHeightPx: number): number {
  return symbolHeightPx / 2 + ROTATION_HANDLE_GAP;
}

/** Bildschirmposition des Drehgriffs für ein Zeichen mit Mitte `center` bei `scale` Pixeln pro Meter. */
export function rotationHandlePosition(center: Vec2, item: MapItem, scale: number): Vec2 {
  const offset = rotate(
    { x: 0, y: -rotationHandleOffset(item.size.height * scale) },
    item.rotation,
  );
  return { x: center.x + offset.x, y: center.y + offset.y };
}

/** Bildschirmposition des Längen-Griffs: am rechten Ende des Zeichens, mitgedreht. */
export function lengthHandlePosition(center: Vec2, item: MapItem, scale: number): Vec2 {
  const offset = rotate({ x: (item.size.width * scale) / 2, y: 0 }, item.rotation);
  return { x: center.x + offset.x, y: center.y + offset.y };
}

/**
 * Länge in Metern, wenn das Ende eines Zeichens mit Mitte `center` auf `screenPoint` gezogen wird.
 * Die Mitte bleibt stehen, beide Enden bewegen sich – daher der doppelte Abstand.
 * Zählt nur der Anteil entlang der Zeichenachse, damit seitliches Wackeln nichts ändert.
 */
export function lengthTowards(
  center: Vec2,
  rotation: number,
  screenPoint: Vec2,
  scale: number,
): number {
  const local = rotate({ x: screenPoint.x - center.x, y: screenPoint.y - center.y }, -rotation);
  return (2 * Math.abs(local.x)) / scale;
}

/** Bildschirmposition des Größen-Griffs einer Fläche: rechts auf dem Kreisrand. */
export function resizeHandlePosition(center: Vec2, radiusPx: number): Vec2 {
  return { x: center.x + radiusPx, y: center.y };
}

/** Liegt `screenPoint` auf einem Griff an der Position `handle`? */
export function hitTestHandle(handle: Vec2, screenPoint: Vec2): boolean {
  return (
    Math.hypot(screenPoint.x - handle.x, screenPoint.y - handle.y) <= HANDLE_RADIUS + HIT_MARGIN
  );
}

/**
 * Drehung in Grad, bei der der Griff eines Zeichens mit Mitte `center` auf `screenPoint` zeigt.
 * 0 = nach oben, im Uhrzeigersinn, Bereich 0 bis unter 360 – wie `Unit.rotation`.
 */
export function rotationTowards(center: Vec2, screenPoint: Vec2): number {
  const degrees = (Math.atan2(screenPoint.x - center.x, center.y - screenPoint.y) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}

/** Dreht einen Vektor um `degrees` im Uhrzeigersinn (Bildschirm: y zeigt nach unten). */
function rotate(v: Vec2, degrees: number): Vec2 {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** Liegt `point` innerhalb des Polygons? (Strahlverfahren: Kanten rechts vom Punkt zählen.) */
export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y) {
      const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < x) inside = !inside;
    }
  }
  return inside;
}

/** Kürzester Abstand von `point` zum Rand des Polygons. */
export function distanceToOutline(point: Vec2, polygon: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    best = Math.min(
      best,
      distanceToSegment(point, polygon[i]!, polygon[(i + 1) % polygon.length]!),
    );
  }
  return best;
}

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
