import sharp from 'sharp';

import { AppError } from '../errors/index.ts';

// The image pipeline's core, domain-free (docs/backend/security.md › HTTP hardening): every image
// is decoded and encoded again on the server, so nothing but its pixels survives. Decoding is the
// content check: what sharp cannot decode as one of the formats taken is refused, whatever its name
// or declared type says. A consumer names the outputs it stores; the core knows no domain.

/** The formats taken: what phones and browsers produce. */
const FORMATS = new Set(['jpeg', 'png', 'webp']);

/**
 * The largest image decoded, in pixels: a 48 MP phone photo passes; past it an image is refused
 * before it is decoded, so a small file that expands to gigabytes of pixels costs nothing.
 */
export const IMAGE_PIXEL_LIMIT = 50_000_000;

// A function's instance lives on between requests: keep no image in libvips' cache.
sharp.cache(false);

/** One image to make: its name, its box, how it fills it, and its WebP quality (1–100). */
export interface ImageOutput {
  name: string;
  width: number;
  height: number;
  /** `cover` fills the box exactly, cropped around the centre; `inside` fits it, never enlarged. */
  fit: 'cover' | 'inside';
  quality: number;
}

/** An image made: WebP, with no metadata, named as its output was. */
export interface EncodedImage<Name extends string = string> {
  name: Name;
  bytes: Buffer;
  width: number;
  height: number;
}

/**
 * Decodes `bytes` and encodes each output as WebP: turned the way its EXIF says, then stripped of
 * every metadata (EXIF, so GPS; XMP; ICC, its colours converted to sRGB). An animated image keeps
 * its first frame. Refuses anything but a decodable JPEG, PNG or WebP (415), and an image over
 * `IMAGE_PIXEL_LIMIT` (413).
 */
export async function encodeImage<Output extends ImageOutput>(
  bytes: Buffer,
  outputs: readonly Output[],
): Promise<EncodedImage<Output['name']>[]> {
  const input = sharp(bytes, { limitInputPixels: IMAGE_PIXEL_LIMIT });
  const { format } = await input.metadata().catch(refusal);
  if (!FORMATS.has(format)) {
    throw AppError.unsupportedMediaType(undefined, `Not a JPEG, PNG or WebP: ${format}`);
  }

  return Promise.all(
    outputs.map(async ({ name, width, height, fit, quality }) => {
      const { data, info } = await input
        .clone()
        .autoOrient()
        .resize({ width, height, fit, position: 'centre', withoutEnlargement: fit === 'inside' })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true })
        .catch(refusal);
      return { name, bytes: data, width: info.width, height: info.height };
    }),
  );
}

/** sharp's refusal as the API's: too many pixels is too large; anything else, not an image taken. */
function refusal(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('pixel limit')) throw AppError.payloadTooLarge(undefined, message);
  throw AppError.unsupportedMediaType(undefined, message);
}
