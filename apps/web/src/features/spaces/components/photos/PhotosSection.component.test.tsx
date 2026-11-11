import type { SpacePhoto } from '@masaha/shared/spaces';
import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeCanvas, fakeFile } from '../../../../test/fakeCanvas';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { deferred } from '../../../../test/fakeSession';
import { bodyOf, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { NOW, PHOTOS, SPACE, renderProfile, sectionOf } from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

/** `count` photos, ids 1 to `count`. */
const photos = (count: number): SpacePhoto[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    urls: {
      card: `/files/${String(index + 1)}-card.webp`,
      page: `/files/${String(index + 1)}.webp`,
    },
  }));

/** Hands the picker files as the browser's own file chooser would. */
function chooseFiles(input: HTMLElement, ...files: File[]) {
  const list = Object.create(FileList.prototype) as FileList;
  Object.defineProperties(list, {
    length: { value: files.length },
    item: { value: (index: number) => files[index] ?? null },
    [Symbol.iterator]: {
      value: function* iterate() {
        yield* files;
      },
    },
  });
  Object.defineProperty(input, 'files', { configurable: true, value: list });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  fakeIntersectionObserver();
  fakeCanvas({ width: 4000, height: 3000 });
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function manage(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Manage photos' }));
  return sectionOf('Photos');
}

describe('the photos, read first', () => {
  it('shows the cover beside a 2×2 grid from 768 px, «+N» past five, the cover marked', async () => {
    stubScreenWidth(1440);
    renderProfile({ photos: () => ok(photos(7)) });
    await screen.findByRole('img', { name: 'Photo 1' });

    const section = sectionOf('Photos');
    expect(within(section).getByText('7 of 10 photos')).toBeInTheDocument();
    expect(within(section).getByText('Cover')).toBeInTheDocument();
    const grid = within(section).getByRole('list', { name: 'The other photos' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(4);
    expect(within(grid).getByRole('img', { name: 'and 2 more' })).toBeInTheDocument();
  });

  it('shows the cover with its count on a phone, then one row of the others (M1)', async () => {
    stubScreenWidth(390);
    renderProfile();
    await screen.findByRole('img', { name: 'Photo 1' });

    const section = sectionOf('Photos');
    expect(within(section).getByText('3 photos')).toBeInTheDocument();
    const strip = within(section).getByRole('list', { name: 'The other photos' });
    expect(
      within(strip)
        .getAllByRole('img')
        .map((image) => image.getAttribute('src')),
    ).toEqual(['/files/4-card.webp', '/files/5-card.webp']);
    expect(within(section).queryByText(/^\+\d/)).toBeNull();
  });
});

describe('the photos’ edit state', () => {
  it('turns the section itself into its edit state, and «تم» turns it back (P2)', async () => {
    const user = userEvent.setup();
    renderProfile();
    const section = await manage(user);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(section).getByRole('button', { name: 'Choose photos' })).toBeInTheDocument();
    expect(
      within(section).getByText('Up to 10 photos · JPEG, PNG or WebP · up to 4 MB each'),
    ).toBeInTheDocument();
    await user.click(within(section).getByRole('button', { name: 'Done' }));
    expect(within(section).queryByRole('button', { name: 'Choose photos' })).toBeNull();
  });

  it('replaces «اختر صورًا» with the limit’s line at ten photos, never a disabled button (P3)', async () => {
    const user = userEvent.setup();
    renderProfile({ photos: () => ok(photos(10)) });
    const section = await manage(user);

    expect(within(section).queryByRole('button', { name: 'Choose photos' })).toBeNull();
    expect(
      within(section).getByText('You’ve reached the limit (10 photos). Delete one to add another.'),
    ).toBeInTheDocument();
  });

  it('asks before deleting a photo, «رجوع» sending nothing and «حذف» deleting it (P5)', async () => {
    const user = userEvent.setup();
    const { writes } = renderProfile({ write: () => ({ status: 204 }) });
    const section = await manage(user);

    const remove = within(section).getByRole('button', { name: 'Delete Photo 2' });
    await user.click(remove);
    const ask = await screen.findByRole('alertdialog', { name: 'Delete this photo?' });
    expect(within(ask).getByRole('button', { name: 'Back' })).toHaveFocus();
    await user.click(within(ask).getByRole('button', { name: 'Back' }));
    expect(writes()).toEqual([]);
    expect(remove).toHaveFocus();

    await user.click(remove);
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => {
      expect(writes().map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
        'delete /admin/spaces/7/photos/4',
      ]);
    });
    expect(await findToast('Photo 2 deleted')).toBeInTheDocument();
  });

  it('says on the cover’s dialog that the next photo becomes the cover', async () => {
    const user = userEvent.setup();
    renderProfile();
    const section = await manage(user);

    await user.click(within(section).getByRole('button', { name: 'Delete Photo 1' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'The next photo becomes the cover.',
    );
  });

  it('gives each chosen file its own tile and bar while it travels, keeping the others', async () => {
    const answering = deferred<FakeAnswer>();
    const user = userEvent.setup();
    renderProfile({ write: () => answering.promise });
    await manage(user);

    await act(async () => {
      chooseFiles(screen.getByLabelText('Choose photos'), fakeFile('portrait.jpg', 'image/jpeg'));
      await Promise.resolve();
    });

    expect(await screen.findByText('portrait.jpg')).toBeInTheDocument();
    const bar = await screen.findByRole('progressbar', {
      name: `Uploading photo ${String(PHOTOS.length + 1)}`,
    });
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('offers no edit at all on a verified space, on the admin’s page', async () => {
    renderProfile({ read: () => ok({ ...SPACE, isVerified: true }) });
    await screen.findByRole('img', { name: 'Photo 1' });

    expect(within(sectionOf('Photos')).queryByRole('button')).toBeNull();
  });

  it('has no detectable accessibility violations in its edit state, in English and in Arabic', async () => {
    const user = userEvent.setup();
    const english = renderProfile();
    await manage(user);
    expect(await axe(english.container)).toHaveNoViolations();
    english.unmount();

    startPreferences('ar');
    const arabic = renderProfile();
    await user.click(await screen.findByRole('button', { name: 'إدارة الصور' }));
    await screen.findByRole('button', { name: 'اختر صورًا' });

    expect(await axe(arabic.container)).toHaveNoViolations();
  });
});

describe('ordering the photos (P4)', () => {
  it('lifts, moves and drops a photo from the keyboard, each step said, then sends the whole order once', async () => {
    const user = userEvent.setup();
    const sent = deferred<FakeAnswer>();
    const { writes } = renderProfile({ write: () => sent.promise });
    const section = await manage(user);
    const list = within(section).getByRole('list', { name: 'The photos, in order' });

    const second = within(list).getByRole('button', { name: 'Photo 2' });
    second.focus();
    await user.keyboard(' ');
    expect(screen.getByText('Photo 2 lifted, position 2 of 3.')).toBeInTheDocument();
    // In English the grid reads left to right: the right arrow moves the photo on.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Photo 2: position 3 of 3')).toBeInTheDocument();
    await user.keyboard(' ');

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(writes()[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/photos/order' });
    expect(bodyOf(writes()[0])).toEqual({ ids: [3, 5, 4] });
    // The order dropped stays on screen while it is sent (SD2).
    expect(
      within(list)
        .getAllByRole('img')
        .map((image) => image.getAttribute('src')),
    ).toEqual(['/files/3-card.webp', '/files/5-card.webp', '/files/4-card.webp']);
    // A second move waits until the gallery is read again.
    within(list).getAllByRole('button', { name: /Photo/ })[0]?.focus();
    await user.keyboard(' ');
    expect(screen.getByText('Photo 1 can move once the last order is saved.')).toBeInTheDocument();
    expect(writes()).toHaveLength(1);
  });

  it('follows the reading direction in Arabic: the left arrow moves a photo on', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    const { writes } = renderProfile({ write: () => ({ status: 204 }) });
    await user.click(await screen.findByRole('button', { name: 'إدارة الصور' }));
    const list = screen.getByRole('list', { name: 'الصور بترتيبها' });

    within(list).getByRole('button', { name: 'الصورة 1، الغلاف' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowLeft}');
    await user.keyboard(' ');

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ ids: [4, 3, 5] });
  });

  it('puts a photo back on Escape and sends nothing', async () => {
    const user = userEvent.setup();
    const { writes } = renderProfile();
    const section = await manage(user);
    const list = within(section).getByRole('list', { name: 'The photos, in order' });

    within(list).getByRole('button', { name: 'Photo 2' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Escape}');

    expect(
      screen.getByText('Move cancelled. Photo 2 is back at position 2 of 3.'),
    ).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('puts the server’s order back when a move is refused, its reason on the photo', async () => {
    const user = userEvent.setup();
    renderProfile({ write: () => refused(500, { type: 'server' }) });
    const section = await manage(user);
    const list = within(section).getByRole('list', { name: 'The photos, in order' });

    within(list).getByRole('button', { name: 'Photo 2' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}');
    await user.keyboard(' ');

    expect(
      await within(section).findByText('We couldn’t change the photos’ order'),
    ).toBeInTheDocument();
    expect(
      within(list)
        .getAllByRole('img')
        .map((image) => image.getAttribute('src')),
    ).toEqual(['/files/3-card.webp', '/files/4-card.webp', '/files/5-card.webp']);
  });
});
