import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { warningLines } from './warningLines';

const errors = CATALOGUES.en.errors;

describe('warningLines', () => {
  it('words each warning by its catalogue line, in the server’s order', () => {
    expect(
      warningLines(['OUTSIDE_OPENING_HOURS', 'SPACE_FULL', 'CLOSURE_IN_FORCE'], errors),
    ).toEqual([errors.OUTSIDE_OPENING_HOURS, errors.SPACE_FULL, errors.CLOSURE_IN_FORCE]);
  });

  it('says nothing without warnings', () => {
    expect(warningLines([], errors)).toEqual([]);
    expect(warningLines(undefined, errors)).toEqual([]);
  });
});
