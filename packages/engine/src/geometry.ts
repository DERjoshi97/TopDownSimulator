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
