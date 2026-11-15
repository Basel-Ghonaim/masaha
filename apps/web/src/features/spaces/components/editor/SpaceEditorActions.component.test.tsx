import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { SPACE } from '../../../../test/spaceFixtures';
import { startPreferences } from '../../../../test/startPreferences';
import { SpaceEditorActions } from './SpaceEditorActions';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** The actions of space 7's profile, beside the deleted spaces' list; `write` answers each write. */
function renderActions(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ({ status: 204 }),
) {
  let hidden = false;
  const requests = fakeTransport((request) => {
    if (request.method === 'get') {
      return request.url === '/admin/spaces/7' ? ok({ ...SPACE, isHidden: hidden }) : ok([]);
    }
    if (request.url === '/admin/spaces/7/hidden') {
      hidden = !hidden;
    }
    return write(request);
  });
  const router = createMemoryRouter(
    [
      {
        path: '/spaces/7',
        element: <SpaceEditorActions spaceId={7} deletedLink="/spaces?status=deleted" />,
      },
      { path: '/spaces', element: <p>The spaces list</p> },
    ],
    { initialEntries: ['/spaces/7'] },
  );
  const rendered = render(
    <QueryClientProvider client={createQueryClient()}>
      <Toaster label="Notifications" closeLabel="Close notification" />
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, router, writes };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('the admin’s actions in the profile’s top bar (H4)', () => {
  it('hides the space at once, says so with «تراجع», and offers to show it again', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const { writes } = renderActions();

    await user.click(await screen.findByRole('button', { name: 'Hide from visitors' }));

    expect(writes().map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'put /admin/spaces/7/hidden',
    ]);
    const done = await findToast(/hidden from the site/i);
    expect(
      within(done.closest('li') as HTMLElement).getByRole('button', { name: 'Undo' }),
    ).toBeVisible();
    expect(await screen.findByRole('button', { name: 'Show to visitors' })).toBeInTheDocument();
  });

  it('asks before deleting, «رجوع» keeping the space; «حذف» leads to the deleted spaces', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    const { writes, router } = renderActions();
    const remove = await screen.findByRole('button', { name: 'Delete the space' });

    await user.click(remove);
    const ask = await screen.findByRole('alertdialog');
    expect(within(ask).getByRole('button', { name: 'Back' })).toHaveFocus();
    await user.click(within(ask).getByRole('button', { name: 'Back' }));
    expect(writes()).toEqual([]);
    expect(remove).toHaveFocus();

    await user.click(remove);
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname + router.state.location.search).toBe(
        '/spaces?status=deleted',
      );
    });
    expect(writes().map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'delete /admin/spaces/7',
    ]);
    const done = await findToast(/deleted/i);
    expect(
      within(done.closest('li') as HTMLElement).getByRole('button', { name: 'Undo' }),
    ).toBeVisible();
  });

  it('holds both in one menu below 768 px, «إجراءات الصفحة»', async () => {
    stubScreenWidth(390);
    const user = userEvent.setup();
    const { container } = renderActions();

    await user.click(await screen.findByRole('button', { name: 'Page actions' }));

    expect(screen.getByRole('menuitem', { name: 'Hide from visitors' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete the space' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('marks the menu’s items while one waits, never disabled, so the keyboard still reaches them', async () => {
    stubScreenWidth(390);
    const user = userEvent.setup();
    const { writes } = renderActions(() => new Promise(() => undefined));
    await user.click(await screen.findByRole('button', { name: 'Page actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Hide from visitors' }));
    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });

    await user.click(screen.getByRole('button', { name: 'Page actions' }));
    await user.keyboard('{ArrowDown}');

    const hide = screen.getByRole('menuitem', { name: 'Hide from visitors' });
    expect(hide).toHaveFocus();
    expect(hide).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Delete the space' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.keyboard('{Enter}');
    expect(writes()).toHaveLength(1);
  });

  it('offers nothing once the space is found deleted on a later read', async () => {
    stubScreenWidth(1440);
    let reads = 0;
    fakeTransport((request) => {
      if (request.method === 'get' && request.url === '/admin/spaces/7') {
        reads += 1;
        return reads === 1
          ? ok({ ...SPACE, isHidden: false })
          : refused(404, { type: 'notFound', code: 'SPACE_NOT_FOUND' });
      }
      return ok([]);
    });
    const queryClient = createQueryClient();
    const router = createMemoryRouter(
      [
        {
          path: '/spaces/7',
          element: <SpaceEditorActions spaceId={7} deletedLink="/spaces?status=deleted" />,
        },
      ],
      { initialEntries: ['/spaces/7'] },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await screen.findByRole('button', { name: 'Hide from visitors' });
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['admin', 'spaces', 'space', 7] });
    });

    await waitFor(() => {
      expect(reads).toBe(2);
      expect(queryClient.getQueryState(['admin', 'spaces', 'space', 7])?.status).toBe('error');
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Hide from visitors' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete the space' })).not.toBeInTheDocument();
    });
  });

  it('keeps the actions when a later read fails with something other than a 404', async () => {
    stubScreenWidth(1440);
    let reads = 0;
    fakeTransport((request) => {
      if (request.method === 'get' && request.url === '/admin/spaces/7') {
        reads += 1;
        return reads === 1 ? ok({ ...SPACE, isHidden: false }) : refused(500, { type: 'server' });
      }
      return ok([]);
    });
    const queryClient = createQueryClient();
    const router = createMemoryRouter(
      [
        {
          path: '/spaces/7',
          element: <SpaceEditorActions spaceId={7} deletedLink="/spaces?status=deleted" />,
        },
      ],
      { initialEntries: ['/spaces/7'] },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await screen.findByRole('button', { name: 'Hide from visitors' });
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['admin', 'spaces', 'space', 7] });
    });

    await waitFor(
      () => {
        expect(reads).toBe(4);
        expect(queryClient.getQueryState(['admin', 'spaces', 'space', 7])?.status).toBe('error');
      },
      { timeout: 10000 },
    );
    expect(screen.getByRole('button', { name: 'Hide from visitors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete the space' })).toBeInTheDocument();
  }, 15000);
});
