import type { AdminUserRow } from '@masaha/shared/space-links';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useUserLinkActions } from './useUserLinkActions';

const user = (row: Partial<AdminUserRow> & Pick<AdminUserRow, 'id' | 'name'>): AdminUserRow => ({
  email: `${row.name.toLowerCase()}@example.com`,
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
  ...row,
});

/** A user who works Palm Hub's front desk. */
const NOUR = user({
  id: 8,
  name: 'Nour',
  receptionSpaces: [{ id: 9, nameEn: 'Palm Hub', nameAr: null }],
});
/** An owner of Focus Hub. */
const HADI = user({
  id: 3,
  name: 'Hadi',
  role: 'OWNER',
  spaces: [{ id: 7, nameEn: 'Focus Hub', nameAr: null }],
});
const SARA = user({ id: 2, name: 'Sara', role: 'ADMIN' });
const SUSPENDED = user({ id: 4, name: 'Rami', isSuspended: true });

/** The row's link actions, in English, and where they open their dialog (`open`). */
function renderActions(row: AdminUserRow) {
  const open = vi.fn();
  const rendered = renderHook(() => useUserLinkActions(row, { open }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, open };
}

beforeEach(() => {
  startPreferences('en');
});

describe('useUserLinkActions', () => {
  it('names the menu after the person', () => {
    const { result } = renderActions(NOUR);

    expect(result.current.trigger.label).toBe('Actions: ⁨Nour⁩');
  });

  it.each([
    ['a user', NOUR, { id: 8, name: 'Nour', role: 'USER', spaceIds: [], deskIds: [9] }],
    ['an owner', HADI, { id: 3, name: 'Hadi', role: 'OWNER', spaceIds: [7], deskIds: [] }],
  ] as const)('offers to link %s, opening the link dialog from the person', (_who, row, person) => {
    const { result, open } = renderActions(row);

    expect(result.current.link).toMatchObject({ label: 'Link to a space', disabled: false });
    expect(result.current.link.reason).toBeUndefined();

    act(() => {
      result.current.link.run();
    });

    expect(open).toHaveBeenCalledExactlyOnceWith({
      kind: 'link',
      personId: person.id,
      target: { from: 'person', person },
    });
  });

  it.each([
    ['an admin', SARA, 'An admin’s account — never linked to a space'],
    ['a suspended account', SUSPENDED, 'The account is suspended — restore it first'],
  ])('holds the link, with its reason, for %s', (_who, row, reason) => {
    const { result, open } = renderActions(row);

    expect(result.current.link).toMatchObject({ disabled: true, reason });

    act(() => {
      result.current.link.run();
    });

    expect(open).not.toHaveBeenCalled();
  });
});
