import sharp from 'sharp';

// Images the tests upload and check, made with sharp, so no image file is committed.

/** A plain image of `width`×`height`, encoded as `format`. */
export function image(
  format: 'jpeg' | 'png' | 'webp' | 'gif',
  width = 400,
  height = 300,
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#2f6f4f' } })
    .toFormat(format)
    .toBuffer();
}

/** A JPEG whose EXIF names a camera and carries a GPS position in Gaza, as a phone's photo does. */
export function jpegWithGps(width = 400, height = 300): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#2f6f4f' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'Phone 1' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '31/1 31/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '34/1 27/1 0/1',
      },
    })
    .toBuffer();
}

/** A JPEG stored sideways, with the EXIF orientation (6) that tells a viewer to turn it. */
export function sidewaysJpeg(width = 200, height = 100): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#2f6f4f' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

/** Whether EXIF data points at a GPS section (the tag 0x8825, in either byte order). */
export function hasGps(exif: Buffer | undefined): boolean {
  return (
    !!exif && (exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88])))
  );
}

/** What sharp reads of an image: its format, size and metadata. */
export function describe(bytes: Buffer) {
  return sharp(bytes).metadata();
}
