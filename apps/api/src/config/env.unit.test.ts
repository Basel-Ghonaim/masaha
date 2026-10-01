import { describe, expect, it } from 'vitest';

import { EnvError, loadEnv } from './env.ts';

const valid = {
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://masaha:masaha@localhost:5433/masaha_dev',
  JWT_SECRET: 'a-development-secret-of-32-characters',
};

describe('loadEnv', () => {
  it('applies the defaults', () => {
    expect(loadEnv(valid)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://masaha:masaha@localhost:5433/masaha_dev',
      JWT_SECRET: 'a-development-secret-of-32-characters',
      LOG_LEVEL: 'info',
      TRUST_PROXY: 'loopback',
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
