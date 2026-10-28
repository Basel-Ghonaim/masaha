import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import type { SpaceNameView } from '@shared/lib';
import { isolate } from '@shared/localisation';

/** The space's name under a toast, marked when it is not in the interface's language. */
function NameLine({ name }: { name: SpaceNameView }) {
  return (
    <span lang={name.lang} dir={name.dir}>
      {name.text}
    </span>
  );
}

/**
 * Says a favourite was saved or removed, naming the space, with «تراجع» (DI-49). Worded when it
 * lands, in the language the interface speaks then.
 */
export function toastFavoriteChanged(save: boolean, name: SpaceNameView, undo: () => void) {
  const words = currentCopy().favorites;
  toast.success(save ? words.added : words.removed, {
    description: <NameLine name={name} />,
    action: { label: words.undo, onClick: undo },
  });
}

/** Says a guest's favourite was saved once they came back signed in (DI-61). */
export function toastSavedOnReturn(name: SpaceNameView) {
  toast.success(currentCopy().favorites.savedOnReturn({ name: isolate(name.text) }));
}

/**
 * Says a save or a removal failed (DI-49): full favourites with «إدارة المفضّلة»; a space gone from
 * the directory; else which failed, naming the space, with «إعادة المحاولة».
 */
export function toastFavoriteFailed({
  save,
  name,
  error,
  retry,
  manage,
}: {
  save: boolean;
  name: SpaceNameView;
  error: AppError;
  retry: () => void;
  manage: () => void;
}) {
  const copy = currentCopy();
  const words = copy.favorites;
  if (error.code === 'FAVORITES_LIMIT_REACHED') {
    toast.error(copy.errors.FAVORITES_LIMIT_REACHED, {
      action: { label: words.manage, onClick: manage },
    });
    return;
  }
  if (error.status === 404) {
    toast.error(words.gone);
    return;
  }
  const line = (save ? words.saveFailed : words.removeFailed)({ name: isolate(name.text) });
  toast.error(line, { action: { label: copy.status.retry, onClick: retry } });
}
