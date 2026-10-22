import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { publicSpace } from '../../../../test/publicSpace';
import { nearMeStore } from '../near/nearMeStore';
import { useSpacePage } from './useSpacePage';

const NOW = new Date('2026-10-22T10:00:00Z');

function renderPage(answer: Parameters<typeof fakeTransport>[0], width = 1440) {
  stubScreenWidth(width);
  const requests = fakeTransport(answer);
  const Query = queryWrapper();
  const wrapper = ({ children }: { children: ReactNode }) => <Query>{children}</Query>;
  return { ...renderHook(() => useSpacePage('noor-hub'), { wrapper }), requests };
}

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSpacePage', () => {
  it('a 404 is «لم نجد هذه المساحة»; a failure says so with its reference and tries again; no connection says so', async () => {
    const missing = renderPage(() => refused(404, { type: 'not_found' }));
    await waitFor(() => {
      expect(missing.result.current.state).toBe('notFound');
    });
    expect(missing.result.current.notFound).toEqual({
      title: 'لم نجد هذه المساحة',
      text: 'ربما أُزيلت من الدليل، أو أن الرابط غير صحيح.',
      browse: 'تصفّح المساحات',
    });
    expect(missing.result.current.failure).toBeNull();
    missing.unmount();

    // The transport tries a GET twice more, after 1 s and 2 s, before it gives up.
    let pageAttempts = 0;
    const failed = renderPage((request) => {
      if (request.url?.includes('/occupancy')) return ok({ status: 'AVAILABLE' });
      pageAttempts += 1;
      return pageAttempts <= 3 ? refused(500, { type: 'server' }) : ok(publicSpace());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    await waitFor(() => {
      expect(failed.result.current.state).toBe('failed');
    });
    expect(failed.result.current.failure).toMatchObject({
      title: 'تعذّر تحميل صفحة المساحة',
      reference: expect.stringContaining('req-1') as unknown,
    });
    act(() => {
      failed.result.current.failure?.retry.run();
    });
    await waitFor(() => {
      expect(failed.result.current.state).toBe('ready');
    });
    expect(failed.requests.filter((request) => !request.url?.includes('/occupancy'))).toHaveLength(
      4,
    );
    const serverLine = failed.result.current.failure?.line;
    failed.unmount();

    const offline = renderPage(() => ({ failure: 'ERR_NETWORK' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    await waitFor(() => {
      expect(offline.result.current.state).toBe('failed');
    });
    expect(offline.result.current.failure?.line).toBe(
      'لا يوجد اتصال. تحقّق من الإنترنت وحاول مرة أخرى.',
    );
    expect(offline.result.current.failure?.reference).toBeNull();
    expect(serverLine).toBeUndefined();
  });

  it('hidden prices say why, with their date; prices never saved say so', async () => {
    const hidden = renderPage(() =>
      ok(publicSpace({ isVerified: false, prices: null, staleGroups: ['prices'] })),
    );
    await waitFor(() => {
      expect(hidden.result.current.state).toBe('ready');
    });
    expect(hidden.result.current.prices).toMatchObject({
      state: 'hidden',
      hidden: 'لا نعرض الأسعار لأنها لم تُحدَّث منذ مدة. اسأل المساحة عن السعر الحالي.',
      meta: { lines: ['آخر تحديث للأسعار أول أمس'], stale: 'قد يكون تغيّر' },
      check: null,
    });
    hidden.unmount();

    const none = renderPage(() => ok(publicSpace({ prices: [], hours: null })));
    await waitFor(() => {
      expect(none.result.current.state).toBe('ready');
    });
    expect(none.result.current.prices.state).toBe('none');
    expect(none.result.current.prices.none).toBe('لم تُضف أسعار بعد');
    expect(none.result.current.hours.none).toBe('لم تُضف ساعات العمل بعد');

    const stale = renderPage(() => ok(publicSpace({ staleGroups: ['prices'] })));
    await waitFor(() => {
      expect(stale.result.current.state).toBe('ready');
    });
    expect(stale.result.current.prices.check).toBe('تأكّد من السعر مع المساحة قبل الذهاب.');
    expect(stale.result.current.prices.meta.lines).toEqual([
      'آخر تحديث للأسعار أول أمس',
      'للعرض فقط · الدفع في المساحة',
    ]);
  });

  it('the unverified notice dates the profile; the bar exists only with a WhatsApp or a phone contact', async () => {
    const unverified = renderPage(() => ok(publicSpace({ isVerified: false })), 390);
    await waitFor(() => {
      expect(unverified.result.current.state).toBe('ready');
    });
    expect(unverified.result.current.unverified?.text).toBe(
      'جمع فريقنا هذه المعلومات، ولم تؤكّدها إدارة المساحة بعد · آخر تحديث للمعلومات أول أمس',
    );
    expect(unverified.result.current.header?.verified).toBeNull();
    expect(unverified.result.current.bar).toEqual({
      label: 'التواصل السريع',
      whatsapp: { label: 'واتساب', href: 'https://wa.me/970599111001' },
      call: { label: 'اتصال', href: 'tel:+970599111002' },
    });
    expect(unverified.result.current.phone).toBe(true);
    unverified.unmount();

    const emailOnly = renderPage(() =>
      ok(publicSpace({ contacts: [{ type: 'EMAIL', value: 'hi@noor.ps' }] })),
    );
    await waitFor(() => {
      expect(emailOnly.result.current.state).toBe('ready');
    });
    expect(emailOnly.result.current.unverified).toBeNull();
    expect(emailOnly.result.current.bar).toBeNull();
    expect(emailOnly.result.current.contacts?.items.map((item) => item.label)).toEqual(['بريد']);
  });

  it('says the distance from a point near me holds, rounded as the server rounds it', async () => {
    nearMeStore.granted({ lat: 31.5, lng: 34.45 }, 'device');
    const { result } = renderPage(() => ok(publicSpace()));
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    // 0.02° of latitude: 2,224 m, said as 2.2 km.
    expect(result.current.panel.distance).toBe('نحو 2.2 كم');
    expect(result.current.panel.today).toBe('اليوم ⁦08:00–22:00⁩');
  });
});
