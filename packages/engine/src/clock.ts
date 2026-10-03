/**
 * Formatiert die vergangene Übungszeit als "HH:MM:SS" für die Einsatzuhr.
 * Negative Werte werden als 00:00:00 dargestellt, angefangene Sekunden abgeschnitten.
 */
export function formatExerciseTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Bezugspunkt, um Übungszeit aus der echten Uhrzeit zu berechnen: Zum Zeitpunkt `wallTime`
 * (z. B. `Date.now()`) stand die Einsatzuhr auf `exerciseTime`. Nach jedem Befehl wird ein neuer
 * Bezugspunkt gesetzt, damit Anhalten und Zeitraffer ab genau diesem Moment gelten.
 */
export interface ClockAnchor {
  readonly exerciseTime: number;
  readonly wallTime: number;
  readonly running: boolean;
  readonly speed: number;
}

/** Übungszeit in Millisekunden zum Zeitpunkt `wallTime`. Steht still, solange die Uhr angehalten ist. */
export function exerciseTimeAt(anchor: ClockAnchor, wallTime: number): number {
  if (!anchor.running) return anchor.exerciseTime;
  // Nie rückwärts – falls die Rechneruhr verstellt wird, bleibt die Übungszeit stehen.
  return anchor.exerciseTime + Math.max(0, wallTime - anchor.wallTime) * anchor.speed;
}
