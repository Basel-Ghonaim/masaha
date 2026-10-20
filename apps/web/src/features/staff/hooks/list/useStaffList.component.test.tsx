import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useStaffList } from './useStaffList';

const RAHAF: StaffMember = {
  userId: 15,
  name: 'رهف',
  email: 'rahaf@example.com',
  isActive: true,
  temporaryPassword: null,
};
/** Added, their temporary password not changed yet. */
const SAMI: StaffMember = {
  ...RAHAF,
  userId: 16,
  name: 'سامي',
  email: 'sami@example.com',
  temporaryPassword: { expiresAt: '2999-01-01T00:00:00Z' },
};
/** Deactivated by the owner. */
const LINA: StaffMember = { ...RAHAF, userId: 17, name: 'لينا', isActive: false };

function renderList(answer: Parameters<typeof fakeTransport>[0]) {
  fakeTransport(answer);
  return renderHook(() => useStaffList(7), { wrapper: queryWrapper() });
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useStaffList', () => {
  it('lists the staff whole with their badges and their count, in its plural form', async () => {
    const { result } = renderList(() => ok([RAHAF, SAMI, LINA]));

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(
      result.current.rows.map(({ name, badges }) => [name, badges.map(({ label }) => label)]),
    ).toEqual([
      ['رهف', ['نشط']],
      ['سامي', ['نشط', 'لم يغيّر كلمة المرور المؤقتة بعد']],
      ['لينا', ['بلا وصول']],
    ]);
    expect(result.current.count).toBe('3 موظفين');
  });

  it('is empty, with the words that invite the first one', async () => {
    const { result } = renderList(() => ok([]));

    await waitFor(() => {
      expect(result.current.status).toBe('empty');
    });
    expect(result.current.empty).toEqual({
      title: 'لا يوجد موظفون',
      description: 'يمكنك إدارة المكتب بنفسك أو إضافة موظف استقبال.',
    });
  });

  it('fetches the owner’s own spaces again when the list is refused 404', async () => {
    fakeTransport(() => refused(404, { type: 'not_found' }));
    const client = createQueryClient();
    client.setQueryData(['me', 'spaces'], []);
    const { result } = renderHook(() => useStaffList(7), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(client.getQueryState(['me', 'spaces'])?.isInvalidated).toBe(true);
  });

  it('says the list failed to load, with its reference, and loads it again on retry', async () => {
    let fail = true;
    const { result } = renderList(() => (fail ? refused(404, { type: 'not_found' }) : ok([RAHAF])));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failure.title).toBe('تعذّر تحميل الموظفين');
    expect(result.current.failure.reference).toMatch(/req-1/);
    fail = false;
    result.current.failure.retry();
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });
});
