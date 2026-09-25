import type { Unit, Vec2 } from '@tds/engine';
import { worldToScreen, type Camera, type Viewport } from './camera';

/**
 * Größe eines taktischen Zeichens in Bildschirmpixeln.
 * Zeichen bleiben beim Zoomen gleich groß – sonst wären sie auf Verbandsebene unsichtbar klein.
 */
export const SYMBOL_SIZE = { width: 44, height: 26 };

/** Zusätzlicher Rand in Pixeln, damit man Zeichen nicht pixelgenau treffen muss. */
const HIT_MARGIN = 4;

/**
 * Findet die Einheit, deren Zeichen unter `screenPoint` liegt.
 * Bei Überlappung gewinnt die zuletzt gezeichnete (also die oben liegende).
 * Die Drehung wird vereinfachend ignoriert.
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
    if (
      Math.abs(screenPoint.x - center.x) <= halfWidth &&
      Math.abs(screenPoint.y - center.y) <= halfHeight
    ) {
      return unit;
    }
  }
  return undefined;
}
