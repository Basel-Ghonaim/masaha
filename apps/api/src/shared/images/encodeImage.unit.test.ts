import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  describe as read,
  hasGps,
  image,
  jpegWithGps,
  sidewaysJpeg,
} from '../../../test/images.ts';
import { AppError } from '../errors/index.ts';
import { encodeImage, type ImageOutput } from './encodeImage.ts';

const THUMB: ImageOutput = { name: 'thumb', width: 160, height: 90, fit: 'cover', quality: 75 };
const LARGE: ImageOutput = { name: 'large', width: 800, height: 800, fit: 'inside', quality: 80 };

/** The status of the error `promise` fails with. */
async function statusOf(promise: Promise<unknown>): Promise<number | undefined> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  return error instanceof AppError ? error.status : undefined;
}

describe('encodeImage', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'decodes a %s and encodes each output asked as WebP',
    async (format) => {
      const outputs = await encodeImage(await image(format, 1200, 900), [THUMB, LARGE]);

      expect(outputs.map(({ name }) => name)).toEqual(['thumb', 'large']);
      for (const output of outputs) expect((await read(output.bytes)).format).toBe('webp');
    },
  );

  it('fills a cover output exactly, and fits an inside output without enlarging it', async () => {
    const [thumb, large] = await encodeImage(await image('jpeg', 1200, 900), [THUMB, LARGE]);
    const [smallThumb, smallLarge] = await encodeImage(await image('png', 120, 60), [THUMB, LARGE]);

    expect([thumb?.width, thumb?.height]).toEqual([160, 90]);
    expect([large?.width, large?.height]).toEqual([800, 600]);
    expect([smallThumb?.width, smallThumb?.height]).toEqual([160, 90]);
    expect([smallLarge?.width, smallLarge?.height]).toEqual([120, 60]);
  });

  it('turns a photo stored sideways the way its EXIF says, before the metadata goes', async () => {
    const [large] = await encodeImage(await sidewaysJpeg(200, 100), [LARGE]);

    expect([large?.width, large?.height]).toEqual([100, 200]);
  });

  it('keeps no metadata: no EXIF, so no GPS position, no XMP and no ICC profile', async () => {
    const input = await jpegWithGps();
    expect(hasGps((await read(input)).exif)).toBe(true);

    const [large] = await encodeImage(input, [LARGE]);
    const metadata = await read(large?.bytes ?? Buffer.alloc(0));

    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it.each([
    ['text named as an image', () => Promise.resolve(Buffer.from('not an image at all'))],
    [
      'an SVG',
      () =>
        Promise.resolve(
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"></svg>'),
        ),
    ],
    ['a GIF', () => image('gif')],
    ['a JPEG cut short', async () => (await image('jpeg', 400, 300)).subarray(0, 600)],
  ])('refuses %s as unsupported (415)', async (_case, make) => {
    expect(await statusOf(encodeImage(await make(), [THUMB]))).toBe(415);
  });

  it('refuses an image over 50 megapixels as too large (413), before decoding it', async () => {
    const bomb = await sharp({
      create: { width: 8000, height: 7000, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();

    expect(await statusOf(encodeImage(bomb, [THUMB]))).toBe(413);
  });
});
