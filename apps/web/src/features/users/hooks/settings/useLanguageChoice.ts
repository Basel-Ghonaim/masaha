import type { Language } from '@masaha/shared/core';
import type { MyAccount, UpdateMeRequest } from '@masaha/shared/users';
import { CATALOGUES, currentCopy, useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { getPreferences, setLanguage, usePreferences } from '@shared/preferences';
import { accountEdited } from '@shared/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';
import { MY_ACCOUNT_KEY } from './useMyAccountQuery';

const repository = createUsersRepository();

/**
 * «اللغة» (C6): a choice applies at once, as the headers' toggle does, and is saved to the account
 * (`PATCH /me { language }`), so a sign-in elsewhere takes it. A failed save puts the language back
 * and says «تعذّر حفظ اللغة» with «إعادة المحاولة» (P8's exception: a success shows in place).
 */
export function useLanguageChoice() {
  const copy = useCopy();
  const client = useQueryClient();
  const language = usePreferences((preferences) => preferences.language);
  const save = useMutation<MyAccount, AppError, { language: Language; before: Language }>({
    mutationFn: ({ language: chosen }) =>
      repository.updateMe({ language: chosen } satisfies UpdateMeRequest),
    onSuccess: (edited) => {
      client.setQueryData(MY_ACCOUNT_KEY, edited);
      accountEdited(edited.id, { language: edited.language });
    },
    onError: (_error, { language: chosen, before }) => {
      setLanguage(before);
      const words = currentCopy();
      toast.error(words.users.settings.preferences.languageFailed, {
        action: {
          label: words.status.retry,
          onClick: () => {
            choose(chosen);
          },
        },
      });
    },
  });
  function choose(chosen: Language) {
    const before = getPreferences().language;
    if (chosen === before) return;
    setLanguage(chosen);
    save.mutate({ language: chosen, before });
  }

  return {
    label: copy.users.settings.preferences.language,
    helper: copy.users.settings.preferences.languageHelper,
    value: language,
    // Each language named in its own words, as the headers' toggle names it.
    options: (['ar', 'en'] as const).map((value) => ({
      value,
      label: CATALOGUES[value].preferences.languageName,
    })),
    choose,
  };
}
