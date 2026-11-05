import { clientId } from '../../server/google-auth/handlers';

/** Vercel function: GET /api/google-auth/client-id. */
export function GET(): Response {
    return clientId(process.env);
}
