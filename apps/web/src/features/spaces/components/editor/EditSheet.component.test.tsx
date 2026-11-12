import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { NOW, SPACE, renderProfile, sheetOf } from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Opens «عن المساحة»'s Sheet from its «تعديل», once the profile has drawn. */
async function openAbout(user: ReturnType<typeof userEvent.setup>) {
  const edit = await screen.findByRole('button', { name: 'Edit About the space' });
  await user.click(edit);
  return { edit, sheet: sheetOf('Edit: about the space') };
}

describe('a section’s Sheet', () => {
  it('opens from «تعديل» on the section’s fields, with «حفظ» and «رجوع»', async () => {
    const user = userEvent.setup();
    renderProfile();
    const { sheet } = await openAbout(user);

    expect(within(sheet).getByRole('textbox', { name: 'Name in English' })).toHaveValue(
      'Focus Hub',
    );
    expect(within(sheet).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(within(sheet).getAllByRole('button', { name: 'Back' })).toHaveLength(2);
  });

  it('closes at once with no change, and gives the focus back to its «تعديل»', async () => {
    const user = userEvent.setup();
    renderProfile();
    const { edit, sheet } = await openAbout(user);

    await user.click(within(sheet).getAllByRole('button', { name: 'Back' })[1] as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(edit).toHaveFocus();
  });

  it('asks before a close with changes drops them, by «رجوع», Escape or the close button', async () => {
    const user = userEvent.setup();
    const { writes } = renderProfile();
    const { sheet } = await openAbout(user);
    const name = within(sheet).getByRole('textbox', { name: 'Name in English' });
    await user.type(name, ' Two');

    await user.keyboard('{Escape}');
    const ask = await screen.findByRole('alertdialog', { name: 'Discard the changes?' });
    expect(within(ask).getByRole('button', { name: 'Back' })).toHaveFocus();
    await user.click(within(ask).getByRole('button', { name: 'Back' }));

    // «رجوع» goes back to the Sheet, its change kept, the focus on «حفظ».
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
    expect(within(sheet).getByRole('button', { name: 'Save' })).toHaveFocus();
    expect(name).toHaveValue('Focus Hub Two');

    await user.click(within(sheet).getAllByRole('button', { name: 'Back' })[0] as HTMLElement);
    const again = await screen.findByRole('alertdialog', { name: 'Discard the changes?' });
    await user.click(within(again).getByRole('button', { name: 'Discard changes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(writes()).toEqual([]);
  });

  it('opens again on what the space holds, a discarded change gone', async () => {
    const user = userEvent.setup();
    renderProfile();
    const { sheet } = await openAbout(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), 'X');
    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Edit About the space' }));
    expect(
      within(sheetOf('Edit: about the space')).getByRole('textbox', {
        name: 'Name in English',
      }),
    ).toHaveValue('Focus Hub');
  });

  it('sends nothing on an unchanged «حفظ» of a saved group, says «لم يتغيّر شيء», and closes', async () => {
    const user = userEvent.setup();
    const { writes } = renderProfile();
    const { sheet } = await openAbout(user);

    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await findToast('Nothing changed')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(writes()).toEqual([]);
  });

  it('saves its part, says so naming the section, closes and shows the server’s answer', async () => {
    const user = userEvent.setup();
    const { writes } = renderProfile({
      write: () => ok({ ...SPACE, nameEn: 'Focus Hub Two' }),
    });
    const { edit, sheet } = await openAbout(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), ' Two');

    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await findToast('About the space saved — visitors see it now')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Focus Hub Two' })).toBeInTheDocument();
    expect(edit).toHaveFocus();
    expect(writes()).toHaveLength(1);
  });

  it('keeps a refusal in the Sheet, on its field, with the focus there', async () => {
    const user = userEvent.setup();
    renderProfile({
      write: () => refused(422, { type: 'validation', errors: { nameEn: ['invalid_format'] } }),
    });
    const { sheet } = await openAbout(user);
    const name = within(sheet).getByRole('textbox', { name: 'Name in English' });
    await user.type(name, '!');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(
      await within(sheet).findByText('Use Latin letters or digits in the English name'),
    ).toBeInTheDocument();
    expect(name).toHaveFocus();
    expect(screen.getByRole('dialog')).toBe(sheet);
  });

  it('turns read-only on a space verified meanwhile, the Sheet gone', async () => {
    const user = userEvent.setup();
    let verified = false;
    renderProfile({
      read: () =>
        ok({ ...SPACE, isVerified: verified, owners: verified ? [{ id: 5, name: 'Lina' }] : [] }),
      write: () => {
        verified = true;
        return refused(403, { type: 'forbidden' });
      },
    });
    const { sheet } = await openAbout(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), 'X');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Edit About the space' })).toBeNull();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the address’s ?sheet=', () => {
  it('opens that Sheet once the page has drawn, then leaves the address without it', async () => {
    const { router } = renderProfile({ entry: '/spaces/7?sheet=prices#prices' });

    expect(await screen.findByRole('dialog', { name: 'Edit the published prices' })).toBeVisible();
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.location.hash).toBe('#prices');
  });

  it('opens nothing for a section with no Sheet, or where the place may not edit', async () => {
    const photos = renderProfile({ entry: '/spaces/7?sheet=photos' });
    await screen.findByRole('heading', { level: 2, name: 'Photos' });
    await waitFor(() => {
      expect(photos.router.state.location.search).toBe('');
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    photos.unmount();

    // A verified space is the owners' to edit: the admin's page opens none of its Sheets.
    const verified = renderProfile({
      entry: '/spaces/7?sheet=prices',
      read: () => ok({ ...SPACE, isVerified: true, owners: [{ id: 5, name: 'Lina' }] }),
    });
    await screen.findByRole('heading', { level: 2, name: 'Published prices' });
    await waitFor(() => {
      expect(verified.router.state.location.search).toBe('');
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('leaving with a Sheet’s changes', () => {
  it('asks before Back leaves, naming the section; «البقاء» keeps them', async () => {
    const user = userEvent.setup();
    const { router } = renderProfile({ entry: '/elsewhere' });
    await act(() => router.navigate('/spaces/7'));
    const { sheet } = await openAbout(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), 'X');

    await act(() => router.navigate(-1));

    const ask = await screen.findByRole('alertdialog', { name: 'Leave with unsaved changes?' });
    expect(ask).toHaveTextContent(
      'Your changes to About the space aren’t saved, and will be lost.',
    );
    await user.click(within(ask).getByRole('button', { name: 'Stay' }));
    expect(router.state.location.pathname).toBe('/spaces/7');
  });

  it('lets the page go with no change in its Sheets', async () => {
    const { router } = renderProfile({ entry: '/elsewhere' });
    await act(() => router.navigate('/spaces/7'));
    await screen.findByRole('heading', { level: 2, name: 'Photos' });

    await act(() => router.navigate('/elsewhere'));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('lets a link leave once a changed Sheet’s save finds the space gone (404)', async () => {
    const user = userEvent.setup();
    let gone = false;
    const { router } = renderProfile({
      read: () => (gone ? refused(404, { type: 'not_found' }) : ok(SPACE)),
      write: () => {
        gone = true;
        return refused(404, { type: 'not_found' });
      },
    });
    const { sheet } = await openAbout(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), 'X');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();

    await act(() => router.navigate('/elsewhere'));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks nothing once a changed Sheet’s save finds the space verified (403), the focus on its section', async () => {
    const user = userEvent.setup();
    let verified = false;
    const { router } = renderProfile({
      read: () =>
        ok({ ...SPACE, isVerified: verified, owners: verified ? [{ id: 5, name: 'Lina' }] : [] }),
      write: () => {
        verified = true;
        return refused(403, { type: 'forbidden' });
      },
    });
    const { sheet } = await openAbout(user);
    await user.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), 'X');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Edit About the space' })).toBeNull();
    });

    // The section whose Sheet went with the refusal holds the focus, not the page's body.
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'About the space' })).toHaveFocus();
    });
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
    await act(() => router.navigate('/elsewhere'));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
