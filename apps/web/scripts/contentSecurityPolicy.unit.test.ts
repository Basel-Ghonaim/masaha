import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The web's pages online carry the Content-Security-Policy of vercel.json (docs/development/setup.md,
// The deployment). Its script-src allows index.html's inline theme script by its SHA-256 hash, never
// by 'unsafe-inline': a change to that script that leaves the hash behind would block it online, the
// theme and the language then flashing on every load, with nothing failing locally.
const ROOT = join(import.meta.dirname, '../../..');

type HeaderRule = { source: string; headers: { key: string; value: string }[] };
type VercelConfig = { headers?: HeaderRule[] };

const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as VercelConfig;
const indexHtml = readFileSync(join(ROOT, 'apps/web/index.html'), 'utf8');

const valueOf = (rule: HeaderRule, key: string) =>
  rule.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

const pageRules = (config.headers ?? []).filter(
  (rule) => valueOf(rule, 'Content-Security-Policy') !== undefined,
);

/** A directive's sources, as the policy lists them. */
function directive(policy: string, name: string): string[] {
  const found = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([directiveName]) => directiveName === name);
  return found ? found.slice(1) : [];
}

/** The hash source of each inline script (one without `src`), as CSP computes it. */
function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    ([, body]) =>
      `'sha256-${createHash('sha256')
        .update(body ?? '')
        .digest('base64')}'`,
  );
}

describe("the web pages' Content-Security-Policy", () => {
  it('is set by one rule, which covers the pages and leaves the API to its own headers', () => {
    expect(pageRules).toHaveLength(1);
    const pages = new RegExp(`^${pageRules[0]?.source ?? '$^'}$`);
    for (const path of ['/', '/spaces/noor-hub', '/dashboard/spaces/7', '/assets/index.js']) {
      expect(pages.test(path), path).toBe(true);
    }
    expect(pages.test('/api/v1/lookups')).toBe(false);
  });

  it("allows exactly index.html's inline scripts, by their hashes, and no inline script else", () => {
    const policy = valueOf(pageRules[0] ?? { source: '', headers: [] }, 'Content-Security-Policy');
    const scriptSources = directive(policy ?? '', 'script-src');
    const hashes = inlineScriptHashes(indexHtml);

    expect(hashes.length).toBeGreaterThan(0);
    expect(
      scriptSources.filter((source) => source.startsWith("'sha256-")).sort(),
      `vercel.json's script-src must list index.html's inline scripts as ${hashes.join(' ')}`,
    ).toEqual(hashes.sort());
    expect(scriptSources).not.toContain("'unsafe-inline'");
    expect(scriptSources).not.toContain("'unsafe-eval'");
  });

  it("lets Google's sign-in open its popup", () => {
    expect(valueOf(pageRules[0] ?? { source: '', headers: [] }, 'Cross-Origin-Opener-Policy')).toBe(
      'same-origin-allow-popups',
    );
  });
});
