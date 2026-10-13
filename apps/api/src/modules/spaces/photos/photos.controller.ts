import type { PhotoOrderRequest, SpacePhoto } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { sendNoContent, sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { PhotosService } from './photos.service.ts';

export function createPhotosController(service: PhotosService) {
  return {
    list: async (req: Request, res: Response) => {
      const photos = await service.list(spaceOf(req).id);
      sendSuccess(res, photos satisfies SpacePhoto[]);
    },

    /** The photo `receiveFile` read, under the `photo` part. */
    upload: async (req: Request, res: Response) => {
      if (!req.file) throw AppError.validation({ photo: ['required'] });
      const { userId, role } = signedIn(req);
      const photo = await service.upload({ id: userId, role }, spaceOf(req), req.file.buffer);
      sendSuccess(res, photo satisfies SpacePhoto, { status: 201 });
    },

    remove: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      await service.remove({ id: userId, role }, spaceOf(req), parseId(req.params.photoId));
      sendNoContent(res);
    },

    reorder: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const { ids } = req.body as PhotoOrderRequest;
      await service.reorder({ id: userId, role }, spaceOf(req), ids);
      sendNoContent(res);
    },
  };
}

export type PhotosController = ReturnType<typeof createPhotosController>;
