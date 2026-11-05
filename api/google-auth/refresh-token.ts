import { refreshToken } from '../../server/google-auth/handlers.js';

/** Vercel function: POST /api/google-auth/refresh-token. */
export function POST(request: Request): Promise<Response> {
    return refreshToken(request, process.env);
}
