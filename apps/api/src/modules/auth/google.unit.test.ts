import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
  type CryptoKey,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { createGoogleIdentity, type GoogleIdentity } from './google.ts';

const CLIENT_ID = 'masaha.apps.googleusercontent.com';
const valid: JWTPayload = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: '1234567890',
  email: 'Sara@Gmail.com',
  email_verified: true,
  name: 'Sara',
};

let google: GoogleIdentity;
let privateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  // Google's published keys, as a local set: the verification runs without the network.
  google = createGoogleIdentity({ clientId: CLIENT_ID, keys: createLocalJWKSet({ keys: [jwk] }) });
});

function idToken(payload: JWTPayload, expiresIn: string | number = '1h', key = privateKey) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

describe('createGoogleIdentity', () => {
  it('reads who a valid ID token names, with the email lowercased', async () => {
    expect(await google.verify(await idToken(valid))).toEqual({
      subject: '1234567890',
      email: 'sara@gmail.com',
      name: 'Sara',
    });
    expect(
      await google.verify(await idToken({ ...valid, iss: 'accounts.google.com' })),
    ).toBeDefined();
  });

  it.each([
    ['another audience', { aud: 'another.apps.googleusercontent.com' }],
    ['another issuer', { iss: 'https://evil.example.com' }],
    ['an unverified email', { email_verified: false }],
    ['no email', { email: undefined }],
  ])('refuses a token with %s', async (_case, change) => {
    expect(await google.verify(await idToken({ ...valid, ...change }))).toBeUndefined();
  });

  it('refuses an expired token, one signed by another key, and one that is not a token', async () => {
    const other = await generateKeyPair('RS256');
    const expired = await idToken(valid, Math.floor(Date.now() / 1000) - 60);
    const foreign = await idToken(valid, '1h', other.privateKey);

    for (const token of [expired, foreign, 'not-a-token']) {
      expect(await google.verify(token)).toBeUndefined();
    }
  });

  it('refuses a token signed with a shared secret instead of Google’s key', async () => {
    const hs256 = await new SignJWT(valid)
      .setProtectedHeader({ alg: 'HS256', kid: 'k1' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-secret-of-at-least-32-characters-long'));

    expect(await google.verify(hs256)).toBeUndefined();
  });
});
