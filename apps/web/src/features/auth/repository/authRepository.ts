import type {
  GoogleSession,
  GoogleSignInRequest,
  LoginRequest,
  RegisterRequest,
} from '@masaha/shared/auth';
import { api } from '@shared/api';
import type { Session } from '@shared/session';

/** The auth capability's server calls (docs/api/api-contract.md §5 › Session). */
export interface AuthRepository {
  /** Signs in with an email and a password. */
  login: (request: LoginRequest) => Promise<Session>;
  /** Creates an account and signs it in. */
  register: (request: RegisterRequest) => Promise<Session>;
  /** Signs in with Google's ID token, creating or linking the account where the server allows it. */
  google: (request: GoogleSignInRequest) => Promise<GoogleSession>;
}

/** The auth capability's calls, through the app's one client. */
export function createAuthRepository(): AuthRepository {
  return {
    login: (request) => api.post<Session>('/auth/login', request),
    register: (request) => api.post<Session>('/auth/register', request),
    google: (request) => api.post<GoogleSession>('/auth/google', request),
  };
}
