import { randomUUID } from 'node:crypto';

import type { Request } from 'express';
import {
  destination as pinoDestination,
  pino,
  type DestinationStream,
  type Level,
  type Logger,
} from 'pino';
import { pinoHttp } from 'pino-http';

// What a log line never holds (docs/backend/security.md › HTTP hardening): the headers that carry
// a session, and any field named like a password or a token, at the depths the API logs them.
// Request bodies are never logged: pino-http's request serializer leaves them out.
const SECRET_FIELDS = [
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
];

export const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  ...SECRET_FIELDS.flatMap((field) => [field, `*.${field}`, `*.*.${field}`]),
];

/**
 * The API's logger, with the redaction every line goes through. By default it writes to stdout
 * synchronously: the request's line is written as its response finishes, and online a function may
 * be frozen right after, so a buffered line could be lost (conventions §10, §12).
 */
export function createLogger(level: Level | 'silent', destination?: DestinationStream): Logger {
  const options = { level, redact: { paths: REDACTED_PATHS } };
  return pino(options, destination ?? pinoDestination({ dest: 1, sync: true }));
}

/**
 * The request logger (docs/backend/conventions.md §10). Every request gets a UUID generated here,
 * never taken from the client: it is in the request's log lines, the `X-Request-Id` header and the
 * error envelope. A 4xx is logged at `warn`, a 5xx at `error`.
 */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    // The signed-in user and their role, once requireAuth has read them (conventions §10).
    customProps: (req) => {
      const { auth } = req as Request;
      return auth ? { userId: auth.userId, role: auth.role } : {};
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}
