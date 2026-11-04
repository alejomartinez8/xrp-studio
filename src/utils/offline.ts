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
