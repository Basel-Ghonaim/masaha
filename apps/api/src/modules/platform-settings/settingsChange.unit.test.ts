import { describe, expect, it } from 'vitest';

import { settingsChange } from './settingsChange.ts';

describe('settingsChange', () => {
  it('only the fields that change, each as it was and becomes; nothing when all are equal', () => {
    const current: { email: string | null; whatsapp: string | null; days: number } = {
      email: 'hello@masaha.ps',
      whatsapp: null,
      days: 60,
    };

    expect(settingsChange(current, { email: 'team@masaha.ps', whatsapp: null, days: 60 })).toEqual({
      before: { email: 'hello@masaha.ps' },
      after: { email: 'team@masaha.ps' },
    });
    expect(settingsChange(current, { email: null, whatsapp: '+970591234567', days: 30 })).toEqual({
      before: { email: 'hello@masaha.ps', whatsapp: null, days: 60 },
      after: { email: null, whatsapp: '+970591234567', days: 30 },
    });
    expect(settingsChange(current, { ...current })).toBeNull();
  });
});
