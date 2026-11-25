import { STORAGE_KEYS } from '@shared/storage';

/**
 * Runs `listener` when a password reset is completed in another tab of this browser: the reset page
 * marks it (`noteRecoveryDone`), and the browser tells every other tab of the write. A tab still
 * waiting on the link sent then offers the sign-in (ADR 0021, point 4; A1). The mark is read only by
 * its key; its value stays the sign-in's to take. Returns what stops it.
 */
export function onRecoveryDoneElsewhere(listener: () => void): () => void {
  const onStorage = ({ key, newValue }: Pick<StorageEvent, 'key' | 'newValue'>) => {
    if (key === STORAGE_KEYS.recoveredAt && newValue !== null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('storage', onStorage);
  };
}
