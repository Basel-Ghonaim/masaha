import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Toaster, toast } from '.';
import { DirectionProvider } from '../../../lib/DirectionProvider';

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

function toasterList() {
  return screen.getByRole('region', { name: 'Notifications' }).querySelector('ol');
}

describe('Toaster', () => {
  it('announces a toast in a region named by its label', async () => {
    render(<Toaster label="Notifications" />);

    act(() => {
      toast.success('Member checked in');
    });

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(await screen.findByText('Member checked in')).toBeInTheDocument();
  });

  it('sits at the logical end, which is the left in RTL', async () => {
    render(
      <DirectionProvider dir="rtl">
        <Toaster label="Notifications" />
      </DirectionProvider>,
    );

    act(() => {
      toast('Announcement published');
    });
    await screen.findByText('Announcement published');

    expect(toasterList()).toHaveAttribute('data-x-position', 'left');
    expect(toasterList()).toHaveAttribute('data-y-position', 'bottom');
    expect(toasterList()).toHaveAttribute('dir', 'rtl');
  });

  it('sits at the logical start, which is the left in LTR', async () => {
    render(
      <DirectionProvider dir="ltr">
        <Toaster label="Notifications" position="top-start" />
      </DirectionProvider>,
    );

    act(() => {
      toast('Announcement published');
    });
    await screen.findByText('Announcement published');

    expect(toasterList()).toHaveAttribute('data-x-position', 'left');
    expect(toasterList()).toHaveAttribute('data-y-position', 'top');
  });

  it('has a close button only when given its label', async () => {
    const { rerender } = render(<Toaster label="Notifications" />);
    act(() => {
      toast('Settings saved');
    });
    await screen.findByText('Settings saved');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<Toaster label="Notifications" closeLabel="Close notification" />);

    expect(await screen.findByRole('button', { name: 'Close notification' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Toaster label="Notifications" closeLabel="Close notification" />);
    act(() => {
      toast.error('The member could not be checked in', {
        description: 'Check your connection and try again.',
      });
    });
    await screen.findByText('The member could not be checked in');

    expect(await axe(container)).toHaveNoViolations();
  });
});
