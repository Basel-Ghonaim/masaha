import { describe, expect, it } from 'vitest';

import { EnvError, loadEnv, secureCookiesOf, trustProxyOf } from './env.ts';

const valid = {
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://masaha:masaha@localhost:5433/masaha_dev',
  JWT_SECRET: 'a-development-secret-of-32-characters',
};

const smtp = {
  EMAIL_MODE: 'smtp',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_USER: 'masaha@example.com',
  SMTP_PASSWORD: 'an-app-password',
  EMAIL_FROM: 'Masaha <masaha@example.com>',
};

describe('loadEnv', () => {
  it('applies the defaults', () => {
    expect(loadEnv(valid)).toEqual({
      NODE_ENV: 'development',
      PORT: 3320,
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://masaha:masaha@localhost:5433/masaha_dev',
      JWT_SECRET: 'a-development-secret-of-32-characters',
      LOG_LEVEL: 'info',
      TRUST_PROXY: undefined,
      GOOGLE_CLIENT_ID: undefined,
      EMAIL: { mode: 'log' },
    });
  });

  it('coerces the port', () => {
    expect(loadEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('reads a number of proxy hops as a number', () => {
    expect(loadEnv({ ...valid, TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
    expect(loadEnv({ ...valid, TRUST_PROXY: 'loopback, 10.0.0.1' }).TRUST_PROXY).toBe(
      'loopback, 10.0.0.1',
    );
  });

  it('reads an empty optional setting as absent, and requires the Google client id in production', () => {
    expect(loadEnv({ ...valid, GOOGLE_CLIENT_ID: '' }).GOOGLE_CLIENT_ID).toBeUndefined();
    expect(() => loadEnv({ ...valid, NODE_ENV: 'production' })).toThrow(/GOOGLE_CLIENT_ID/);
    expect(
      loadEnv({
        ...valid,
        ...smtp,
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com',
        TRUST_PROXY: '1',
      }).GOOGLE_CLIENT_ID,
    ).toBe('id.apps.googleusercontent.com');
  });

  it('allows the email log mode, which sends nothing and logs the link, in development only', () => {
    expect(loadEnv(valid).EMAIL).toEqual({ mode: 'log' });
    for (const NODE_ENV of ['test', 'production']) {
      expect(() => loadEnv({ ...valid, NODE_ENV, GOOGLE_CLIENT_ID: 'id' })).toThrow(/EMAIL_MODE/);
    }
  });

  it('refuses to start in smtp mode until every SMTP setting is given', () => {
    const load = () => loadEnv({ ...valid, EMAIL_MODE: 'smtp' });

    for (const name of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM']) {
      expect(load).toThrow(new RegExp(name));
    }
    expect(loadEnv({ ...valid, ...smtp, SMTP_PORT: '587', SMTP_SECURE: 'false' }).EMAIL).toEqual({
      mode: 'smtp',
      settings: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'masaha@example.com',
        password: 'an-app-password',
        from: 'Masaha <masaha@example.com>',
      },
    });
  });

  it('starts in production with Google and a delivering email mode', () => {
    expect(
      loadEnv({
        ...valid,
        ...smtp,
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: 'id',
        TRUST_PROXY: '1',
      }).NODE_ENV,
    ).toBe('production');
  });

  it('requires NODE_ENV: a missing one never falls back to development', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: undefined })).toThrow(/NODE_ENV/);
  });

  it('requires TRUST_PROXY in production, and trusts loopback elsewhere', () => {
    const production = { ...valid, ...smtp, NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'id' };

    expect(() => loadEnv(production)).toThrow(/TRUST_PROXY/);
    expect(trustProxyOf(loadEnv({ ...production, TRUST_PROXY: '1' }))).toBe(1);
    expect(trustProxyOf(loadEnv(valid))).toBe('loopback');
  });

  it('makes the cookies Secure everywhere but development', () => {
    expect(secureCookiesOf(loadEnv(valid))).toBe(false);
    expect(secureCookiesOf(loadEnv({ ...valid, ...smtp, NODE_ENV: 'test' }))).toBe(true);
  });

  it('names a missing variable', () => {
    expect(() => loadEnv({})).toThrow(EnvError);
    expect(() => loadEnv({})).toThrow(/CORS_ORIGIN/);
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({})).toThrow(/JWT_SECRET/);
  });

  it('refuses a JWT secret shorter than 32 characters', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'x'.repeat(31) })).toThrow(/JWT_SECRET/);
  });

  it('refuses a database URL that is not PostgreSQL', () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: 'mysql://localhost:3306/masaha' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('names every invalid variable at once', () => {
    const load = () => loadEnv({ CORS_ORIGIN: 'not a url', PORT: '0', NODE_ENV: 'staging' });

    expect(load).toThrow(/CORS_ORIGIN/);
    expect(load).toThrow(/PORT/);
    expect(load).toThrow(/NODE_ENV/);
  });
});
