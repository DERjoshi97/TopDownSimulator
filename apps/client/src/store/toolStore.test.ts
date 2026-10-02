import { beforeEach, describe, expect, it } from 'vitest';
import { useToolStore } from './toolStore';

describe('useToolStore', () => {
  beforeEach(() => {
    useToolStore.setState({ activeUnitType: undefined, selectedUnitId: undefined });
  });

  it('hebt die Auswahl auf, wenn ein Werkzeug gewählt wird', () => {
    useToolStore.getState().selectUnit('hlf-1');
    useToolStore.getState().selectUnitType('LF');
    expect(useToolStore.getState()).toMatchObject({
      activeUnitType: 'LF',
      selectedUnitId: undefined,
    });
  });

  it('beendet das Platzieren, wenn eine Einheit ausgewählt wird', () => {
    useToolStore.getState().selectUnitType('LF');
    useToolStore.getState().selectUnit('hlf-1');
    expect(useToolStore.getState()).toMatchObject({
      activeUnitType: undefined,
      selectedUnitId: 'hlf-1',
    });
  });

  it('lässt beim Abwählen das jeweils andere unverändert', () => {
    useToolStore.getState().selectUnit('hlf-1');
    useToolStore.getState().selectUnitType(undefined);
    expect(useToolStore.getState().selectedUnitId).toBe('hlf-1');
  });
});
