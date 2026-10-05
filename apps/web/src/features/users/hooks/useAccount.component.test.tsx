import { establishSession } from '@shared/session';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { startPreferences } from '../../../test/startPreferences';
import { useAccount } from './useAccount';

const USER = aSession({ name: '  Sara Ahmad ', email: 'sara@example.com' }).user;

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(USER), { source: 'signIn' });
});

describe('useAccount', () => {
  it('gives the names, the initial, the email and the labels, ready to render', () => {
    const { result } = renderHook(() => useAccount(USER));

    expect(result.current).toMatchObject({
      name: 'Sara Ahmad',
      firstName: 'Sara',
      initial: 'S',
      email: 'sara@example.com',
      menuLabel: 'Account menu: \u2068Sara Ahmad\u2069',
      sectionLabel: 'Account',
      signOutLabel: 'Sign out',
      isPending: false,
      failure: null,
    });
  });

  it("takes an Arabic name's first word and first letter", () => {
    const { result } = renderHook(() => useAccount({ ...USER, name: 'سارة أحمد' }));

    expect(result.current).toMatchObject({ firstName: 'سارة', initial: 'س' });
  });
});
