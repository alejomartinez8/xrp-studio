import { endSession } from '../../../server/google-auth/handlers';

/** Vercel function: DELETE /api/google-auth/session/{token} (sign out). */
export function DELETE(request: Request): Promise<Response> {
    return endSession(request, process.env);
}
