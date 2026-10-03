import { useEffect, useRef, useState } from 'react';
import { parseExercise, serializeExercise, type ExerciseFileError } from '@tds/engine';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';

/** Wie lange eine Meldung sichtbar bleibt. */
const NOTICE_MS = 4000;

interface Notice {
  readonly kind: 'info' | 'error';
  readonly text: string;
}

/**
 * Speichern und Laden einer Übung als JSON-Datei. Gespeichert wird die Ereignisliste,
 * daher sind nach dem Laden auch Einsatztagebuch und Uhrzeit wieder da.
 */
export function ExerciseFileMenu() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice | undefined>();

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(undefined), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  // Cmd+S (Mac) bzw. Strg+S speichert – statt die Webseite zu speichern.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setNotice(save());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
    e.target.value = '';
    if (file) setNotice(await load(file));
  };

  return (
    <div className="file-menu">
      <button
        type="button"
        title="Übung als Datei speichern (Cmd/Strg+S)"
        onClick={() => setNotice(save())}
      >
        Speichern
      </button>
      <button
        type="button"
        title="Gespeicherte Übung laden"
        onClick={() => inputRef.current?.click()}
      >
        Laden
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => void onFileChosen(e)}
      />
      {notice && (
        <div
          className={`notice notice--${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}

function save(): Notice {
  const now = new Date();
  const { events, exerciseTime } = useGameStore.getState();
  const text = serializeExercise(events, exerciseTime(), now);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName(now);
  // Manche Browser (z. B. Firefox) laden nur über Links, die im Dokument hängen.
  document.body.append(link);
  link.click();
  link.remove();
  // Erst nach dem Start des Downloads freigeben, sonst bricht er in manchen Browsern ab.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { kind: 'info', text: `Gespeichert als ${link.download}` };
}

async function load(file: File): Promise<Notice> {
  const result = parseExercise(await file.text());
  if (!result.ok) {
    return {
      kind: 'error',
      text: `„${file.name}“ konnte nicht geladen werden: ${errorText(result.error)}`,
    };
  }
  const { events, load } = useGameStore.getState();
  if (events.length > 0 && !window.confirm('Die aktuelle Übung wird verworfen. Fortfahren?')) {
    return { kind: 'info', text: 'Laden abgebrochen.' };
  }
  load(result.file.events, result.file.exerciseTime);
  // Auswahl und Werkzeug beziehen sich auf die alte Übung.
  useToolStore.setState({ selection: undefined, activeTool: undefined });
  return { kind: 'info', text: `„${file.name}“ geladen – Übung ist angehalten.` };
}

function errorText(error: ExerciseFileError): string {
  switch (error.code) {
    case 'invalid-json':
      return 'Die Datei ist beschädigt oder keine JSON-Datei.';
    case 'unknown-format':
      return 'Das ist keine Übungsdatei des TopDownSimulators.';
    case 'unsupported-version':
      return 'Die Datei stammt aus einer neueren Programmversion.';
    case 'invalid-event':
      return `Eintrag ${error.index + 1} ist fehlerhaft.`;
  }
}

/** Dateiname mit Datum und Uhrzeit, z. B. "uebung-2026-10-03-1430.json". */
function fileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `uebung-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}
