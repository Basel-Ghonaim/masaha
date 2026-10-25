import { describe, expect, it } from 'vitest';
import { statusView } from './statusView';

const LABELS = {
  UPCOMING: 'Not started',
  ACTIVE: 'Active',
  ENDING_SOON: 'Ending soon',
  EXPIRED: 'Expired',
};

describe('statusView', () => {
  it('gives each status its word and its tone', () => {
    expect(statusView('UPCOMING', LABELS)).toEqual({ label: 'Not started', tone: 'info' });
    expect(statusView('ACTIVE', LABELS)).toEqual({ label: 'Active', tone: 'success' });
    expect(statusView('ENDING_SOON', LABELS)).toEqual({ label: 'Ending soon', tone: 'warning' });
    expect(statusView('EXPIRED', LABELS)).toEqual({ label: 'Expired', tone: 'neutral' });
  });
});
