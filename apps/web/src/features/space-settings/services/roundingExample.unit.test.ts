import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { roundingExample } from './roundingExample';

const WORDS = CATALOGUES.ar.spaceSettings.pricing;

describe('roundingExample', () => {
  it('words the example at 1, 2, 3, 11 and 59 minutes through the plural forms', () => {
    expect([1, 2, 3, 11, 59].map((minutes) => roundingExample(minutes, WORDS))).toEqual([
      'ساعتان = ساعتان · ساعتان ودقيقتان = 3 ساعات',
      'ساعتان ودقيقة = ساعتان · ساعتان و3 دقائق = 3 ساعات',
      'ساعتان ودقيقتان = ساعتان · ساعتان و4 دقائق = 3 ساعات',
      'ساعتان و10 دقائق = ساعتان · ساعتان و12 دقيقة = 3 ساعات',
      'ساعتان و58 دقيقة = ساعتان · ساعتان و60 دقيقة = 3 ساعات',
    ]);
  });
});
