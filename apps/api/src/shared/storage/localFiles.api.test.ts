import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LOCAL_FILES_URL } from '../../app.ts';
import { createTestApp } from '../../../test/app.ts';
import { createLocalStorage } from './localStorage.ts';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'masaha-local-files-'));
  // Beside the root, where a path that climbs out of it would land.
  await writeFile(path.join(root, '..', `${path.basename(root)}-secret.webp`), 'secret');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
  await rm(path.join(root, '..', `${path.basename(root)}-secret.webp`), { force: true });
});

describe('the local storage’s files, in development and the tests', () => {
  it('serves a stored file at its URL, with its type, kept a year since its key never changes', async () => {
    const storage = createLocalStorage({ root, urlBase: LOCAL_FILES_URL });
    const app = createTestApp({ storage });
    const bytes = Buffer.from('RIFF....WEBP');
    await storage.put('spaces/abc/card.webp', { bytes, contentType: 'image/webp' });

    const response = await request(app).get(storage.url('spaces/abc/card.webp'));

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/webp');
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(response.body).toEqual(bytes);
  });

  it('answers not_found for a file it does not hold, and for a path that climbs out', async () => {
    const app = createTestApp({ storage: createLocalStorage({ root, urlBase: LOCAL_FILES_URL }) });

    const missing = await request(app).get(`${LOCAL_FILES_URL}/spaces/none/card.webp`);
    const climbing = await request(app).get(
      `${LOCAL_FILES_URL}/%2e%2e/${path.basename(root)}-secret.webp`,
    );

    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ success: false, error: { type: 'not_found' } });
    expect(climbing.status).not.toBe(200);
    expect(climbing.text).not.toContain('secret');
  });
});
