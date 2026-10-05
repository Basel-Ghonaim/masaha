import { createQueryClient } from '@shared/api';
import { getPreferences, setupPreferences } from '@shared/preferences';
import { establishSession, refreshSession } from '@shared/session';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakePlatform } from '../test/fakePlatform';
import { aSession } from '../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../test/fakeTransport';
import { setSessionHint, stubCookies } from '../test/sessionHint';
import { connectSession } from './session';

const queryClient = createQueryClient();

beforeAll(() => {
  connectSession(queryClient);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('connectSession', () => {
  it('clears the cached server state when the session ends', async () => {
    setupPreferences(fakePlatform().platform);
    establishSession(aSession(), { source: 'signIn' });
    queryClient.setQueryData(['me', 'favorites'], [7]);
    stubCookies();
    setSessionHint(true);
    fakeTransport(() => refused(401, { type: 'unauthorized' }));

    await expect(refreshSession()).rejects.toMatchObject({ status: 401 });

    expect(queryClient.getQueryData(['me', 'favorites'])).toBeUndefined();
  });

  it('applies the account’s language on a sign-in', () => {
    setupPreferences(fakePlatform({ lang: 'en' }).platform);

    establishSession(aSession({ language: 'ar' }), { source: 'signIn' });

    expect(getPreferences().language).toBe('ar');
  });

  it('keeps the device’s language on a restore', () => {
    setupPreferences(fakePlatform({ lang: 'en' }).platform);

    establishSession(aSession({ language: 'ar' }), { source: 'restore' });

    expect(getPreferences().language).toBe('en');
  });
});
