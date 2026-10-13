import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';

import { AppError } from '../errors/index.ts';

/**
 * Reads one file from a multipart body into memory, at most `maxBytes`, under `field`, with no other
 * part (docs/backend/security.md › HTTP hardening). A larger file is `payload_too_large` (413);
 * any other part, a second file or a body it cannot read is `bad_request` (400). The file's name
 * and its declared type are never trusted: its consumer checks its content. It is `req.file`.
 */
export function receiveFile(field: string, maxBytes: number): RequestHandler {
  const read = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 0, parts: 1 },
  }).single(field);

  return (req, res, next) => {
    read(req, res, (error: unknown) => {
      if (error === undefined) next();
      else if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
        next(AppError.payloadTooLarge(undefined, error.message));
      } else next(AppError.badRequest(undefined, 'Unreadable upload'));
    });
  };
}
