import { PHOTO_MAX_BYTES, photoOrderSchema } from '@masaha/shared/spaces';
import { Router } from 'express';

import { can, signedIn, spaceOf } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { receiveFile } from '../../shared/http/index.ts';
import { limitRequests, type Limiter } from '../../shared/rate-limit/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { PhotosController } from './photos/photos.controller.ts';
import { PHOTO_UPLOAD } from './spaces.limits.ts';

export function createPhotosManageRouter({
  photos,
  limiter,
}: {
  photos: PhotosController;
  limiter: Limiter;
}): Router {
  const router = Router();
  router.get('/', async (req, res) => {
    const { userId, role } = signedIn(req);
    if (!can({ id: userId, role }, 'space.read', spaceOf(req))) throw AppError.forbidden();
    await photos.list(req, res);
  });
  router.post(
    '/',
    limitRequests(limiter, (req) =>
      Promise.resolve({ policy: PHOTO_UPLOAD, by: [String(signedIn(req).userId)] }),
    ),
    receiveFile('photo', PHOTO_MAX_BYTES),
    photos.upload,
  );
  router.put('/order', validate(photoOrderSchema), photos.reorder);
  router.delete('/:photoId', photos.remove);
  return router;
}
