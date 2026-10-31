import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DirectorySearch } from './DirectorySearch';

// The shared bound, moved off its value, so the field is seen to read it rather than a literal.
vi.mock('@masaha/shared/spaces', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@masaha/shared/spaces')>()),
  SPACE_NAME_MAX_LENGTH: 61,
}));

describe('DirectorySearch', () => {
  it('bounds the search by the shared constant of a space’s name', () => {
    render(
      <DirectorySearch
        search={{ label: 'Search', placeholder: '', text: '', change: vi.fn(), error: null }}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveAttribute('maxLength', '61');
  });
});
