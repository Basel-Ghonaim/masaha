import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { sectionName } from './sectionName';

describe('sectionName', () => {
  it('names the owner’s prices «Published prices», as their own page titles them, and every other section by its group', () => {
    expect(sectionName('owner', 'prices', CATALOGUES.en)).toBe('Published prices');
    expect(sectionName('admin', 'prices', CATALOGUES.en)).toBe('Prices');
    expect(sectionName('owner', 'hours', CATALOGUES.en)).toBe('Opening hours');
  });
});
