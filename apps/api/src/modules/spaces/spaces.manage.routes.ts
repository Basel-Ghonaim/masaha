import {
  FACT_GROUPS,
  updateSpaceAmenitiesSchema,
  updateSpaceContactsSchema,
  updateSpaceHoursSchema,
  updateSpacePricesSchema,
  updateSpaceProfileSchema,
} from '@masaha/shared/spaces';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { SpaceAmenitiesController } from './amenities/amenities.controller.ts';
import type { ConfirmController } from './confirm/confirm.controller.ts';
import type { ContactsController } from './contacts/contacts.controller.ts';
import type { HoursController } from './hours/hours.controller.ts';
import type { PricesController } from './prices/prices.controller.ts';
import type { ProfileController } from './profile/profile.controller.ts';
import type { SpaceController } from './space/space.controller.ts';

export function createSpacesManageRouter({
  space,
  profile,
  hours,
  prices,
  amenities,
  contacts,
  confirm,
}: {
  space: SpaceController;
  profile: ProfileController;
  hours: HoursController;
  prices: PricesController;
  amenities: SpaceAmenitiesController;
  contacts: ContactsController;
  confirm: ConfirmController;
}): Router {
  const router = Router();
  router.get('/', space.get);
  router.patch('/', validate(updateSpaceProfileSchema), profile.update);
  router.put('/hours', validate(updateSpaceHoursSchema), hours.update);
  router.put('/prices', validate(updateSpacePricesSchema), prices.update);
  router.put('/amenities', validate(updateSpaceAmenitiesSchema), amenities.update);
  router.put('/contacts', validate(updateSpaceContactsSchema), contacts.update);
  for (const group of FACT_GROUPS) router.post(`/${group}/confirm`, confirm.confirm(group));
  return router;
}
