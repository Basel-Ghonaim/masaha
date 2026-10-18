import type { SpacePhoto } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { fakeCanvas, fakeFile } from '../../../../test/fakeCanvas';
import { deferred } from '../../../../test/fakeSession';
import { startPreferences } from '../../../../test/startPreferences';
import { PhotosSection } from './PhotosSection';
import { ReadOnlyPhotos } from './ReadOnlyPhotos';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PHOTOS: SpacePhoto[] = [
  { id: 3, urls: { card: '/files/3-card.webp', page: '/files/3-page.webp' } },
  { id: 4, urls: { card: '/files/4-card.webp', page: '/files/4-page.webp' } },
  { id: 5, urls: { card: '/files/5-card.webp', page: '/files/5-page.webp' } },
];

const photo = (id: number) => ({ id, urls: { card: `/files/${String(id)}-card.webp`, page: '' } });

/** The gallery of space 7 as the section draws it; the server answers each request with `answer`. */
function renderSection(
  photos: SpacePhoto[] = PHOTOS,
  answer: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ({ status: 204 }),
  draw: 'editable' | 'verified' = 'editable',
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok(photos) : answer(request),
  );
  const rendered = render(
    <QueryClientProvider client={createQueryClient()}>
      {draw === 'editable' ? (
        <PhotosSection spaceId={7} onUploadingChange={vi.fn()} />
      ) : (
        <ReadOnlyPhotos spaceId={7} />
      )}
      <Toaster label="Notifications" closeLabel="Close notification" />
    </QueryClientProvider>,
  );
  return { ...rendered, requests };
}

/** The section's tiles, each one a list item. */
const tiles = async () =>
  within(await screen.findByRole('list', { name: 'Photos' })).getAllByRole('listitem');

/** Hands the picker files as the browser's own file chooser would. */
function chooseFiles(input: HTMLElement, ...files: File[]) {
  const list = Object.create(FileList.prototype) as FileList;
  Object.defineProperties(list, {
    length: { value: files.length },
    item: {
      value: (index: number) => files[index] ?? null,
    },
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
  startPreferences('en');
  fakeCanvas({ width: 4000, height: 3000 });
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the editor’s photos section', () => {
  it('shows the photos in order with the cover and each tile’s actions', async () => {
    renderSection();

    expect(await screen.findByRole('heading', { level: 2, name: 'Photos' })).toBeInTheDocument();
    expect(screen.getByText(/Up to 10 photos/)).toBeInTheDocument();
    const shown = await tiles();
    expect(shown.map((tile) => tile.querySelector('img')?.getAttribute('src'))).toEqual([
      '/files/3-card.webp',
      '/files/4-card.webp',
      '/files/5-card.webp',
    ]);
    // The cover is the first, marked; no tile offers to make the cover itself.
    expect(within(shown[0] as HTMLElement).getByText('Cover')).toBeInTheDocument();
    expect(
      within(shown[0] as HTMLElement).queryByRole('button', { name: 'Make Photo 1 the cover' }),
    ).toBeNull();
    expect(
      within(shown[1] as HTMLElement).getByRole('button', { name: 'Make Photo 2 the cover' }),
    ).toBeInTheDocument();
    // Each arrow names the photo it moves, and waits at the gallery's edges without leaving the focus order.
    for (const [tile, name] of [
      [shown[0], 'Before: Photo 1'],
      [shown[2], 'After: Photo 3'],
    ] as const) {
      const arrow = within(tile as HTMLElement).getByRole('button', { name });
      expect(arrow).toHaveAttribute('aria-disabled', 'true');
      expect(arrow).not.toBeDisabled();
    }
    expect(
      within(shown[1] as HTMLElement).getByRole('button', { name: 'Remove Photo 2' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state while the space has no photos', async () => {
    renderSection([]);

    expect(await screen.findByRole('heading', { name: 'No photos yet' })).toBeInTheDocument();
    expect(screen.getByText('The first photo becomes the cover.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Photos' })).toBeNull();
  });

  it('names each move and cover in a live region', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(
      within((await tiles())[2] as HTMLElement).getByRole('button', { name: 'Before: Photo 3' }),
    );

    expect(await screen.findByText('Photo 3 is now at position 2 of 3')).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('asks before it removes a photo, and its dialog names it', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(
      within((await tiles())[1] as HTMLElement).getByRole('button', { name: 'Remove Photo 2' }),
    );

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Photo 2?' });
    expect(dialog).toHaveTextContent(
      'It leaves the space’s page at once and cannot be brought back.',
    );
    expect(within(dialog).getByRole('button', { name: 'Back' })).toHaveFocus();
  });

  it('shows the empty state, and the limit beside a disabled add at ten', async () => {
    renderSection([]);

    expect(await screen.findByRole('heading', { name: 'No photos yet' })).toBeInTheDocument();
    expect(screen.getByText('The first photo becomes the cover.')).toBeInTheDocument();
  });

  it('shows why nothing more may be added at ten, beside the disabled button', async () => {
    renderSection(Array.from({ length: 10 }, (_, index) => photo(index + 1)));
    await screen.findByText('Cover');

    expect(screen.getByRole('button', { name: 'Add photos' })).toBeDisabled();
    expect(screen.getByText('Up to 10 photos — remove one to add another')).toBeInTheDocument();
  });

  it('shows a chosen file on its own tile while it travels, named by the layer’s spinner', async () => {
    const answering = deferred<FakeAnswer>();
    const browser = fakeCanvas({ width: 2000, height: 1500 });
    renderSection(PHOTOS, () => answering.promise);

    await act(async () => {
      chooseFiles(screen.getByLabelText('Add photos'), fakeFile('portrait.jpg', 'image/jpeg'));
      await Promise.resolve();
    });

    // The browser turned the photo by its EXIF and re-encoded it before anything was sent.
    expect(browser.decodeOptions()).toMatchObject({ imageOrientation: 'from-image' });
    expect(await screen.findByText('portrait.jpg')).toBeInTheDocument();
    // The pending state is the layer's own spinner, named for a screen reader; no bar is drawn.
    expect(screen.getByRole('status', { name: /Uploading \d+%/ })).toBeInTheDocument();
  });

  it('keeps the removal dialog open and says why when the server fails', async () => {
    const user = userEvent.setup();
    renderSection(PHOTOS, (request) =>
      request.method === 'delete' ? refused(500, { type: 'server' }) : { status: 204 },
    );

    await user.click(
      within((await tiles())[1] as HTMLElement).getByRole('button', { name: 'Remove Photo 2' }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Photo 2?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByText(/went wrong on our side/)).toBeVisible();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('titles a refused removal in its dialog by the removal', async () => {
    const user = userEvent.setup();
    renderSection(PHOTOS, (request) =>
      request.method === 'delete' ? refused(500, { type: 'server' }) : { status: 204 },
    );

    await user.click(
      within((await tiles())[1] as HTMLElement).getByRole('button', { name: 'Remove Photo 2' }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Photo 2?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByText('We couldn’t delete the photo')).toBeVisible();
    expect(screen.queryByText('We couldn’t load the photos')).toBeNull();
  });

  it('removes the photo, fetches the gallery again and says so once the server has answered', async () => {
    const user = userEvent.setup();
    const { requests } = renderSection();

    await user.click(
      within((await tiles())[1] as HTMLElement).getByRole('button', { name: 'Remove Photo 2' }),
    );
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Photo 2 deleted')).toBeVisible();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => {
      expect(requests.filter(({ method }) => method === 'get')).toHaveLength(2);
    });
  });

  it('takes a second move only after the first is answered and the gallery fetched again', async () => {
    const user = userEvent.setup();
    const answering = deferred<FakeAnswer>();
    const { requests } = renderSection(PHOTOS, () => answering.promise);
    const before = within((await tiles())[2] as HTMLElement).getByRole('button', {
      name: 'Before: Photo 3',
    });

    await user.click(before);
    await user.click(before);
    await act(async () => {
      answering.resolve({ status: 204 });
      await answering.promise;
    });

    await waitFor(() => {
      expect(requests.filter(({ method }) => method === 'get')).toHaveLength(2);
    });
    const orders = requests.filter(({ method }) => method === 'put');
    expect(orders.map(({ data }) => JSON.parse(String(data)) as unknown)).toEqual([
      { ids: [3, 5, 4] },
    ]);
  });

  it('names each photo on its own cover button', async () => {
    renderSection();

    expect(await screen.findByRole('button', { name: 'Make Photo 2 the cover' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Make Photo 3 the cover' })).toBeVisible();
  });

  it('shows a refused order in view, saying the gallery was refreshed', async () => {
    const user = userEvent.setup();
    renderSection(PHOTOS, (request) =>
      request.method === 'put' ? refused(409, { type: 'conflict' }) : { status: 204 },
    );

    await user.click(
      within((await tiles())[2] as HTMLElement).getByRole('button', { name: 'Before: Photo 3' }),
    );

    const notice = await screen.findByText(/photos changed since this page was opened/);
    expect(notice).not.toHaveClass('sr-only');
    expect(notice).toHaveTextContent('refreshed');
    expect(notice).not.toHaveTextContent('Reload');
  });

  it('titles a refused move by the move, not by a failed load', async () => {
    const user = userEvent.setup();
    renderSection(PHOTOS, (request) =>
      request.method === 'put' ? refused(500, { type: 'server' }) : { status: 204 },
    );

    await user.click(
      within((await tiles())[2] as HTMLElement).getByRole('button', { name: 'Before: Photo 3' }),
    );

    expect(await screen.findByText('We couldn’t change the photos’ order')).toBeVisible();
    expect(screen.queryByText('We couldn’t load the photos')).toBeNull();
  });

  it('keeps «Add photos» available while a photo uploads', async () => {
    const answering = deferred<FakeAnswer>();
    renderSection(PHOTOS, () => answering.promise);

    await act(async () => {
      chooseFiles(screen.getByLabelText('Add photos'), fakeFile('portrait.jpg', 'image/jpeg'));
      await Promise.resolve();
    });
    await screen.findByText('portrait.jpg');

    expect(screen.getByRole('button', { name: 'Add photos' })).toBeEnabled();
  });

  it('says the space is full when an upload is refused as a conflict, and fetches the gallery again', async () => {
    const { requests } = renderSection(PHOTOS, () => refused(409, { type: 'conflict' }));

    await act(async () => {
      chooseFiles(screen.getByLabelText('Add photos'), fakeFile('portrait.jpg', 'image/jpeg'));
      await Promise.resolve();
    });

    expect(
      await screen.findByText('The space already has 10 photos. Remove one to add another.'),
    ).toBeVisible();
    await waitFor(() => {
      expect(requests.filter(({ method }) => method === 'get')).toHaveLength(2);
    });
  });

  it('says the upload failed, not that the photos could not load, when nothing came back from it', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {
      throw new Error('The encoder broke.');
    });
    renderSection();

    await act(async () => {
      chooseFiles(screen.getByLabelText('Add photos'), fakeFile('portrait.jpg', 'image/jpeg'));
      await Promise.resolve();
    });

    expect(await screen.findByText('We couldn’t upload this photo')).toBeVisible();
    expect(screen.queryByText('We couldn’t load the photos')).toBeNull();
  });

  it('announces what really went up when part of a choice did not fit', async () => {
    const nine = Array.from({ length: 9 }, (_, index) => photo(index + 1));
    renderSection(nine, () => refused(500, { type: 'server' }));
    await screen.findByText('Cover');

    await act(async () => {
      chooseFiles(
        screen.getByLabelText('Add photos'),
        fakeFile('a.jpg', 'image/jpeg'),
        fakeFile('b.jpg', 'image/jpeg'),
      );
      await Promise.resolve();
    });

    // The one that fitted failed, so nothing went up: the line says 0, in a live region.
    const summary = await screen.findByText('Uploaded 0 of 2; the limit is 10 photos');
    expect(summary.closest('[role="status"]')).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderSection();

    await screen.findByText('Cover');

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('a verified space’s photos', () => {
  it('shows its photos with no control to change them', async () => {
    renderSection([photo(3), photo(4)], () => ({ status: 204 }), 'verified');

    const shown = await tiles();
    expect(shown).toHaveLength(2);
    expect(within(shown[0] as HTMLElement).getByText('Cover')).toBeInTheDocument();
    for (const tile of shown) {
      expect(within(tile).queryByRole('button')).toBeNull();
    }
    expect(screen.queryByText(/Up to 10 photos/)).toBeNull();
  });

  it('names each photo, so a screen reader hears more than an empty list', async () => {
    renderSection([photo(3), photo(4)], () => ({ status: 204 }), 'verified');

    await tiles();

    expect(screen.getByRole('img', { name: 'Photo 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo 2' })).toBeInTheDocument();
  });

  it('shows the empty state when it has none', async () => {
    renderSection([], () => ({ status: 204 }), 'verified');

    expect(await screen.findByRole('heading', { name: 'No photos yet' })).toBeInTheDocument();
  });
});
