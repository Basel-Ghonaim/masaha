import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { sectionName } from './sectionName';

describe('sectionName', () => {
  it('names each section by its own title, the prices «Published prices» on both places', () => {
    expect(sectionName('prices', CATALOGUES.en)).toBe('Published prices');
    expect(sectionName('shifts', CATALOGUES.en)).toBe('Shifts');
    expect(sectionName('about', CATALOGUES.ar)).toBe('عن المساحة');
    expect(sectionName('location', CATALOGUES.ar)).toBe('الموقع');
  });
});
