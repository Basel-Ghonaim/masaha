export {
  DASHBOARD_PATHS,
  parseSpaceId,
  spaceDeskPath,
  spaceHomePath,
  spaceOverviewPath,
} from './dashboardPaths';
export { classifyRouteError, type RouteErrorKind } from './states/classifyRouteError';
export { DocumentTitle } from './title/DocumentTitle';
export { ForbiddenState } from './states/ForbiddenState';
export { hasDashboard } from './landing/hasDashboard';
export { landingPath } from './landing/landingPath';
export { rememberSpace } from './landing/lastSpace';
export { NotFoundState } from './states/NotFoundState';
export { PasswordChangeGate } from './guards/PasswordChangeGate';
export { publicSpacePath } from './publicSpacePath';
export { RequireAuth } from './guards/RequireAuth';
export { RequireGuest } from './guards/RequireGuest';
export { RequirePasswordChange } from './guards/RequirePasswordChange';
export { RequireRole } from './guards/RequireRole';
export { RequireSpaceRole } from './guards/RequireSpaceRole';
export { CHANGE_PASSWORD_PATH, RESET_PASSWORD_PATH, SIGN_IN_PATH } from './returnUrl';
export { RecordTitleProvider } from './title/RecordTitleProvider';
export { RouteErrorState } from './states/RouteErrorState';
export type { PageTitle } from './title/PageTitle';
export type { TitledHandle } from './title/titledHandle';
export { usePageTitle } from './title/usePageTitle';
export { useRecordTitle } from './title/useRecordTitle';
