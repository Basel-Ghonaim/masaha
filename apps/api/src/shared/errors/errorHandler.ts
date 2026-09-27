import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError, errorTypeForStatus } from './appError.ts';

/** Registered after every route: anything unmatched is a `not_found`. */
export const notFoundHandler: RequestHandler = (req) => {
  throw AppError.notFound(undefined, `No route for ${req.method} ${req.path}`);
};

/** The one error handler, registered last. Shapes every error into the envelope. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);
  if (appError.status >= 500) {
    req.log.error({ err: error }, appError === error ? appError.message : 'Unhandled error');
  }

  res.status(appError.status).json({
    success: false,
    error: {
      type: appError.type,
      ...(appError.code && { code: appError.code }),
      message: appError.message,
      ...(appError.errors && { errors: appError.errors }),
    },
  });
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Express's own middleware (the JSON parser) throws http-errors: malformed JSON (400), a body
  // over the limit (413), an unsupported charset or encoding (415). Their status is safe to show.
  if (isClientHttpError(error)) {
    const type = errorTypeForStatus(error.status);
    if (type) return new AppError(type);
  }

  // Anything else is a bug: the client gets a generic error, never the message or the stack.
  return AppError.server();
}

function isClientHttpError(error: unknown): error is { status: number; expose: true } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'expose' in error &&
    error.expose === true &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}
