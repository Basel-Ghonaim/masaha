import { createQueryClient } from '@shared/api';
import { getPreferences, setupPreferences } from '@shared/preferences';
import { establishSession, refreshSession } from '@shared/session';
import { beforeAll, describe, expect, it } from 'vitest';
import { fakePlatform } from '../test/fakePlatform';
import { aSession, appError, fakeSessionRepository, fakeHint } from '../test/fakeSession';
import { connectSession } from './session';

const queryClient = createQueryClient();

beforeAll(() => {
  connectSession(queryClient);
});

describe('connectSession', () => {
  it('clears the cached server state when the session ends', async () => {
    setupPreferences(fakePlatform().platform);
    establishSession(aSession(), { source: 'signIn' });
    queryClient.setQueryData(['me', 'favorites'], [7]);
    const repository = fakeSessionRepository({
      refresh: () => Promise.reject(appError('unauthorized', 401)),
    });

    await expect(refreshSession({ repository, hint: fakeHint(true) })).rejects.toMatchObject({
      status: 401,
    });

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
