import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger } from '../../../shared/http/index.ts';
import { createLimiter, type Count, type Counter } from '../../../shared/rate-limit/index.ts';
import { CEILING_REACHED, createCappedEmailSender } from './cappedEmailSender.ts';
import type { EmailMessage, EmailSender } from './emailSender.ts';

function setup({ counterFails = false, ceilingUsed = 0 } = {}) {
  const counts = new Map<string, Count>();
  const counter: Counter = {
    hit(key) {
      if (counterFails) return Promise.reject(new Error('database down at sara@example.com'));
      const start = key.startsWith('email-ceiling:') && !counts.has(key) ? ceilingUsed : 0;
      const count = {
        hits: (counts.get(key)?.hits ?? start) + 1,
        resetAt: new Date(Date.now() + 60_000),
      };
      counts.set(key, count);
      return Promise.resolve(count);
    },
    // Its windows never end within a test, so a refund always lands in the window it was taken in.
    refund(key) {
      const count = counts.get(key);
      if (count && count.hits > 0) count.hits -= 1;
      return Promise.resolve();
    },
  };
  const delivered: EmailMessage[] = [];
  const inner: EmailSender = {
    send(message) {
      delivered.push(message);
      return Promise.resolve({ sent: true });
    },
  };
  const lines: string[] = [];
  const logger = createLogger(
    'info',
    new Writable({
      write(chunk: Buffer, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    }),
  );
  const sender = createCappedEmailSender(inner, {
    limiter: createLimiter(counter, () => new Date()),
    logger,
  });
  return { counts, delivered, lines, sender };
}

const message = (to = 'sara@example.com'): EmailMessage => ({
  to,
  subject: 's',
  text: 'https://masaha.example/reset-password#token=secret',
  html: '<p>secret</p>',
});

describe('createCappedEmailSender', () => {
  it('sends up to 3 messages an hour to one inbox, whatever the case of its address', async () => {
    const { delivered, sender } = setup();

    for (const to of ['sara@example.com', 'Sara@Example.com', 'SARA@example.com']) {
      expect(await sender.send(message(to))).toEqual({ sent: true });
    }
    const fourth = await sender.send(message());

    expect(fourth.sent).toBe(false);
    expect(delivered).toHaveLength(3);
    expect((await sender.send(message('omar@example.com'))).sent).toBe(true);
  });

  it('stops every send at the daily ceiling, and says so in the log', async () => {
    const { delivered, lines, sender } = setup({ ceilingUsed: 100 });

    expect((await sender.send(message())).sent).toBe(false);
    expect(delivered).toHaveLength(0);
    expect(lines.join('')).toContain(CEILING_REACHED);
  });

  it('delivers at most 10 emails a day asked for from one address', async () => {
    const { delivered, sender } = setup();

    for (let n = 0; n < 10; n++) {
      const result = await sender.send(message(`p${String(n)}@example.com`), { requester: 'ip' });
      expect(result.sent).toBe(true);
    }
    const eleventh = await sender.send(message('q@example.com'), { requester: 'ip' });
    const elsewhere = await sender.send(message('q@example.com'), { requester: 'other' });

    expect(eleventh.sent).toBe(false);
    expect(elsewhere.sent).toBe(true);
    expect(delivered).toHaveLength(11);
  });

  it('spends no ceiling slot on a request the requester cap refused', async () => {
    const { counts, sender } = setup();
    for (let n = 0; n < 10; n++) {
      await sender.send(message(`p${String(n)}@example.com`), { requester: 'ip' });
    }
    const ceiling = () =>
      [...counts.entries()].find(([key]) => key.startsWith('email-ceiling:'))?.[1].hits;
    expect(ceiling()).toBe(10);

    for (let n = 0; n < 5; n++) {
      expect(
        (await sender.send(message(`q${String(n)}@example.com`), { requester: 'ip' })).sent,
      ).toBe(false);
    }

    expect(ceiling()).toBe(10);
  });

  it('gives the requester slot back when a later cap refuses', async () => {
    const { counts, sender } = setup();
    for (let n = 0; n < 3; n++) await sender.send(message(), { requester: 'ip' });

    expect((await sender.send(message(), { requester: 'ip' })).sent).toBe(false);

    const requester = [...counts.entries()].find(([key]) => key.startsWith('email-requester:'));
    expect(requester?.[1].hits).toBe(3);
  });

  it('sends nothing when the caps cannot be checked, and says so apart from a cap', async () => {
    const { delivered, lines, sender } = setup({ counterFails: true });

    expect(await sender.send(message())).toEqual({ sent: false, reason: 'cap-unavailable' });
    expect(delivered).toHaveLength(0);
    expect(lines.join('')).toContain('a cap could not be checked');
    expect(lines.join('')).not.toContain('[email:ceiling]');
    expect(lines.join('')).not.toContain('sara@example.com');
  });

  it('turns a sender that throws into an unsent email, without the address', async () => {
    const { lines } = setup();
    const throwing = createCappedEmailSender(
      { send: () => Promise.reject(new Error('relay said no to sara@example.com')) },
      {
        limiter: createLimiter(
          {
            hit: () => Promise.resolve({ hits: 1, resetAt: new Date(Date.now() + 60_000) }),
            refund: () => Promise.resolve(),
          },
          () => new Date(),
        ),
        logger: createLogger(
          'info',
          new Writable({
            write(chunk: Buffer, _encoding, done) {
              lines.push(chunk.toString());
              done();
            },
          }),
        ),
      },
    );

    expect(await throwing.send(message())).toEqual({ sent: false, reason: 'sender-threw' });
    expect(lines.filter((line) => line.includes('"level":40'))).toHaveLength(1);
    // No line, at any level, carries the address the thrown message quoted.
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.join('')).not.toContain('sara@example.com');
  });

  it('counts by digests, never the address', async () => {
    const { counts, sender } = setup();

    await sender.send(message());

    expect([...counts.keys()].join(' ')).not.toContain('sara');
  });

  it('logs a failed send without its content', async () => {
    const { lines } = setup();
    const failing = createCappedEmailSender(
      { send: () => Promise.resolve({ sent: false, reason: 'relay refused' }) },
      {
        limiter: createLimiter(
          {
            hit: () => Promise.resolve({ hits: 1, resetAt: new Date(Date.now() + 60_000) }),
            refund: () => Promise.resolve(),
          },
          () => new Date(),
        ),
        logger: createLogger(
          'info',
          new Writable({
            write(chunk: Buffer, _encoding, done) {
              lines.push(chunk.toString());
              done();
            },
          }),
        ),
      },
    );

    expect(await failing.send(message())).toEqual({ sent: false, reason: 'relay refused' });
    expect(lines.join('')).toContain('relay refused');
    expect(lines.join('')).not.toMatch(/secret|sara@/);
  });
});
