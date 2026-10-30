import { AUDIT_ACTIONS } from '@masaha/shared/audit';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { actionView } from './actionWords';

describe('actionView', () => {
  it.each(Object.entries(CATALOGUES))(
    'every AUDIT_ACTIONS action has a word in %s',
    (_, catalogue) => {
      const words = catalogue.audit.actions as Readonly<Record<string, string | undefined>>;
      expect(AUDIT_ACTIONS.filter((action) => words[action] === undefined)).toEqual([]);
      expect(
        AUDIT_ACTIONS.filter(
          (action) => !actionView(action, catalogue.audit.actions, 'space').known,
        ),
      ).toEqual([]);
    },
  );

  it('shows an action the web does not know as stored, neutral', () => {
    expect(actionView('space.teleported', CATALOGUES.ar.audit.actions, 'space')).toEqual({
      text: 'space.teleported',
      known: false,
      tone: 'neutral',
    });
  });

  it("reds each log's destructive acts and no other", () => {
    const red = (scope: 'space' | 'platform') =>
      AUDIT_ACTIONS.filter(
        (action) => actionView(action, CATALOGUES.en.audit.actions, scope).tone === 'destructive',
      );
    expect(red('space')).toEqual([
      'closure.subscriptionsExtended',
      'payment.voided',
      'space.photoRemoved',
      'space.staffDeactivated',
    ]);
    expect(red('platform')).toEqual(['space.deleted', 'space.ownerUnlinked', 'user.suspended']);
  });
});
