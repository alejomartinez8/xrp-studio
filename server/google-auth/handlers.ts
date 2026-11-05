import { decrypt, encrypt, randomToken } from './crypto.js';
import { readCookie, serializeCookie } from './cookies.js';

/**
 * Google sign-in endpoints used by the app's `GoogleAuthService` (`src/services/google-auth.ts`):
 * client-id, handshake, exchange-code, refresh-token and session (sign out). They keep XRPWeb's
 * request and response shapes, so the app's sign-in code works unchanged when `GOOGLE_AUTH_URL`
 * points here.
 *
 * Server configuration uses names without the `GOOGLE_` or `VITE_` prefixes on purpose: Vite exposes
 * variables with those prefixes to the browser bundle (`envPrefix` in `vite.config.ts`), and the
 * client secret must never reach it.
 *
 * Stateless by design: the handshake token and the Google refresh token live in HttpOnly cookies
 * (the refresh token encrypted with `AUTH_SESSION_SECRET`). The refresh token never reaches the browser's
 * JavaScript; the app receives a placeholder instead.
 */

/** Configuration read from the server environment. */
export interface AuthEnv {
    OAUTH_CLIENT_ID?: string;
    OAUTH_CLIENT_SECRET?: string;
    AUTH_SESSION_SECRET?: string;
}

type Fetch = typeof fetch;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const HANDSHAKE_COOKIE = 'xrp_handshake';
const REFRESH_COOKIE = 'xrp_refresh';
const HANDSHAKE_MAX_AGE = 60 * 60 * 24;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 180;

/** Placeholder returned to the app instead of the real refresh token, which stays server-side. */
export const REFRESH_TOKEN_PLACEHOLDER = 'stored-in-secure-cookie';

/** JSON response with optional cookies. */
function json(body: unknown, status = 200, cookies: string[] = []): Response {
    const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
    });
    cookies.forEach((cookie) => headers.append('Set-Cookie', cookie));
    return new Response(JSON.stringify(body), { status, headers });
}

/** Error response in the `{ error: { message } }` shape the app logs. */
function error(message: string, status: number): Response {
    return json({ error: { message } }, status);
}

/** Missing configuration, if any. */
function missingConfig(env: AuthEnv): string | null {
    const missing = ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'AUTH_SESSION_SECRET'].filter(
        (key) => !env[key as keyof AuthEnv],
    );
    return missing.length > 0 ? `Server is missing ${missing.join(', ')}` : null;
}

/**
 * Whether the request carries the handshake token from this browser's handshake cookie, in the
 * `X-Handshake-Token` header. Binds every call to the page that started the session.
 */
function hasValidHandshake(request: Request): boolean {
    const cookie = readCookie(request, HANDSHAKE_COOKIE);
    const header = request.headers.get('X-Handshake-Token');
    return Boolean(cookie) && cookie === header;
}

/** Call Google's token endpoint. */
async function requestToken(
    params: Record<string, string>,
    fetchImpl: Fetch,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const response = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
    });
    return { ok: response.ok, data: (await response.json()) as Record<string, unknown> };
}

/** GET /google-auth/client-id: the OAuth client ID the app passes to Google Identity. */
export function clientId(env: AuthEnv): Response {
    if (!env.OAUTH_CLIENT_ID) {
        return error('Server is missing OAUTH_CLIENT_ID', 500);
    }
    return json({ client_id: env.OAUTH_CLIENT_ID });
}

/** GET /google-auth/handshake: start a session with a random token (body and cookie). */
export function handshake(): Response {
    const token = randomToken();
    return json({ handshake_token: token }, 200, [
        serializeCookie(HANDSHAKE_COOKIE, token, HANDSHAKE_MAX_AGE),
    ]);
}

/**
 * POST /google-auth/exchange-code `{ code }`: exchange the authorization code from Google's popup
 * for tokens. The refresh token is stored encrypted in a cookie. Google only sends it the first
 * time a user grants access; when it is missing, the cookie already stored (if any) is kept, and
 * otherwise the session lasts until the access token expires (about an hour).
 */
export async function exchangeCode(
    request: Request,
    env: AuthEnv,
    fetchImpl: Fetch = fetch,
): Promise<Response> {
    const config = missingConfig(env);
    if (config) {
        return error(config, 500);
    }
    if (!hasValidHandshake(request)) {
        return error('Invalid handshake', 401);
    }
    const { code } = (await request.json().catch(() => ({}))) as { code?: string };
    if (!code) {
        return error('Missing code', 400);
    }
    const { ok, data } = await requestToken(
        {
            code,
            client_id: env.OAUTH_CLIENT_ID!,
            client_secret: env.OAUTH_CLIENT_SECRET!,
            redirect_uri: 'postmessage',
            grant_type: 'authorization_code',
        },
        fetchImpl,
    );
    if (!ok || typeof data.access_token !== 'string') {
        return error('Google rejected the authorization code', 401);
    }
    const cookies: string[] = [];
    if (typeof data.refresh_token === 'string') {
        cookies.push(
            serializeCookie(
                REFRESH_COOKIE,
                await encrypt(data.refresh_token, env.AUTH_SESSION_SECRET!),
                REFRESH_MAX_AGE,
            ),
        );
    }
    return json(
        {
            access_token: data.access_token,
            expires_in: data.expires_in,
            refresh_token: REFRESH_TOKEN_PLACEHOLDER,
        },
        200,
        cookies,
    );
}

/** POST /google-auth/refresh-token: a new access token from the stored refresh token. */
export async function refreshToken(
    request: Request,
    env: AuthEnv,
    fetchImpl: Fetch = fetch,
): Promise<Response> {
    const config = missingConfig(env);
    if (config) {
        return error(config, 500);
    }
    if (!hasValidHandshake(request)) {
        return error('Invalid handshake', 401);
    }
    const stored = readCookie(request, REFRESH_COOKIE);
    const refresh = stored ? await decrypt(stored, env.AUTH_SESSION_SECRET!) : null;
    if (!refresh) {
        return error('Not signed in', 401);
    }
    const { ok, data } = await requestToken(
        {
            refresh_token: refresh,
            client_id: env.OAUTH_CLIENT_ID!,
            client_secret: env.OAUTH_CLIENT_SECRET!,
            grant_type: 'refresh_token',
        },
        fetchImpl,
    );
    if (!ok || typeof data.access_token !== 'string') {
        return error('Google rejected the refresh token', 401);
    }
    return json({ access_token: data.access_token, expires_in: data.expires_in });
}

/** DELETE /google-auth/session/{token}: sign out; revokes the refresh token and clears cookies. */
export async function endSession(
    request: Request,
    env: AuthEnv,
    fetchImpl: Fetch = fetch,
): Promise<Response> {
    if (!hasValidHandshake(request)) {
        return error('Invalid handshake', 401);
    }
    const stored = readCookie(request, REFRESH_COOKIE);
    const refresh =
        stored && env.AUTH_SESSION_SECRET ? await decrypt(stored, env.AUTH_SESSION_SECRET) : null;
    if (refresh) {
        await fetchImpl(REVOKE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: refresh }).toString(),
        }).catch(() => undefined);
    }
    return json({ ok: true }, 200, [
        serializeCookie(REFRESH_COOKIE, '', 0),
        serializeCookie(HANDSHAKE_COOKIE, '', 0),
    ]);
}
