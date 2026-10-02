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
    const offset = { x: screenPoint.x - center.x, y: screenPoint.y - center.y };
    if (
      isArea(item) &&
      Math.abs(Math.hypot(offset.x, offset.y) - item.radius * camera.scale) <= AREA_EDGE_TOLERANCE
    ) {
      return item;
    }
    // Punkt in das Koordinatensystem des Zeichens zurückdrehen, dann reicht ein einfacher Rechteck-Test.
    const local = rotate(offset, -item.rotation);
    if (
      Math.abs(local.x) <= item.size.width / 2 + HIT_MARGIN &&
      Math.abs(local.y) <= item.size.height / 2 + HIT_MARGIN
    ) {
      return item;
    }
  }
  return undefined;
}

/** Abstand des Drehgriffs von der Zeichenmitte – bei Drehung 0 genau darüber. */
export function rotationHandleOffset(symbolHeight: number): number {
  return symbolHeight / 2 + ROTATION_HANDLE_GAP;
}

/** Bildschirmposition des Drehgriffs für ein Zeichen mit Mitte `center`. */
export function rotationHandlePosition(center: Vec2, item: MapItem): Vec2 {
  const offset = rotate({ x: 0, y: -rotationHandleOffset(item.size.height) }, item.rotation);
  return { x: center.x + offset.x, y: center.y + offset.y };
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
