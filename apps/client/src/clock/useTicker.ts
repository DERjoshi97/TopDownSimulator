import { useEffect, useState } from 'react';

/** Wie oft die Anzeige aktualisiert wird. Kürzer als 1 s, damit sie auch im Zeitraffer flüssig läuft. */
const REFRESH_MS = 200;

/**
 * Zeichnet die Komponente regelmäßig neu, solange `active` gilt – z. B. solange die Uhr läuft –
 * und liefert die Uhrzeit (`Date.now()`) des letzten Takts. So muss beim Rendern nicht selbst
 * die Uhr gelesen werden.
 */
export function useTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
