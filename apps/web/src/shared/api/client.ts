import axios from 'axios';

/** Where the API lives, on the web's own origin (docs/api/api-contract.md §1). */
export const API_BASE_PATH = '/api/v1';

/**
 * The one Axios instance (docs/frontend/architecture.md §1). Relative in every environment: the web and
 * the API share one origin, so the cookies travel by themselves (ADR 0014). A request may set its own
 * `timeout`.
 */
export const apiClient = axios.create({ baseURL: API_BASE_PATH, timeout: 15_000 });
