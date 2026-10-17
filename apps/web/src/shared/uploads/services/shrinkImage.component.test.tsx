import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeCanvas, fakeFile } from '../../../test/fakeCanvas';
import { UnsupportedImageError } from '../types/UnsupportedImageError';
import { shrinkImage } from './shrinkImage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shrinkImage', () => {
  it('re-encodes a photo turned as its EXIF says, at 1600 px on its longest side, as JPEG at 0.85', async () => {
    const canvas = fakeCanvas({ width: 4000, height: 3000 });

    const shrunk = await shrinkImage(fakeFile('IMG_0042.heic', 'image/heic'));

    // A phone's portrait photo is turned before its EXIF is dropped with the re-encode.
    expect(canvas.decodeOptions()).toMatchObject({ imageOrientation: 'from-image' });
    expect(canvas.drawn()).toEqual({ width: 1600, height: 1200 });
    expect(canvas.encoded()).toEqual({ type: 'image/jpeg', quality: 0.85 });
    expect(shrunk.name).toBe('IMG_0042.jpg');
    expect(shrunk.type).toBe('image/jpeg');
  });

  it('leaves a photo smaller than the bound as it is', async () => {
    const canvas = fakeCanvas({ width: 800, height: 600 });

    await shrinkImage(fakeFile('small.png', 'image/png'));

    expect(canvas.drawn()).toEqual({ width: 800, height: 600 });
  });

  it('refuses a file the browser cannot decode, and one it cannot draw', async () => {
    const undecodable = fakeCanvas({ decodes: false });

    await expect(shrinkImage(fakeFile('portrait.heic', 'image/heic'))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
    expect(undecodable.encoded()).toBeNull();

    const undrawable = fakeCanvas({ draws: false });

    await expect(shrinkImage(fakeFile('desk.png', 'image/png'))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
    expect(undrawable.encoded()).toBeNull();
  });

  it('refuses a photo the browser cannot write out', async () => {
    const canvas = fakeCanvas({ encodes: false });

    await expect(shrinkImage(fakeFile('desk.png', 'image/png'))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
    expect(canvas.drawn()).toEqual({ width: 1600, height: 1200 });
  });
});
