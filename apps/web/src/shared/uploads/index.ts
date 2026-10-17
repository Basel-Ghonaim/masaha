/**
 * Shrinking an image in the browser and sending a file through the app's one client, with each
 * file's own progress. It names no space and no photo: the geometry, the shrinker, the multipart
 * call and the rule for offering a retry again are a platform mechanism, and a capability reads
 * only this entry.
 */
export { canRetryUpload } from './services/canRetryUpload';
export { fitInside, SHRINK_DEFAULTS } from './services/photoGeometry';
export { sendMultipart, type MultipartUpload, type UploadProgress } from './services/sendMultipart';
export { shrinkImage } from './services/shrinkImage';
export { UnsupportedImageError } from './types/UnsupportedImageError';
