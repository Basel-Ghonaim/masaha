import { emailSchema } from '@masaha/shared/core';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

// Google's OpenID Connect issuer and published signing keys.
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_KEYS = new URL('https://www.googleapis.com/oauth2/v3/certs');

/** Who a verified Google ID token says the person is. */
export interface GoogleProfile {
  /** The Google account's stable id, the `sub` claim. */
  subject: string;
  /** Verified by Google, normalised as every email is (`emailSchema`). */
  email: string;
  name: string | undefined;
  /** The `hd` claim: the Google Workspace domain that manages the account, if any. */
  hostedDomain: string | undefined;
}

// What jose throws for a token it refuses. Anything else, such as Google's keys failing to load,
// is the infrastructure's failure, not the token's, and is thrown on.
const TOKEN_REJECTIONS = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
];

/**
 * The port to Google's identity (R5): external infrastructure, wired in the composition root, so
 * tests sign in with a fake. `verify` answers nothing for a token it cannot trust, and throws when
 * it cannot tell, for example while Google's keys cannot be fetched.
 */
export interface GoogleIdentity {
  verify(idToken: string): Promise<GoogleProfile | undefined>;
}

/**
 * Verifies an ID token as docs/backend/security.md › Sign-in methods says: the signature against
 * Google's keys, the issuer, the audience (Masaha's client id), the expiry, and a verified email.
 */
export function createGoogleIdentity({
  clientId,
  keys = createRemoteJWKSet(GOOGLE_KEYS),
}: {
  clientId: string;
  keys?: JWTVerifyGetKey;
}): GoogleIdentity {
  return {
    async verify(idToken) {
      try {
        const { payload } = await jwtVerify(idToken, keys, {
          issuer: GOOGLE_ISSUERS,
          audience: clientId,
          algorithms: ['RS256'],
        });
        const { sub, email, email_verified: emailVerified, name, hd } = payload;
        const parsed = emailSchema.safeParse(email);
        if (!sub || !parsed.success || emailVerified !== true) return undefined;
        return {
          subject: sub,
          email: parsed.data,
          name: typeof name === 'string' ? name : undefined,
          hostedDomain: typeof hd === 'string' ? hd.toLowerCase() : undefined,
        };
      } catch (error) {
        if (TOKEN_REJECTIONS.some((rejection) => error instanceof rejection)) return undefined;
        throw error;
      }
    },
  };
}
