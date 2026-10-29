import { ANNOUNCEMENT_TYPES } from '@masaha/shared/announcements';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { typeView } from './typeView';

const WORDS = CATALOGUES.en.announcements;

describe('typeView', () => {
  it('warns of an outage and a closure, and is neutral for the rest', () => {
    expect(
      Object.fromEntries(ANNOUNCEMENT_TYPES.map((type) => [type, typeView(type, WORDS).tone])),
    ).toEqual({
      GENERAL: 'neutral',
      OUTAGE: 'warning',
      CLOSURE: 'warning',
      OFFER: 'neutral',
      EVENT: 'neutral',
    });
  });

  it('names the type and says what it does', () => {
    expect(typeView('CLOSURE', WORDS)).toEqual({
      label: 'Temporary closure',
      tone: 'warning',
      hint: 'The space shows “Closed now” for the whole period',
    });
  });
});
