import { describe, expect, it } from 'vitest';

import { describe as read, image } from '../../../../test/images.ts';
import { encodeImage } from '../../../shared/images/index.ts';
import { objectKeysOf, PHOTO_OUTPUTS, urlsOf } from './photoSizes.ts';

/** The width and height of each size made from an image of `width`×`height`. */
async function sizesOf(width: number, height: number) {
  const outputs = await encodeImage(await image('jpeg', width, height), PHOTO_OUTPUTS);
  return Object.fromEntries(outputs.map(({ name, ...size }) => [name, [size.width, size.height]]));
}

describe('a photo’s sizes', () => {
  it('makes a 640×360 card and a page at most 1600 on its longest side', async () => {
    expect(await sizesOf(4000, 3000)).toEqual({ card: [640, 360], page: [1600, 1200] });
  });

  it('keeps a portrait’s height within 1600, and crops its card to 16:9', async () => {
    expect(await sizesOf(3000, 4000)).toEqual({ card: [640, 360], page: [1200, 1600] });
  });

  it('keeps a panorama’s width within 1600, and crops its card to 16:9', async () => {
    expect(await sizesOf(8000, 1000)).toEqual({ card: [640, 360], page: [1600, 200] });
  });

  it('never enlarges a small photo’s page, but always makes its card 640×360', async () => {
    expect(await sizesOf(300, 200)).toEqual({ card: [640, 360], page: [300, 200] });
  });

  it('encodes both as WebP', async () => {
    const outputs = await encodeImage(await image('png', 800, 600), PHOTO_OUTPUTS);
    for (const { bytes } of outputs) expect((await read(bytes)).format).toBe('webp');
  });

  it('derives each size’s object and URL from the photo’s one key', () => {
    expect(objectKeysOf('k3J9')).toEqual(['spaces/k3J9/card.webp', 'spaces/k3J9/page.webp']);
    expect(urlsOf('k3J9', (key) => `/files/${key}`)).toEqual({
      card: '/files/spaces/k3J9/card.webp',
      page: '/files/spaces/k3J9/page.webp',
    });
  });
});
