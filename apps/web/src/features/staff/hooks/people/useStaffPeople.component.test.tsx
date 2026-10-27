import type { StaffMember } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useStaffList } from '../list/useStaffList';
import { useStaffPeople } from './useStaffPeople';

const member = (change: Partial<StaffMember>): StaffMember => ({
  userId: 15,
  name: 'Laila',
  email: 'laila@example.com',
  isActive: true,
  temporaryPassword: null,
  ...change,
});

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useStaffPeople', () => {
  it('names the reception accounts, a deactivated one marked, from the staff list’s one request', async () => {
    const requests = fakeTransport(() =>
      ok([member({}), member({ userId: 35, name: 'Rami', isActive: false })]),
    );
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    // The staff page's list and the ledger's filter, side by side, share one read.
    const { result } = renderHook(() => ({ people: useStaffPeople(7), list: useStaffList(7) }), {
      wrapper,
    });

    expect(result.current.people.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.people.state).toBe('ready');
    });
    expect(result.current.people.people).toEqual([
      { id: 15, name: 'Laila', active: true },
      { id: 35, name: 'Rami', active: false },
    ]);
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/staff']);
  });
});
