import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { createAccessTokens } from './accessToken.ts';

const SECRET = 'a-test-secret-of-at-least-32-characters';
const tokens = createAccessTokens(SECRET);
const claims = { userId: 7, mustChangePassword: false, sessionVersion: 3, sessionId: 41 } as const;

function sign(payload: Record<string, unknown>, alg = 'HS256', secret = SECRET) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setSubject('7')
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(secret));
}

describe('createAccessTokens', () => {
  it('reads back what it signs', async () => {
    expect(await tokens.verify(await tokens.sign(claims))).toEqual(claims);
  });

  it('expires after 15 minutes', async () => {
    const token = await tokens.sign(claims);
    const [, payload = ''] = token.split('.');
    const { iat, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      iat: number;
      exp: number;
    };

    expect(exp - iat).toBe(15 * 60);
  });

  it('refuses an altered, foreign, expired or differently signed token', async () => {
    const token = await tokens.sign(claims);
    const altered = `${token.slice(0, -2)}xx`;
    const foreign = await createAccessTokens('another-secret-of-at-least-32-chars').sign(claims);
    const expired = await new SignJWT({ mustChangePassword: false })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('7')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(new TextEncoder().encode(SECRET));
    const hs512 = await sign({ mustChangePassword: false }, 'HS512');

    for (const bad of [altered, foreign, expired, hs512, 'not-a-token']) {
      expect(await tokens.verify(bad)).toBeUndefined();
    }
  });

  it('refuses a token whose claims are not ours', async () => {
    expect(
      await tokens.verify(await sign({ mustChangePassword: 'no', sessionVersion: 3, sid: 41 })),
    ).toBeUndefined();
    expect(await tokens.verify(await sign({}))).toBeUndefined();
  });

  it('refuses a token without a session version, as one signed before it existed', async () => {
    for (const sessionVersion of [undefined, '3', 1.5, -1]) {
      expect(
        await tokens.verify(await sign({ mustChangePassword: false, sessionVersion, sid: 41 })),
      ).toBeUndefined();
    }
  });

  it("refuses a token without its session's id, as one signed before it existed", async () => {
    for (const sid of [undefined, '41', 1.5, 0, -1]) {
      expect(
        await tokens.verify(await sign({ mustChangePassword: false, sessionVersion: 3, sid })),
      ).toBeUndefined();
    }
  });

  it("carries who, the pending claim, the session version and the session's id, and no role", async () => {
    const [, payload = ''] = (await tokens.sign(claims)).split('.');

    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      sub: '7',
      mustChangePassword: false,
      sessionVersion: 3,
      sid: 41,
      iat: expect.any(Number) as number,
      exp: expect.any(Number) as number,
    });
  });
});
