/**
 * Offline build flag.
 *
 * Set VITE_OFFLINE=true (or build with `--mode offline`, which loads
 * `.env.offline`) to produce a build that never reaches the network:
 *   - no Google sign-in / Drive (the Google Identity script is not loaded)
 *   - no AI Buddy chat
 *   - no connection telemetry
 *
 * Code paths stay in place; they are only skipped when this flag is on.
 */
export const isOfflineBuild: boolean = import.meta.env.VITE_OFFLINE === 'true';

/**
 * Whether "My projects" (projects kept in the browser, see LocalDriveService) is the project
 * store. Always on since spec 020: every build opens straight into My projects, without signing
 * in. XRPWeb's Google Drive code paths stay behind this flag.
 */
export const isLocalProjectsEnabled: boolean = true;

/**
 * Whether signing in with Google syncs My projects with the account's Drive (spec 020): builds
 * with a Google auth backend (`GOOGLE_AUTH_URL`) that are not offline builds.
 */
export const isDriveSyncEnabled: boolean = !isOfflineBuild && !!import.meta.env.GOOGLE_AUTH_URL;
