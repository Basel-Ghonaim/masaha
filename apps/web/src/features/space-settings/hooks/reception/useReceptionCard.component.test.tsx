import type { SpaceSettings } from '@masaha/shared/space-settings';
import { Toaster, toast } from '@shared/design-system';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useReceptionCard } from './useReceptionCard';

const SETTINGS: SpaceSettings = {
  autoCheckoutAtClosing: true,
  maxStayMinutes: null,
  visitRounding: 'PER_MINUTE',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: true,
  visitStudentPrices: false,
  receptionMayTypePrices: false,
  reminderTemplate: null,
};

beforeEach(() => {
  startPreferences('ar');
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('useReceptionCard', () => {
  it('saves the hand-typed price switch alone, and says so', async () => {
    const requests = fakeTransport(() => ok({ ...SETTINGS, receptionMayTypePrices: true }));
    const { result } = renderHook(() => useReceptionCard({ spaceId: 7, settings: SETTINGS }), {
      wrapper: queryWrapper(),
    });
    expect(result.current.typePrices.label).toBe('يكتب الاستقبال سعرًا يدويًا');

    act(() => {
      result.current.typePrices.toggle(true);
    });
    expect(result.current.frame.unsaved).toBe('تغييرات غير محفوظة');
    await act(async () => {
      result.current.frame.save.submit();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]?.url).toBe('/manage/spaces/7/settings');
    expect(bodyOf(requests[0])).toEqual({ receptionMayTypePrices: true });
    expect(await findToast('حُفظت إعدادات «الاستقبال»')).toBeInTheDocument();
    expect(result.current.frame.unsaved).toBeNull();
  });
});
