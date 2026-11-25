import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRecoveryDoneElsewhere } from './recoveryElsewhere';

let stop: (() => void) | undefined;
let page: EventTarget;

// The unit lane's Node has no window: an event target stands in for it, as the browser's window
// receives another tab's writes to storage.
beforeEach(() => {
  page = new EventTarget();
  vi.stubGlobal('window', page);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
});

/** Another tab wrote `newValue` at `key` (`null`: removed; a null key: the storage cleared). */
function written(key: string | null, newValue: string | null) {
  page.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
}

describe('onRecoveryDoneElsewhere', () => {
  it('hears a reset completed in another tab', () => {
    const listener = vi.fn();
    stop = onRecoveryDoneElsewhere(listener);

    written('masaha.recoveredAt', String(Date.now()));

    expect(listener).toHaveBeenCalledOnce();
  });

  it.each([
    ['another key written', 'masaha.theme', 'dark'],
    ['the mark removed, as a sign-in takes it', 'masaha.recoveredAt', null],
    ['the storage cleared', null, null],
  ])('hears nothing for %s', (_case, key, value) => {
    const listener = vi.fn();
    stop = onRecoveryDoneElsewhere(listener);

    written(key, value);

    expect(listener).not.toHaveBeenCalled();
  });

  it('hears nothing once stopped', () => {
    const listener = vi.fn();
    onRecoveryDoneElsewhere(listener)();

    written('masaha.recoveredAt', String(Date.now()));

    expect(listener).not.toHaveBeenCalled();
  });
});
