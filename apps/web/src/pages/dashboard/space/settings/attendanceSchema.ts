import { setCapacitySchema, type SetCapacityRequest } from '@masaha/shared/occupancy';
import {
  updateSpaceSettingsSchema,
  type UpdateSpaceSettingsRequest,
} from '@masaha/shared/space-settings';
import type { FormSchema } from '@shared/forms';

/** The attendance card's request: the capacity, `occupancy`'s, and the two check-out settings. */
export type AttendanceRequest = SetCapacityRequest &
  Pick<UpdateSpaceSettingsRequest, 'autoCheckoutAtClosing' | 'maxStayMinutes'>;

type Issues = Extract<
  ReturnType<FormSchema<unknown>['safeParse']>,
  { success: false }
>['error']['issues'];

/**
 * The attendance card's check: each capability's contract on its own part — `occupancy`'s on the
 * capacity, `space-settings`' on the check-out settings — their data merged when both pass, else
 * every refusal of both, each on its own field (S8).
 */
export const attendanceSchema: FormSchema<AttendanceRequest> = {
  safeParse: (input) => {
    const { capacity, autoCheckoutAtClosing, maxStayMinutes } = (input ?? {}) as Record<
      string,
      unknown
    >;
    const capacityPart = setCapacitySchema.safeParse({ capacity });
    const settingsPart = updateSpaceSettingsSchema.safeParse({
      autoCheckoutAtClosing,
      maxStayMinutes,
    });
    if (capacityPart.success && settingsPart.success) {
      return { success: true, data: { ...settingsPart.data, ...capacityPart.data } };
    }
    const issues: Issues = [
      ...(capacityPart.success ? [] : capacityPart.error.issues),
      ...(settingsPart.success ? [] : settingsPart.error.issues),
    ];
    return { success: false, error: { issues } };
  },
};
