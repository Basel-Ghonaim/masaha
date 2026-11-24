import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { StrictMode, useState, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
} from '.';
import { stubScreenWidth } from '../../../../../test/screenWidth';
import { Button } from '../../actions/Button';
import { Input } from '../../fields/Input';

const PHONE = 390;
const WIDE = 1280;

/** A page's trigger and the dialog it opens; «Done» closes it as a finished task would. */
function SignInSample({
  busy = false,
  initiallyOpen = false,
  onOpenAutoFocus,
}: {
  busy?: boolean;
  initiallyOpen?: boolean;
  onOpenAutoFocus?: ComponentProps<typeof AdaptiveDialogContent>['onOpenAutoFocus'];
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Save to favourites
      </Button>
      <AdaptiveDialog open={open} onOpenChange={setOpen} busy={busy}>
        <AdaptiveDialogContent closeLabel="Close" onOpenAutoFocus={onOpenAutoFocus}>
          <AdaptiveDialogHeader>
            <AdaptiveDialogTitle>Sign in to save spaces</AdaptiveDialogTitle>
            <AdaptiveDialogDescription>
              The spaces you save follow you to any device.
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>
          <Input aria-label="Email" />
          <AdaptiveDialogFooter>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Done
            </Button>
          </AdaptiveDialogFooter>
        </AdaptiveDialogContent>
      </AdaptiveDialog>
    </>
  );
}

/** Opens the sample at `width` and returns its dialog and trigger. */
async function openAt(width: number, sample = <SignInSample />) {
  stubScreenWidth(width);
  const view = render(sample);
  const trigger = screen.getByRole('button', { name: 'Save to favourites' });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Sign in to save spaces' });
  return { ...view, dialog, trigger };
}

/** The router's state on the page's own entry, as a data router writes it. */
const PAGE_STATE = { usr: null, key: 'page', idx: 3 };

/** Resolves on the next move through the history, after the listeners already registered. */
function nextMove() {
  return new Promise<void>((resolve) => {
    window.addEventListener(
      'popstate',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

/** Lets a step back already asked for land, or shows that none was. */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

beforeEach(async () => {
  // A dialog the last test left open is gone back from as it unmounts: let that step land first.
  await settle();
  window.history.replaceState(PAGE_STATE, '', '/spaces/masaha-hub');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdaptiveDialog', () => {
  it('is a centred dialog from 768 px, 30 rem wide, its close button in the corner and no bar', async () => {
    const { dialog } = await openAt(WIDE);

    expect(dialog).toHaveAccessibleDescription('The spaces you save follow you to any device.');
    expect(dialog).toHaveAttribute('data-form', 'dialog');
    // The layout is the classes' (jsdom lays nothing out); the real run measures it at 1440.
    expect(dialog).toHaveClass('top-1/2', 'start-1/2', 'rounded-xl', 'sm:max-w-120');
    expect(dialog.querySelector('[data-slot="adaptive-dialog-bar"]')).toBeNull();
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(dialog.lastElementChild).toBe(close);
    expect(close).toHaveClass('absolute', 'top-3', 'end-3');
  });

  it('fills the screen below 768 px: a top bar with a 44 px close at its start, the body scrolling under it', async () => {
    const { dialog } = await openAt(PHONE);

    expect(dialog).toHaveAttribute('data-form', 'panel');
    expect(dialog).toHaveClass('inset-0', 'h-dvh', 'w-full');
    // No radius and no edge: a screen, not a card.
    expect(dialog).not.toHaveClass('rounded-xl');
    expect(dialog).not.toHaveClass('border');
    const [bar, body] = Array.from(dialog.children);
    expect(bar).toHaveAttribute('data-slot', 'adaptive-dialog-bar');
    expect(bar).toHaveClass('flex-none', 'pt-[env(safe-area-inset-top)]');
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(bar?.firstElementChild).toBe(close);
    expect(close).toHaveClass('size-11');
    expect(body).toHaveAttribute('data-slot', 'adaptive-dialog-body');
    expect(body).toHaveClass(
      'flex-1',
      'overflow-y-auto',
      'pb-[calc(--spacing(6)+env(safe-area-inset-bottom))]',
    );
    // Exactly one close button, in the bar.
    expect(within(dialog).getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });

  it('slides up on the motion tokens below 768 px, which reduced motion sets to 0', async () => {
    const { dialog } = await openAt(PHONE);

    expect(dialog).toHaveClass(
      'duration-(--duration-medium)',
      'ease-(--easing-standard)',
      'data-open:slide-in-from-bottom-6',
      'data-closed:slide-out-to-bottom-6',
    );
  });

  it('puts the focus on the title below 768 px, so the keyboard does not open at once', async () => {
    await openAt(PHONE);

    expect(screen.getByRole('heading', { name: 'Sign in to save spaces' })).toHaveFocus();
  });

  it('puts the focus on the first control from 768 px, or where the caller says', async () => {
    const { unmount } = await openAt(WIDE);
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
    unmount();

    await openAt(
      WIDE,
      <SignInSample
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          screen.getByRole('button', { name: 'Done' }).focus();
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
  });

  it('keeps the focus inside the panel, its bar included', async () => {
    await openAt(PHONE);

    // Title → Email → Done → Close (the bar's, first in the panel), then round to Email.
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it.each([
    { how: 'Escape', width: PHONE, close: () => userEvent.keyboard('{Escape}') },
    {
      how: 'its close button',
      width: PHONE,
      close: () => userEvent.click(screen.getByRole('button', { name: 'Close' })),
    },
    {
      how: 'a done action',
      width: PHONE,
      close: () => userEvent.click(screen.getByRole('button', { name: 'Done' })),
    },
    {
      how: 'a press on the scrim',
      width: WIDE,
      close: () =>
        userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never }).click(document.body),
    },
    {
      how: 'Back',
      width: PHONE,
      close: async () => {
        const moved = nextMove();
        window.history.back();
        await moved;
      },
    },
  ])('closes with $how and gives the focus back to what opened it', async ({ width, close }) => {
    const { trigger } = await openAt(width);

    await close();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('adds one history entry at the same address, which Back leaves to close it', async () => {
    const address = window.location.href;

    await openAt(PHONE);

    expect(window.location.href).toBe(address);
    // The router's own state is kept, so it reads the entry as the same place.
    expect(window.history.state).toMatchObject(PAGE_STATE);
    expect(window.history.state).not.toEqual(PAGE_STATE);

    const moved = nextMove();
    window.history.back();
    await moved;

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // One step back is the page's own entry: exactly one was added.
    expect(window.history.state).toEqual(PAGE_STATE);
    expect(window.location.href).toBe(address);
  });

  it.each([
    {
      how: 'its close button',
      close: () => userEvent.click(screen.getByRole('button', { name: 'Close' })),
    },
    { how: 'Escape', close: () => userEvent.keyboard('{Escape}') },
    {
      how: 'a done action',
      close: () => userEvent.click(screen.getByRole('button', { name: 'Done' })),
    },
  ])('closed with $how, leaves its entry, so the next Back leaves the page', async ({ close }) => {
    await openAt(PHONE);

    await close();

    await waitFor(() => {
      expect(window.history.state).toEqual(PAGE_STATE);
    });
  });

  it('does not go back from an entry a link inside it replaced', async () => {
    const { unmount } = await openAt(PHONE);
    const signIn = { usr: null, key: 'login', idx: 3 };

    // A link followed with `replace`: the router writes the next page over the dialog's entry.
    window.history.replaceState(signIn, '', '/login');
    unmount();
    await settle();

    expect(window.location.pathname).toBe('/login');
    expect(window.history.state).toEqual(signIn);
  });

  it('steps back from an entry a dialog left before a reload, so Back is never a dead press', async () => {
    window.history.pushState({ ...PAGE_STATE, masahaOverlay: 'an-earlier-load:1' }, '');
    const moved = nextMove();

    stubScreenWidth(PHONE);
    render(<SignInSample />);
    await moved;

    expect(window.history.state).toEqual(PAGE_STATE);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps one entry when React runs its effects twice (StrictMode)', async () => {
    stubScreenWidth(PHONE);

    render(
      <StrictMode>
        <SignInSample initiallyOpen />
      </StrictMode>,
    );
    await settle();

    expect(screen.getByRole('dialog', { name: 'Sign in to save spaces' })).toBeInTheDocument();
    expect(window.history.state).toMatchObject(PAGE_STATE);
    expect(window.history.state).not.toEqual(PAGE_STATE);

    // One Back closes it on the page's own entry, in one move: a second entry would take a second,
    // the step back from a stale entry.
    let moves = 0;
    const count = () => {
      moves += 1;
    };
    window.addEventListener('popstate', count);
    window.history.back();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await settle();
    window.removeEventListener('popstate', count);
    expect(window.history.state).toEqual(PAGE_STATE);
    expect(moves).toBe(1);
  });

  it('gives the focus back to the pressed trigger even when the press did not focus it (Safari)', async () => {
    stubScreenWidth(PHONE);
    render(<SignInSample />);
    const trigger = screen.getByRole('button', { name: 'Save to favourites' });
    // A tap on Safari: the press and the click, with the focus left on the page.
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    await screen.findByRole('dialog', { name: 'Sign in to save spaces' });

    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
  });

  it('holds it open while busy: Escape, the scrim and Back do nothing, and its close button is off', async () => {
    const { dialog, rerender } = await openAt(PHONE, <SignInSample />);
    rerender(<SignInSample busy />);

    await userEvent.keyboard('{Escape}');
    await userEvent
      .setup({ pointerEventsCheck: PointerEventsCheckLevel.Never })
      .click(document.body);

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeDisabled();

    // Back puts its entry back, and it stays.
    const moved = nextMove();
    window.history.back();
    await moved;
    await settle();
    expect(dialog).toBeInTheDocument();
    expect(window.history.state).not.toEqual(PAGE_STATE);

    rerender(<SignInSample />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.history.state).toEqual(PAGE_STATE);
    });
  });

  it.each([PHONE, WIDE])('has no accessibility violations at %i px', async (width) => {
    await openAt(width);

    // Portalled to <body>, so the whole body is checked; landmarks are a page's, not a component's.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
