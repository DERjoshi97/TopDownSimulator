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
