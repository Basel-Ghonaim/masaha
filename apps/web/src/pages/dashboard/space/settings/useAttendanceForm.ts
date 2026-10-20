import type { SpaceSettings } from '@masaha/shared/space-settings';
import { useSetCapacity } from '@features/occupancy';
import { useSaveSettings, type SettingsCardView } from '@features/space-settings';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { useServerForm } from '@shared/forms';
import { wholeNumberOf } from '@shared/lib';
import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { attendanceSchema, type AttendanceRequest } from './attendanceSchema';

type AttendanceValues = {
  capacity: string;
  autoCheckoutAtClosing: boolean;
  /** The stay limit in hours, as typed: the request's field, sent in minutes. */
  maxStayMinutes: string;
};

const MINUTES_PER_HOUR = 60;

function attendanceValues(capacity: number | null, settings: SpaceSettings): AttendanceValues {
  return {
    capacity: capacity === null ? '' : String(capacity),
    autoCheckoutAtClosing: settings.autoCheckoutAtClosing,
    maxStayMinutes:
      settings.maxStayMinutes === null ? '' : String(settings.maxStayMinutes / MINUTES_PER_HOUR),
  };
}

/** The schema's input: blank is none, a number typed is read whole, the hours sent as minutes. */
function attendanceInput(values: AttendanceValues) {
  const capacity = wholeNumberOf(values.capacity);
  const hours = wholeNumberOf(values.maxStayMinutes);
  return {
    capacity: capacity ?? null,
    autoCheckoutAtClosing: values.autoCheckoutAtClosing,
    maxStayMinutes:
      hours === undefined ? null : typeof hours === 'number' ? hours * MINUTES_PER_HOUR : hours,
  };
}

/**
 * The «الحضور والحالة المباشرة» card's form, once both of its capabilities' values have arrived: the
 * capacity, `occupancy`'s, and auto check-out at closing and the stay limit, `space-settings`'. One
 * save sends the capacity first, then the settings, each only when it changed; if the settings fail
 * after the capacity was saved — refused, or with no answer at all — the card's note says what was
 * saved and what was not, beside the failure, the saved capacity becomes its own, and every value
 * typed stays, so the next save sends only the settings (finding 96). A save that changed nothing
 * sends nothing and says so.
 */
export function useAttendanceForm(
  spaceId: number,
  capacity: number | null,
  settings: SpaceSettings,
) {
  const copy = useCopy();
  const words = copy.spaceSettings;
  const lines = words.attendance;
  const title = lines.title;
  const setCapacity = useSetCapacity(spaceId);
  const save = useSaveSettings(spaceId);
  const [unchanged, setUnchanged] = useState(false);
  const [partial, setPartial] = useState(false);
  const [failureCleared, setFailureCleared] = useState(false);
  const saved = attendanceValues(capacity, settings);

  const form = useServerForm<AttendanceValues, AttendanceRequest>({
    schema: attendanceSchema,
    defaultValues: saved,
    fields: ['capacity', 'autoCheckoutAtClosing', 'maxStayMinutes'],
    prepare: attendanceInput,
    submit: async (request) => {
      setPartial(false);
      const capacityChanged = request.capacity !== capacity;
      const changes = Object.fromEntries(
        (['autoCheckoutAtClosing', 'maxStayMinutes'] as const)
          .filter((name) => request[name] !== settings[name])
          .map((name) => [name, request[name]]),
      );
      const settingsChanged = Object.keys(changes).length > 0;
      if (!capacityChanged && !settingsChanged) {
        setUnchanged(true);
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      // The capacity first, `occupancy`'s; its answer becomes the card's own, whatever follows.
      let savedCapacity = capacity;
      if (capacityChanged) {
        savedCapacity = (await setCapacity.mutateAsync({ capacity: request.capacity })).capacity;
      }
      let savedSettings = settings;
      if (settingsChanged) {
        try {
          // Its own toast names the card: one toast for the one save.
          savedSettings = await save.mutateAsync({ request: changes, card: title });
        } catch (error) {
          // Said apart from the failure, so it shows whatever the failure is; every value stays.
          if (capacityChanged) setPartial(true);
          throw error;
        }
      } else {
        toast(words.card.saved({ card: title }));
      }
      form.form.reset(attendanceValues(savedCapacity, savedSettings));
    },
    failureTitle: words.card.failed({ card: title }),
    fieldLines: {
      capacity: lines.fieldErrors.capacity,
      maxStayMinutes: lines.fieldErrors.maxStay,
    },
    // After the capacity, something was saved: the refusal never says nothing was.
    failureLines: partial
      ? { ...words.refusals, forbidden: lines.forbiddenAfterCapacity }
      : words.refusals,
  });
  const { control, formState, setValue } = form.form;
  const autoOut = useWatch({ control, name: 'autoCheckoutAtClosing' });
  const savedKey = JSON.stringify(saved);

  // An unchanged card follows its values as the server answers them.
  useEffect(() => {
    if (!form.form.formState.isDirty) {
      form.form.reset(JSON.parse(savedKey) as AttendanceValues);
    }
  }, [savedKey, form.form]);

  const frame: SettingsCardView = {
    id: 'attendance',
    title,
    unsaved: formState.isDirty ? words.card.unsaved : null,
    failure: failureCleared && form.failure?.kind !== 'rateLimit' ? null : form.failure,
    save: {
      label: words.card.save,
      pending: form.isPending,
      blocked: form.blocked,
      submit: (event) => {
        setUnchanged(false);
        setFailureCleared(false);
        form.submit(event);
      },
    },
    discard: formState.isDirty
      ? {
          label: words.card.discard,
          run: () => {
            setUnchanged(false);
            setPartial(false);
            setFailureCleared(true);
            form.form.reset(saved);
          },
        }
      : null,
    note: partial ? lines.partial : unchanged && !formState.isDirty ? words.card.unchanged : null,
  };

  return {
    frame,
    capacity: {
      label: lines.capacity,
      helper: lines.capacityHelp,
      optional: lines.optional,
      binding: form.field('capacity'),
      error: form.errors.capacity,
    },
    autoOut: {
      label: lines.autoOut,
      helper: lines.autoOutHelp,
      checked: autoOut,
      disabled: form.isPending,
      toggle: (checked: boolean) => {
        setValue('autoCheckoutAtClosing', checked, { shouldDirty: true });
      },
    },
    maxStay: {
      label: lines.maxStay,
      helper: lines.maxStayHelp,
      optional: lines.optional,
      binding: form.field('maxStayMinutes'),
      error: form.errors.maxStayMinutes,
    },
  };
}
