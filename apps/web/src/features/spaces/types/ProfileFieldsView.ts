import type { CreateSpaceRequest } from '@masaha/shared/spaces';
import type { ServerForm } from '@shared/forms';
import type { PointPickerProps } from '@shared/map';
import type { AreaFieldProps } from './AreaField';
import type { ProfileValues } from './ProfileValues';

/**
 * The profile's fields, ready to render in their sections (`BasicsFields`, `LocationFields`): each
 * text's bindings, each field's error as text, their words, the area field's props and the map's.
 */
export type ProfileFieldsView = {
  field: ServerForm<ProfileValues, CreateSpaceRequest>['field'];
  errors: Partial<Record<keyof ProfileValues, string>>;
  labels: {
    basics: string;
    location: string;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    area: string;
    addressAr: string;
    addressEn: string;
    landmarkAr: string;
    landmarkEn: string;
    optional: string;
    pin: string;
    pinHint: string;
    coordinates: string;
    coordinatesHint: string;
  };
  area: AreaFieldProps;
  map: PointPickerProps;
};
