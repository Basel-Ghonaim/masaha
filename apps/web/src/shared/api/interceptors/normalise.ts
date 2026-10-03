import { toAppError } from '@shared/errors';
import type { AxiosInstance } from 'axios';

/** Last in the chain: every rejection leaves the transport as an AppError. */
export function installNormalise(client: AxiosInstance): () => void {
  const id = client.interceptors.response.use(undefined, (error: unknown) => {
    throw toAppError(error);
  });
  return () => {
    client.interceptors.response.eject(id);
  };
}
