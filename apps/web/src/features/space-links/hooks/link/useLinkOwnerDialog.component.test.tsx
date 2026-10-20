import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow, AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { bodyOf, fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { LinkTarget } from '../../types/LinkTarget';
import type { NamedLineView } from '../../types/NamedLineView';
import { useLinkOwnerDialog } from './useLinkOwnerDialog';

/** A request the fake server received. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** The marks that isolate a name inside a line, so it never reorders the words around it. */
const FSI = String.fromCodePoint(0x2068);
const PDI = String.fromCodePoint(0x2069);

const person = (row: Partial<AdminUserRow> & Pick<AdminUserRow, 'id' | 'name'>): AdminUserRow => ({
  email: `${row.name.toLowerCase()}@example.com`,
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
  ...row,
});

const RIMA = person({ id: 5, name: 'Rima' });
const HADI = person({
  id: 3,
  name: 'Hadi',
  role: 'OWNER',
  spaces: [{ id: 9, nameEn: 'Palm Hub', nameAr: null }],
});
const ADMIN = person({ id: 1, name: 'Admin', role: 'ADMIN' });

const space = (
  row: Partial<AdminSpaceRow> & Pick<AdminSpaceRow, 'id' | 'nameEn'>,
): AdminSpaceRow => ({
  slug: row.nameEn.toLowerCase().replace(' ', '-'),
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: false,
  isHidden: false,
  deletedAt: null,
  owners: [],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00.000Z',
  ...row,
});

const FOCUS = space({
  id: 7,
  nameEn: 'Focus Hub',
  isVerified: true,
  owners: [{ id: 6, name: 'Sami' }],
});
const PALM = space({ id: 9, nameEn: 'Palm Hub', owners: [{ id: 3, name: 'Hadi' }] });

/** From the editor of Focus Hub, an unverified space. */
const FROM_SPACE: LinkTarget = {
  from: 'space',
  space: { id: 7, name: { text: 'Focus Hub' } },
  addOwnerLink: '/dashboard/admin/owners',
};

/** From Hadi's row, an owner of Palm Hub. */
const FROM_PERSON: LinkTarget = {
  from: 'person',
  person: { id: 3, name: 'Hadi', role: 'OWNER', spaceIds: [9], deskIds: [] },
};

/** From Rima's row, a user with no link. */
const FROM_USER: LinkTarget = {
  from: 'person',
  person: { id: 5, name: 'Rima', role: 'USER', spaceIds: [], deskIds: [] },
};

/** A page of `rows`, the only one. */
function page(rows: unknown[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 50,
    totalPages: rows.length > 0 ? 1 : 0,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** The dialog's state for `target`, the server answering the link with `link`. */
function renderDialog(target: LinkTarget, link: () => FakeAnswer = () => ({ status: 204 })) {
  const requests = fakeTransport((request) => {
    if (request.url === '/admin/users') return page([RIMA, HADI, ADMIN]);
    if (request.url === '/admin/spaces') return page([FOCUS, PALM]);
    return link();
  });
  const close = vi.fn();
  const rendered = renderHook(() => useLinkOwnerDialog(target, close), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, requests, close };
}

type Dialog = ReturnType<typeof useLinkOwnerDialog>;

/** Chooses the option named `name`, once the options have come. */
async function choose(dialog: () => Dialog, name: string) {
  await waitFor(() => {
    expect(dialog().picker.choices.options.length).toBeGreaterThan(0);
  });
  act(() => {
    const picker = dialog().picker;
    if (picker.from === 'space') {
      const option = picker.choices.options.find((candidate) => candidate.name === name);
      if (option !== undefined) picker.choose(option);
    } else {
      const option = picker.choices.options.find((candidate) => candidate.name.text === name);
      if (option !== undefined) picker.choose(option);
    }
  });
}

/** A line as it reads, the name inside it. */
const text = (line: NamedLineView | string) =>
  typeof line === 'string' ? line : `${line.before}${line.name.text}${line.after}`;

const links = (requests: Request[]) =>
  requests.filter((request) => request.method === 'post').map((request) => request.url);

/** The toast whose title reads `text`, isolates and all, once it shows. */
const toastTitled = (title: string) =>
  findToast(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === title,
  );

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useLinkOwnerDialog', () => {
  it('says, before the act, that an unverified space becomes verified, and that a user becomes an owner', async () => {
    const { result } = renderDialog(FROM_SPACE);

    expect(result.current.consequence).toEqual([]);
    await choose(() => result.current, 'Rima');
    expect(result.current.consequence.map(text)).toEqual([
      'Focus Hub becomes verified and its owner edits it; the Masaha team no longer does.',
      'Their account becomes an owner’s, and they’re asked to sign in again.',
    ]);

    // An owner already is one: their account does not change.
    await choose(() => result.current, 'Hadi');
    expect(result.current.consequence.map(text)).toEqual([
      'Focus Hub becomes verified and its owner edits it; the Masaha team no longer does.',
    ]);
  });

  it('says that a verified space only gains another owner', async () => {
    const { result } = renderDialog(FROM_PERSON);

    await choose(() => result.current, 'Focus Hub');

    expect(result.current.consequence.map(text)).toEqual([
      'They become another owner of Focus Hub; it stays verified.',
    ]);
  });

  it('from a user’s row, says their account becomes an owner’s', async () => {
    const { result } = renderDialog(FROM_USER);

    await choose(() => result.current, 'Focus Hub');

    expect(result.current.consequence.map(text)).toEqual([
      'They become another owner of Focus Hub; it stays verified.',
      'Their account becomes an owner’s, and they’re asked to sign in again.',
    ]);
  });

  it('words the chosen space as the latest answer has it, not as it was when chosen', async () => {
    // Focus Hub is unverified when chosen; another admin links an owner before the link is made.
    let focus: AdminSpaceRow = { ...FOCUS, isVerified: false, owners: [] };
    fakeTransport((request) =>
      request.url === '/admin/spaces' ? page([focus, PALM]) : { status: 204 },
    );
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useLinkOwnerDialog(FROM_PERSON, vi.fn()), { wrapper });

    await choose(() => result.current, 'Focus Hub');
    expect(result.current.consequence.map(text)).toEqual([
      'Focus Hub becomes verified and its owner edits it; the Masaha team no longer does.',
    ]);

    focus = FOCUS;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['admin'] });
    });

    await waitFor(() => {
      expect(result.current.consequence.map(text)).toEqual([
        'They become another owner of Focus Hub; it stays verified.',
      ]);
    });
  });

  it('asks for a choice before anything is sent', async () => {
    const { result, requests } = renderDialog(FROM_SPACE);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    result.current.triggerRef.current = trigger;

    await act(async () => {
      await result.current.submit.run();
    });

    expect(result.current.field.error).toBe('Choose a person');
    expect(document.activeElement).toBe(trigger);
    expect(links(requests)).toEqual([]);
    trigger.remove();
  });

  it('links the chosen person, then closes and says so', async () => {
    render(<Toaster label="Notifications" />);
    const { result, requests, close } = renderDialog(FROM_SPACE);

    await choose(() => result.current, 'Rima');
    await act(async () => {
      await result.current.submit.run();
    });

    expect(links(requests)).toEqual(['/admin/spaces/7/owners']);
    expect(bodyOf(requests.find((request) => request.method === 'post'))).toEqual({ userId: 5 });
    expect(close).toHaveBeenCalledTimes(1);
    expect(await toastTitled(`${FSI}Rima${PDI} linked to Focus Hub`)).toBeInTheDocument();
    expect(await findToast('The space is now verified')).toBeInTheDocument();
  });

  it.each([
    [
      'RECEPTION_LINK_ACTIVE',
      refused(409, { type: 'conflict', code: 'RECEPTION_LINK_ACTIVE' }),
      'This person has a reception link at this space; its owner ends it first.',
    ],
    [
      'ACCOUNT_IS_ADMIN',
      refused(409, { type: 'conflict', code: 'ACCOUNT_IS_ADMIN' }),
      'This is an admin’s account; an admin can’t be linked to a space.',
    ],
    [
      'ACCOUNT_SUSPENDED',
      refused(409, { type: 'conflict', code: 'ACCOUNT_SUSPENDED' }),
      'This account is suspended; it can’t be linked until it’s restored.',
    ],
    [
      'ACCOUNT_PASSWORD_PENDING',
      refused(409, { type: 'conflict', code: 'ACCOUNT_PASSWORD_PENDING' }),
      'This person hasn’t changed their temporary password yet; they can’t be linked until they sign in and change it.',
    ],
    [
      'an unknown person',
      refused(422, { type: 'validation', errors: { userId: ['invalid_choice'] } }),
      'That account no longer exists.',
    ],
    [
      'a space deleted meanwhile',
      refused(404, { type: 'not_found' }),
      'The space was deleted meanwhile.',
    ],
  ])('words %s in the dialog, which stays open', async (_case, answer, line) => {
    const { result, close } = renderDialog(FROM_SPACE, () => answer);

    await choose(() => result.current, 'Rima');
    await act(async () => {
      await result.current.submit.run();
    });

    expect(result.current.failure).toMatchObject({
      kind: 'refused',
      title: 'Not linked',
      message: line,
    });
    expect(close).not.toHaveBeenCalled();
  });

  it('forgets the last refusal once another is chosen', async () => {
    const { result } = renderDialog(FROM_SPACE, () =>
      refused(409, { type: 'conflict', code: 'ACCOUNT_IS_ADMIN' }),
    );

    await choose(() => result.current, 'Rima');
    await act(async () => {
      await result.current.submit.run();
    });
    expect(result.current.failure).not.toBeNull();

    await choose(() => result.current, 'Hadi');
    expect(result.current.failure).toBeNull();
  });
});
