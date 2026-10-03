import { useEffect } from 'react';
import { situationObjectTypes, unitTypes, type SymbolShape } from '@tds/catalog';
import { isSameTool, useToolStore, type PlacementTool } from '../store/toolStore';

const UNIT_GROUPS: { shape: SymbolShape; title: string }[] = [
  { shape: 'vehicle', title: 'Fahrzeuge' },
  { shape: 'team', title: 'Trupps' },
];

const BUILDING_TOOLS = [
  { typeId: 'rectangle', label: 'Gebäude ▭', title: 'Gebäude als Rechteck aufziehen' },
  { typeId: 'polygon', label: 'Gebäude ⬠', title: 'Gebäude Eckpunkt für Eckpunkt zeichnen' },
] as const;

/** Werkzeugleiste zum Platzieren von Einheiten und Lageobjekten: Typ wählen, dann auf die Karte klicken. */
export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool);
  const selectTool = useToolStore((s) => s.selectTool);

  // Esc bricht das Platzieren ab.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectTool(undefined);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectTool]);

  /** Klick auf das aktive Werkzeug schaltet es wieder aus. */
  const toggle = (tool: PlacementTool) =>
    selectTool(isSameTool(activeTool, tool) ? undefined : tool);

  return (
    <nav className="toolbar" aria-label="Platzieren">
      {UNIT_GROUPS.map((group) => (
        <section key={group.shape}>
          <h2>{group.title}</h2>
          <div className="toolbar-buttons">
            {unitTypes
              .filter((t) => t.shape === group.shape)
              .map((t) => {
                const tool = { kind: 'unit', typeId: t.id } as const;
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.name}
                    aria-pressed={isSameTool(activeTool, tool)}
                    className={`toolbar-button toolbar-button--${t.organization}`}
                    onClick={() => toggle(tool)}
                  >
                    {t.id}
                  </button>
                );
              })}
          </div>
        </section>
      ))}

      <section>
        <h2>Lage</h2>
        <div className="toolbar-buttons toolbar-buttons--list">
          {situationObjectTypes.map((t) => {
            const tool = { kind: 'situationObject', typeId: t.id } as const;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSameTool(activeTool, tool)}
                className="toolbar-button toolbar-button--situation"
                onClick={() => toggle(tool)}
              >
                <span className={`swatch swatch--${t.id}`} aria-hidden="true" />
                {t.name}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Karte</h2>
        <div className="toolbar-buttons toolbar-buttons--list">
          {BUILDING_TOOLS.map(({ typeId, label, title }) => {
            const tool = { kind: 'building', typeId } as const;
            return (
              <button
                key={typeId}
                type="button"
                title={title}
                aria-pressed={isSameTool(activeTool, tool)}
                className="toolbar-button toolbar-button--situation"
                onClick={() => toggle(tool)}
              >
                <span className={`swatch swatch--building-${typeId}`} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </section>
    </nav>
  );
}
