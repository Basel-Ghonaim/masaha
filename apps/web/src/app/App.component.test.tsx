import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from './App';
import { bootstrap } from './bootstrap';

beforeAll(() => {
  bootstrap();
});

describe('App', () => {
  it('renders the main landmark', () => {
    render(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
