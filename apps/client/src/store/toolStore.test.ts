import { beforeEach, describe, expect, it } from 'vitest';
import { useToolStore } from './toolStore';

const hlf = { kind: 'unit', id: 'hlf-1' } as const;
const lfTool = { kind: 'unit', typeId: 'LF' } as const;

describe('useToolStore', () => {
  beforeEach(() => {
    useToolStore.setState({ activeTool: undefined, selection: undefined });
  });

  it('hebt die Auswahl auf, wenn ein Werkzeug gewählt wird', () => {
    useToolStore.getState().select(hlf);
    useToolStore.getState().selectTool(lfTool);
    expect(useToolStore.getState()).toMatchObject({ activeTool: lfTool, selection: undefined });
  });

  it('beendet das Platzieren, wenn ein Objekt ausgewählt wird', () => {
    useToolStore.getState().selectTool(lfTool);
    useToolStore.getState().select(hlf);
    expect(useToolStore.getState()).toMatchObject({ activeTool: undefined, selection: hlf });
  });

  it('lässt beim Abwählen das jeweils andere unverändert', () => {
    useToolStore.getState().select(hlf);
    useToolStore.getState().selectTool(undefined);
    expect(useToolStore.getState().selection).toBe(hlf);
  });
});
