import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../../test/startPreferences';
import { useSheetFrame } from './useSheetFrame';

beforeEach(() => {
  startPreferences('en');
});

describe('useSheetFrame', () => {
  it('tells the editor it has no changes once it unmounts with some, its section gone from under it', () => {
    const reportDirty = vi.fn<(dirty: boolean) => void>();
    const { unmount } = renderHook(() =>
      useSheetFrame({
        host: { open: true, close: vi.fn(), returnFocus: vi.fn(), reportDirty },
        title: 'Edit: about the space',
        description: null,
        form: { submit: vi.fn(), isPending: false, blocked: false, failure: null, isDirty: true },
      }),
    );
    expect(reportDirty).toHaveBeenLastCalledWith(true);

    unmount();

    expect(reportDirty).toHaveBeenLastCalledWith(false);
  });
});
