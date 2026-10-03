import { useEffect, useMemo, useRef } from 'react';
import { formatExerciseTime } from '@tds/engine';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';
import { logbookEntries } from './logbookEntries';

/**
 * Einsatztagebuch: alle Ereignisse der Übung mit Uhrzeit, neueste unten.
 * Ein Klick auf einen Eintrag wählt das zugehörige Objekt auf der Karte aus.
 */
export function Logbook({ onClose }: { onClose: () => void }) {
  const events = useGameStore((s) => s.events);
  const units = useGameStore((s) => s.state.units);
  const situationObjects = useGameStore((s) => s.state.situationObjects);
  const select = useToolStore((s) => s.select);
  const entries = useMemo(() => logbookEntries(events), [events]);
  const listRef = useRef<HTMLOListElement>(null);

  // Bei neuen Einträgen ans Ende scrollen, damit der neueste sichtbar ist.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries.length]);

  const exists = (kind: 'unit' | 'situationObject', id: string) =>
    kind === 'unit' ? id in units : id in situationObjects;

  return (
    <section className="logbook" aria-label="Einsatztagebuch">
      <header>
        <h2>Einsatztagebuch</h2>
        <button type="button" aria-label="Einsatztagebuch schließen" onClick={onClose}>
          ✕
        </button>
      </header>
      {entries.length === 0 ? (
        <p className="logbook-empty">Noch keine Einträge.</p>
      ) : (
        <ol ref={listRef}>
          {entries.map((entry, index) => {
            const ref = entry.ref && exists(entry.ref.kind, entry.ref.id) ? entry.ref : undefined;
            const content = (
              <>
                <time>{formatExerciseTime(entry.exerciseTime)}</time>
                <span>{entry.text}</span>
              </>
            );
            return (
              // Einträge ändern sich nie und kommen nur hinten dazu – der Index ist als Schlüssel stabil.
              <li key={index}>
                {ref ? (
                  <button type="button" onClick={() => select(ref)}>
                    {content}
                  </button>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
