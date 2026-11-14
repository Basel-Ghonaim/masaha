import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { bodyOf, ok, restoreTransport } from '../../../../test/fakeTransport';
import {
  CATALOGUE,
  NEW_SPACE,
  NOW,
  SPACE,
  renderProfile,
  sectionOf,
  sheetOf,
} from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

// A Sheet's lists draw every option each time one opens (the time lists hold 48 half hours), which
// jsdom is slow at: a test that chooses several times outlasts 5 s on a busy machine, so this file
// allows each test longer.
vi.setConfig({ testTimeout: 15_000 });

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

type User = ReturnType<typeof userEvent.setup>;

async function choose(user: User, scope: HTMLElement, name: string, option: string) {
  await user.click(within(scope).getByRole('combobox', { name }));
  await user.click(await screen.findByRole('option', { name: option }));
}

const rows = (sheet: HTMLElement) => within(sheet).getAllByRole('listitem');

async function openContacts(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Edit Contacts' }));
  return sheetOf('Edit the contacts');
}

describe('the contacts’ tiles', () => {
  it('link each contact as a visitor follows it, «وسيلة أخرى» by its own name', async () => {
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });

    const tiles = within(sectionOf('Contacts')).getAllByRole('link');
    expect(tiles.map((tile) => tile.getAttribute('href'))).toEqual([
      'https://wa.me/970599123456',
      'https://discord.gg/focushub',
    ]);
    expect(tiles[0]).toHaveTextContent('WhatsApp');
    expect(tiles[0]).toHaveTextContent('+970599123456');
    expect(tiles[1]).toHaveTextContent('ديسكورد');
    expect(tiles[1]).toHaveTextContent('discord.gg/focushub');
    expect(tiles[1]).toHaveAttribute('target', '_blank');
  });

  it('turns a tile’s caption to the foreground under its link’s hover, a verified pair on the wash (R1-F1 of #144)', async () => {
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Contacts' });

    const [tile] = within(sectionOf('Contacts')).getAllByRole('link');
    expect(tile).toHaveClass('group', 'hover:bg-hover-on-muted');
    expect(within(tile as HTMLElement).getByText('+970599123456')).toHaveClass(
      'text-muted-foreground',
      'group-hover:text-foreground',
    );
  });
});

describe('the contacts’ Sheet', () => {
  it('opens an empty section on one WhatsApp row, which is no change', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ read: () => ok(NEW_SPACE) });
    await user.click(await screen.findByRole('button', { name: 'Add a contact' }));

    const sheet = sheetOf('Edit the contacts');
    expect(rows(sheet)).toHaveLength(1);
    expect(within(sheet).getByRole('combobox', { name: 'Type' })).toHaveTextContent('WhatsApp');
    expect(within(sheet).getByRole('textbox', { name: 'WhatsApp' })).toHaveAttribute(
      'placeholder',
      '0599123456',
    );
  });

  it('offers the twelve types, a new row starting as WhatsApp', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openContacts(user);

    await user.click(within(sheet).getByRole('button', { name: 'Add a contact' }));
    const added = rows(sheet).at(-1) as HTMLElement;
    expect(within(added).getByRole('combobox', { name: 'Type' })).toHaveTextContent('WhatsApp');
    await user.click(within(added).getByRole('combobox', { name: 'Type' }));
    expect(await screen.findAllByRole('option')).toHaveLength(12);
  });

  it('asks «وسيلة أخرى» for its name, refused on its row without one, and sends it with it', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await openContacts(user);
    await user.click(within(sheet).getByRole('button', { name: 'Add a contact' }));
    const added = rows(sheet).at(-1) as HTMLElement;

    await choose(user, added, 'Type', 'Other');
    await user.type(within(added).getByRole('textbox', { name: 'Link or number' }), 'signal.me/x');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(added).findByText('Enter the contact’s name')).toBeInTheDocument();
    expect(writes()).toEqual([]);

    await user.type(within(added).getByRole('textbox', { name: 'Name' }), 'سيجنال');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      contacts: [
        ...SPACE.contacts,
        { type: 'OTHER', value: 'https://signal.me/x', label: 'سيجنال' },
      ],
    });
  });

  it('drops a row’s name once it leaves «وسيلة أخرى» (F5 of #140’s review)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await openContacts(user);
    const discord = rows(sheet)[1] as HTMLElement;

    await choose(user, discord, 'Type', 'Website');
    expect(within(discord).queryByRole('textbox', { name: 'Name' })).toBeNull();
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      contacts: [
        SPACE.contacts[0],
        { type: 'WEBSITE', value: 'https://discord.gg/focushub', label: null },
      ],
    });
  });

  it('refuses a value in its type’s words, and a repeat as added before', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await openContacts(user);
    await user.click(within(sheet).getByRole('button', { name: 'Add a contact' }));
    await user.click(within(sheet).getByRole('button', { name: 'Add a contact' }));
    const [, , bad, repeat] = rows(sheet) as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];

    await user.type(within(bad).getByRole('textbox', { name: 'WhatsApp' }), '12');
    await user.type(within(repeat).getByRole('textbox', { name: 'WhatsApp' }), '0599123456');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await within(bad).findByText('Not a valid WhatsApp number')).toBeInTheDocument();
    await user.click(within(bad).getByRole('button', { name: 'Remove WhatsApp' }));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(
      await within(rows(sheet)[2] as HTMLElement).findByText('This contact is already added'),
    ).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('shows the form a value is saved in once it differs from what was typed', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openContacts(user);
    await user.click(within(sheet).getByRole('button', { name: 'Add a contact' }));
    const added = rows(sheet).at(-1) as HTMLElement;

    await choose(user, added, 'Type', 'Telegram');
    await user.type(within(added).getByRole('textbox', { name: 'Telegram' }), '@masaha_ps');

    expect(within(added).getByRole('textbox', { name: 'Telegram' })).toHaveAccessibleDescription(
      /Saved as .*https:\/\/t\.me\/masaha_ps/,
    );
  });

  it('moves a contact by its handle from the keyboard, the order sent on «حفظ»', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await openContacts(user);

    within(sheet).getByRole('button', { name: 'Reorder ديسكورد' }).focus();
    await user.keyboard(' ');
    expect(screen.getByText('ديسكورد lifted, position 2 of 2.')).toBeInTheDocument();
    await user.keyboard('{ArrowUp}');
    await user.keyboard(' ');
    // Escape inside the Sheet would close it; the lift keeps it open.
    expect(screen.getByRole('dialog', { name: 'Edit the contacts' })).toBeVisible();
    expect(writes()).toEqual([]);

    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ contacts: [SPACE.contacts[1], SPACE.contacts[0]] });
  });

  it('keeps the Sheet open when Escape puts a lifted contact back', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openContacts(user);

    within(sheet).getByRole('button', { name: 'Reorder ديسكورد' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: 'Edit the contacts' })).toBeVisible();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(within(sheet).getByRole('button', { name: 'Reorder ديسكورد' })).toHaveFocus();
  });

  it('has no detectable accessibility violations open', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    await openContacts(user);

    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('the amenities’ Sheet', () => {
  async function openAmenities(user: User) {
    await user.click(await screen.findByRole('button', { name: 'Edit Amenities' }));
    return sheetOf('Edit the amenities');
  }

  it('lists only what the space offers, the platform’s then its own', async () => {
    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Amenities' });

    const offered = within(sectionOf('Amenities')).getAllByRole('listitem');
    expect(offered.map((item) => item.textContent)).toEqual(['Internet', 'Library']);
    expect(within(sectionOf('Amenities')).queryByText('Generator')).toBeNull();
  });

  it('refuses an own amenity the list already names, in the browser, sending nothing (A2)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await openAmenities(user);

    await user.click(within(sheet).getByRole('button', { name: 'Add another amenity' }));
    const names = within(sheet).getAllByRole('textbox', { name: 'Name in Arabic' });
    await user.type(names.at(-1) as HTMLElement, 'مولّد');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(
      await within(sheet).findByText('This amenity is in the list: tick it above'),
    ).toBeInTheDocument();
    expect(names.at(-1)).toHaveFocus();
    expect(writes()).toEqual([]);
  });

  it('checks an own amenity only against what the checklist offers: a retired one only while held', async () => {
    const user = userEvent.setup({ delay: null });
    const retired = {
      entries: CATALOGUE.map((entry) => (entry.id === 2 ? { ...entry, isActive: false } : entry)),
      failed: false,
      retry: () => undefined,
    };
    const addGenerator = async () => {
      const sheet = await openAmenities(user);
      await user.click(within(sheet).getByRole('button', { name: 'Add another amenity' }));
      const names = within(sheet).getAllByRole('textbox', { name: 'Name in Arabic' });
      await user.type(names.at(-1) as HTMLElement, 'مولّد');
      await user.click(within(sheet).getByRole('button', { name: 'Save' }));
      return sheet;
    };

    // Retired, and not the space's: nothing above offers it, so the row is the space's own.
    const free = renderProfile({ catalogue: retired, write: () => ok(SPACE) });
    await addGenerator();
    await waitFor(() => {
      expect(free.writes()).toHaveLength(1);
    });
    expect(bodyOf(free.writes()[0])).toMatchObject({
      ownAmenities: [
        { nameAr: 'مكتبة', nameEn: 'Library' },
        { nameAr: 'مولّد', nameEn: null },
      ],
    });
    free.unmount();

    // Retired, and still the space's: the checklist lists it, so the row is refused.
    const held = renderProfile({
      catalogue: retired,
      read: () => ok({ ...SPACE, amenityIds: [1, 2] }),
    });
    const sheet = await addGenerator();
    expect(
      await within(sheet).findByText('This amenity is in the list: tick it above'),
    ).toBeInTheDocument();
    expect(held.writes()).toEqual([]);
  });

  it('says once the platform’s list has failed, with «إعادة المحاولة», which reads it again', async () => {
    const user = userEvent.setup({ delay: null });
    const retry = vi.fn();
    renderProfile({ catalogue: { entries: undefined, failed: true, retry } });
    await screen.findByRole('heading', { level: 2, name: 'Amenities' });

    const amenities = sectionOf('Amenities');
    expect(within(amenities).getByText('We couldn’t load the amenities list')).toBeInTheDocument();
    await user.click(within(amenities).getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('sends the ticked and the own amenities as one group', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await openAmenities(user);

    await user.click(within(sheet).getByRole('checkbox', { name: 'Generator' }));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      amenityIds: [1, 2],
      ownAmenities: [{ nameAr: 'مكتبة', nameEn: 'Library' }],
    });
  });

  it('leads the admin to the platform’s list, asking first when the Sheet has changes', async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderProfile();
    const sheet = await openAmenities(user);
    await user.click(within(sheet).getByRole('checkbox', { name: 'Generator' }));

    await user.click(within(sheet).getByRole('link', { name: 'Manage the amenities list' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/lookups');
    });
  });

  it('offers the owner no way to the platform’s list', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ owner: true });
    const sheet = await openAmenities(user);

    expect(within(sheet).queryByRole('link', { name: 'Manage the amenities list' })).toBeNull();
  });
});
