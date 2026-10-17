import { api } from '@shared/api';

/** How much of a file has travelled, and how much there is of it. */
export type UploadProgress = (sent: number, total: number) => void;

/** What the browser sends as a body travels: the bytes sent, and the bytes there are. */
type ProgressEvent = { loaded: number; total?: number };

/** One multipart request: where to, the field the file travels under, the file, and its progress. */
export type MultipartUpload = {
  url: string;
  fieldName: string;
  file: File;
  onProgress?: UploadProgress;
};

/**
 * Sends one file as a multipart body through the app's one client, so a capability never reaches for
 * Axios: the envelope's `data` is the answer, and a failure is the transport's `AppError`, as for
 * every other call (docs/frontend/architecture.md §7).
 *
 * `onProgress` reads the bytes the browser has sent. An event with no `total` — a body whose size it
 * cannot measure — says nothing of a percentage and is passed on as nothing. A request is never
 * re-sent by the transport: a POST without an idempotency key is retried only by the user.
 */
export async function sendMultipart<T>({
  url,
  fieldName,
  file,
  onProgress,
}: MultipartUpload): Promise<T> {
  const body = new FormData();
  body.append(fieldName, file);
  return api.post<T>(url, body, {
    ...(onProgress === undefined
      ? {}
      : {
          onUploadProgress: (event: ProgressEvent) => {
            if (event.total !== undefined) onProgress(event.loaded, event.total);
          },
        }),
  });
}
