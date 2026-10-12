import { screen, waitFor, type Matcher } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * The toast whose text matches `text`, once it shows. The toast library adds a toast unseen, at
 * opacity 0, and shows it on a later render, so its text can be found before it is visible: a check
 * made at once then fails on a busy machine (finding 42). This waits until it is visible.
 */
export function findToast(text: Matcher): Promise<HTMLElement> {
  return waitFor(() => {
    const element = screen.getByText(text);
    expect(element).toBeVisible();
    return element;
  });
}
