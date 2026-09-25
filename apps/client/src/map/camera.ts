import type { Vec2 } from '@tds/engine';

// Umrechnung zwischen Welt (Meter auf der Karte) und Bildschirm (Pixel im Kartenfenster).
// Reine Rechenfunktionen ohne PixiJS – deshalb einfach zu testen.

export interface Camera {
  /** Weltpunkt in Metern, der in der Mitte des Kartenfensters liegt. */
  readonly center: Vec2;
  /** Zoomstufe: wie viele Pixel ein Meter breit ist. */
  readonly scale: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** Engster Zoom: 1 m = 200 px, reicht für einzelne Räume. */
export const MAX_SCALE = 200;
/** Weitester Zoom: 1 km = 50 px, reicht für ganze Stadtteile. */
export const MIN_SCALE = 0.05;

export const defaultCamera: Camera = { center: { x: 0, y: 0 }, scale: 10 };

export function worldToScreen(camera: Camera, viewport: Viewport, p: Vec2): Vec2 {
  return {
    x: (p.x - camera.center.x) * camera.scale + viewport.width / 2,
    y: (p.y - camera.center.y) * camera.scale + viewport.height / 2,
  };
}

export function screenToWorld(camera: Camera, viewport: Viewport, p: Vec2): Vec2 {
  return {
    x: (p.x - viewport.width / 2) / camera.scale + camera.center.x,
    y: (p.y - viewport.height / 2) / camera.scale + camera.center.y,
  };
}

/** Verschiebt die Karte um die angegebenen Pixel – so, als würde man sie mit der Hand ziehen. */
export function panBy(camera: Camera, dxPx: number, dyPx: number): Camera {
  return {
    ...camera,
    center: {
      x: camera.center.x - dxPx / camera.scale,
      y: camera.center.y - dyPx / camera.scale,
    },
  };
}

/**
 * Zoomt um `factor` (> 1 = hinein) und hält dabei den Weltpunkt unter `screenPoint` fest –
 * der Punkt unter dem Mauszeiger bleibt also, wo er ist.
 */
export function zoomAt(
  camera: Camera,
  viewport: Viewport,
  screenPoint: Vec2,
  factor: number,
): Camera {
  const scale = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
  const anchor = screenToWorld(camera, viewport, screenPoint);
  return {
    scale,
    center: {
      x: anchor.x - (screenPoint.x - viewport.width / 2) / scale,
      y: anchor.y - (screenPoint.y - viewport.height / 2) / scale,
    },
  };
}

/** Kleinster „runder“ Wert (1, 2 oder 5 × Zehnerpotenz), der mindestens `min` ist. */
export function niceStepAtLeast(min: number): number {
  const power = 10 ** Math.floor(Math.log10(min));
  for (const mantissa of [1, 2, 5, 10]) {
    // Kleine Toleranz, weil z. B. 0.1 * 5 im Rechner nicht exakt 0.5 ergibt.
    if (mantissa * power >= min * (1 - 1e-9)) return mantissa * power;
  }
  return 10 * power;
}

/** Größter „runder“ Wert (1, 2 oder 5 × Zehnerpotenz), der höchstens `max` ist. */
export function niceStepAtMost(max: number): number {
  const power = 10 ** Math.floor(Math.log10(max));
  for (const mantissa of [5, 2, 1]) {
    if (mantissa * power <= max * (1 + 1e-9)) return mantissa * power;
  }
  return power;
}

/** Rasterabstand in Metern, sodass die Linien mindestens `minPx` Pixel auseinanderliegen. */
export function gridStep(scale: number, minPx = 20): number {
  return niceStepAtLeast(minPx / scale);
}

/** Länge der Maßstabsleiste: runder Meterwert, der höchstens `maxPx` Pixel breit ist. */
export function scaleBar(scale: number, maxPx = 120): { meters: number; px: number } {
  const meters = niceStepAtMost(maxPx / scale);
  return { meters, px: meters * scale };
}

/** Entfernung für die Anzeige, z. B. "50 m", "2 km", "0,5 m". */
export function formatDistance(meters: number): string {
  const format = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  return meters >= 1000 ? `${format(meters / 1000)} km` : `${format(meters)} m`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
