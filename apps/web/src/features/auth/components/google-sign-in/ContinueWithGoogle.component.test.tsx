import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { CLIENT_ID, fakeGoogle, googleScript, clearGoogle } from '../../../../test/fakeGoogle';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { ContinueWithGoogle } from './ContinueWithGoogle';

/** The component as a page places it, with a divider, and Google's API on the page when `google`. */
function renderContinueWithGoogle(answer: () => FakeAnswer | Promise<FakeAnswer>, google = true) {
  const fake = fakeGoogle();
  if (google) fake.install();
  fakeTransport(answer);
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <ContinueWithGoogle divider={<p>or</p>} />
    </Wrapper>,
  );
  return { ...rendered, google: fake };
}

function googleButton() {
  return screen.findByRole('button', { name: 'Continue with Google' });
}

beforeEach(() => {
  startPreferences('en');
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearGoogle();
});

describe('ContinueWithGoogle', () => {
  it('shows nothing, the divider included, without a client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    const { container } = renderContinueWithGoogle(() => ok({}));

    expect(container).toBeEmptyDOMElement();
  });

  it("shows Google's button, then the divider", async () => {
    renderContinueWithGoogle(() => ok({}));

    const button = await googleButton();

    expect(screen.getByText('or')).toBeInTheDocument();
    expect(button.compareDocumentPosition(screen.getByText('or'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows why the sign-in failed above the button, with its title and line', async () => {
    const { google } = renderContinueWithGoogle(() =>
      refused(409, { type: 'conflict', code: 'GOOGLE_LINK_NOT_ALLOWED' }),
    );
    const button = await googleButton();

    act(() => {
      google.choose('google-id-token');
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t continue with Google');
    expect(alert).toHaveTextContent('An account with this email already exists.');
    expect(alert.compareDocumentPosition(button)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("says Google sign-in couldn't load, without its button, when Google's script fails", async () => {
    const { container } = renderContinueWithGoogle(() => ok({}), false);

    act(() => {
      googleScript()?.dispatchEvent(new Event('error'));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in couldn’t load. Check your connection, then reload the page.',
    );
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(screen.getByText('or')).toBeInTheDocument();
  });

  it('keeps the button out of reach while the sign-in is under way', async () => {
    const answer = deferred<FakeAnswer>();
    const { google } = renderContinueWithGoogle(() => answer.promise);
    const button = await googleButton();

    act(() => {
      google.choose('google-id-token');
    });

    await waitFor(() => {
      expect(button.parentElement).toHaveAttribute('inert');
    });
    expect(button.parentElement).toHaveAttribute('aria-busy', 'true');
    answer.resolve(ok({ ...aSession(), linked: false }));
    await waitFor(() => {
      expect(button.parentElement).not.toHaveAttribute('inert');
    });
  });

  it('has no accessibility violations, with a failure shown', async () => {
    const { container, google } = renderContinueWithGoogle(() =>
      refused(401, { type: 'unauthorized', code: 'GOOGLE_TOKEN_INVALID' }),
    );
    await googleButton();
    act(() => {
      google.choose('google-id-token');
    });
    await screen.findByRole('alert');

    expect(await axe(container)).toHaveNoViolations();
  });
});
