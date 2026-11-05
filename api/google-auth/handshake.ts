import { handshake } from '../../server/google-auth/handlers.js';

/** Vercel function: GET /api/google-auth/handshake. */
export function GET(): Response {
    return handshake();
}
