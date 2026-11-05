/**
 * Minimal cookie helpers for the Google auth endpoints. Cookies are HttpOnly, Secure, SameSite=Strict
 * and scoped to the auth endpoints' path, since the app and the endpoints share one origin.
 */

export const COOKIE_PATH = '/api/google-auth';

/** Read a cookie from a request. */
export function readCookie(request: Request, name: string): string | undefined {
    const header = request.headers.get('cookie') ?? '';
    for (const part of header.split(';')) {
        const [key, ...value] = part.trim().split('=');
        if (key === name) {
            return decodeURIComponent(value.join('='));
        }
    }
    return undefined;
}

/** Serialize a cookie; a `maxAge` of 0 deletes it. */
export function serializeCookie(name: string, value: string, maxAge: number): string {
    return [
        `${name}=${encodeURIComponent(value)}`,
        `Path=${COOKIE_PATH}`,
        `Max-Age=${maxAge}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
    ].join('; ');
}
