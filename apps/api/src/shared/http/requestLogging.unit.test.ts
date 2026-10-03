import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger } from './requestLogging.ts';

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  return { lines, logger: createLogger('info', stream) };
}

describe('createLogger', () => {
  it('redacts the session headers of a request log', () => {
    const { lines, logger } = capture();

    logger.info({
      req: { headers: { cookie: 'masaha_refresh=abc', authorization: 'Bearer abc', host: 'x' } },
      res: { headers: { 'set-cookie': ['masaha_refresh=def'] } },
    });

    expect(lines[0]).not.toMatch(/abc|def/);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      req: { headers: { cookie: '[Redacted]', authorization: '[Redacted]', host: 'x' } },
      res: { headers: { 'set-cookie': '[Redacted]' } },
    });
  });

  it.each(['password', 'currentPassword', 'token', 'accessToken', 'refreshToken', 'idToken'])(
    'redacts a field named %s at any depth the API logs',
    (field) => {
      const { lines, logger } = capture();

      logger.info({ [field]: 's1', body: { [field]: 's2' }, a: { b: { [field]: 's3' } } });

      expect(lines[0]).not.toMatch(/s1|s2|s3/);
    },
  );
});
