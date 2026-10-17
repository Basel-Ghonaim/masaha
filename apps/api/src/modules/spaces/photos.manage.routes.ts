import { PHOTO_MAX_BYTES, photoOrderSchema } from '@masaha/shared/spaces';
import { Router } from 'express';

import { requireCan, signedIn } from '../../shared/auth/index.ts';
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
  const mayManagePhotos = requireCan('space.photos.manage');
  router.get('/', photos.list);
  router.post(
    '/',
    mayManagePhotos,
    limitRequests(limiter, (req) =>
      Promise.resolve({ policy: PHOTO_UPLOAD, by: [String(signedIn(req).userId)] }),
    ),
    receiveFile('photo', PHOTO_MAX_BYTES),
    photos.upload,
  );
  router.put('/order', mayManagePhotos, validate(photoOrderSchema), photos.reorder);
  router.delete('/:photoId', mayManagePhotos, photos.remove);
  return router;
}
