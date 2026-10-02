import type { Unit, Vec2 } from '@tds/engine';
import { worldToScreen, type Camera, type Viewport } from './camera';

/**
 * Größe eines taktischen Zeichens in Bildschirmpixeln.
 * Zeichen bleiben beim Zoomen gleich groß – sonst wären sie auf Verbandsebene unsichtbar klein.
 */
export const SYMBOL_SIZE = { width: 44, height: 26 };

/** Abstand des Drehgriffs von der Zeichenmitte in Pixeln, bei Drehung 0 genau darüber. */
export const ROTATION_HANDLE_OFFSET = SYMBOL_SIZE.height / 2 + 26;

/** Radius des Drehgriffs in Pixeln. */
export const ROTATION_HANDLE_RADIUS = 6;

/** Schrittweite in Grad beim Drehen per Taste und beim Einrasten mit Umschalt. */
export const ROTATION_STEP = 15;

/** Zusätzlicher Rand in Pixeln, damit man Zeichen nicht pixelgenau treffen muss. */
const HIT_MARGIN = 4;

/**
 * Findet die Einheit, deren Zeichen unter `screenPoint` liegt.
 * Bei Überlappung gewinnt die zuletzt gezeichnete (also die oben liegende).
 */
export function hitTestUnits(
  units: readonly Unit[],
  camera: Camera,
  viewport: Viewport,
  screenPoint: Vec2,
): Unit | undefined {
  const halfWidth = SYMBOL_SIZE.width / 2 + HIT_MARGIN;
  const halfHeight = SYMBOL_SIZE.height / 2 + HIT_MARGIN;

  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i]!;
    const center = worldToScreen(camera, viewport, unit.position);
    // Punkt in das Koordinatensystem des Zeichens zurückdrehen, dann reicht ein einfacher Rechteck-Test.
    const local = rotate(
      { x: screenPoint.x - center.x, y: screenPoint.y - center.y },
      -unit.rotation,
    );
    if (Math.abs(local.x) <= halfWidth && Math.abs(local.y) <= halfHeight) {
      return unit;
    }
  }
  return undefined;
}

/** Bildschirmposition des Drehgriffs für ein Zeichen mit Mitte `center` und Drehung `rotation`. */
export function rotationHandlePosition(center: Vec2, rotation: number): Vec2 {
  const offset = rotate({ x: 0, y: -ROTATION_HANDLE_OFFSET }, rotation);
  return { x: center.x + offset.x, y: center.y + offset.y };
}

/** Liegt `screenPoint` auf dem Drehgriff? */
export function hitTestRotationHandle(center: Vec2, rotation: number, screenPoint: Vec2): boolean {
  const handle = rotationHandlePosition(center, rotation);
  return (
    Math.hypot(screenPoint.x - handle.x, screenPoint.y - handle.y) <=
    ROTATION_HANDLE_RADIUS + HIT_MARGIN
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
