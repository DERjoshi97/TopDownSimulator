/** Punkt oder Richtung auf der Karte. Einheit: Meter, x nach rechts (Osten), y nach unten (Süden). */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Prüft, ob beide Koordinaten echte Zahlen sind (kein NaN, kein Unendlich). */
export function isFiniteVec2(v: Vec2): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y);
}

/** Bringt einen Winkel in Grad in den Bereich 0 bis unter 360 (z. B. -90 → 270, 450 → 90). */
export function normalizeRotation(degrees: number): number {
  const r = degrees % 360;
  // `+ 0` macht aus -0 eine normale 0, sonst würde der Wert in Tests als -0 auftauchen.
  return (r < 0 ? r + 360 : r) + 0;
}

/**
 * Fläche eines Polygons in Quadratmetern (Gaußsche Trapezformel).
 * Die Reihenfolge der Eckpunkte – im oder gegen den Uhrzeigersinn – spielt keine Rolle.
 */
export function polygonArea(points: readonly Vec2[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/** Schwerpunkt eines Polygons, z. B. für die Beschriftung. Bei Fläche 0: Mittel der Eckpunkte. */
export function polygonCentroid(points: readonly Vec2[]): Vec2 {
  let twice = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const cross = a.x * b.y - b.x * a.y;
    twice += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  if (Math.abs(twice) < 1e-9) {
    const n = points.length || 1;
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / n,
      y: points.reduce((sum, p) => sum + p.y, 0) / n,
    };
  }
  return { x: x / (3 * twice), y: y / (3 * twice) };
}

/** Verschiebt alle Punkte um `offset`. */
export function translatePoints(points: readonly Vec2[], offset: Vec2): Vec2[] {
  return points.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }));
}
