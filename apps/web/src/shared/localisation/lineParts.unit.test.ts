import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { lineParts } from './lineParts';

describe('lineParts', () => {
  it('gives the words before and after the name, wherever the line places it', () => {
    expect(lineParts(CATALOGUES.en.spaces.deleteDialog.title)).toEqual({
      before: 'Delete ',
      after: '?',
    });
    expect(lineParts(CATALOGUES.ar.spaces.toasts.hidden)).toEqual({
      before: 'أُخفيت ',
      after: ' من الموقع',
    });
    expect(lineParts(CATALOGUES.en.spaces.toasts.deleted)).toEqual({
      before: '',
      after: ' deleted',
    });
  });
});
