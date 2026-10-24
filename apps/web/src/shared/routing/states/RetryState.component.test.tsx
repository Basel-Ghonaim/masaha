import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { RetryState } from './RetryState';

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RetryState', () => {
  it('offers the caller’s way on beside «إعادة المحاولة»; a retry while still offline says so and does not reload', async () => {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(false);
    const retry = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <RetryState kind="offline" onRetry={retry}>
        <a href="/">الرئيسية</a>
      </RetryState>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('لا يوجد اتصال بالإنترنت');
    expect(container.querySelector('svg')).toHaveClass('lucide-wifi-off');
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['إعادة المحاولة']);
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(retry).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('ما زال الاتصال مفقودًا.');
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeEnabled();
  });

  it('retries once the connection is back, and shows that it is trying', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<RetryState kind="offline" onRetry={retry} />);

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('says the problem is on our side for the general error, with its own icon', () => {
    const { container } = render(<RetryState kind="error" onRetry={vi.fn()} />);

    expect(screen.getByText('المشكلة عندنا، لا عندك. حاول مرة أخرى بعد قليل.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveClass('lucide-triangle-alert');
  });
});
