import { describe, expect, it } from 'vitest';
import { findUnitType, unitTypes } from './unitTypes';

describe('unitTypes', () => {
  it('hat eindeutige Kennungen', () => {
    const ids = unitTypes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('enthält den ersten Katalog aus dem Plan', () => {
    for (const id of ['HLF', 'LF', 'TLF', 'DLK', 'ELW', 'RTW', 'AT', 'WT', 'ST']) {
      expect(findUnitType(id), id).toBeDefined();
    }
  });

  it('liefert undefined für unbekannte Typen', () => {
    expect(findUnitType('XYZ')).toBeUndefined();
  });
});
