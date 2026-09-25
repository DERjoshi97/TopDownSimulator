import { useEffect } from 'react';
import { unitTypes, type SymbolShape } from '@tds/catalog';
import { useToolStore } from '../store/toolStore';

const GROUPS: { shape: SymbolShape; title: string }[] = [
  { shape: 'vehicle', title: 'Fahrzeuge' },
  { shape: 'team', title: 'Trupps' },
];

/** Werkzeugleiste zum Platzieren von Einheiten: Typ wählen, dann auf die Karte klicken. */
export function UnitToolbar() {
  const activeUnitType = useToolStore((s) => s.activeUnitType);
  const selectUnitType = useToolStore((s) => s.selectUnitType);

  // Esc bricht das Platzieren ab.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectUnitType(undefined);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectUnitType]);

  return (
    <nav className="toolbar" aria-label="Einheiten platzieren">
      {GROUPS.map((group) => (
        <section key={group.shape}>
          <h2>{group.title}</h2>
          <div className="toolbar-buttons">
            {unitTypes
              .filter((t) => t.shape === group.shape)
              .map((t) => {
                const active = t.id === activeUnitType;
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.name}
                    aria-pressed={active}
                    className={`toolbar-button toolbar-button--${t.organization}`}
                    onClick={() => selectUnitType(active ? undefined : t.id)}
                  >
                    {t.id}
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </nav>
  );
}
