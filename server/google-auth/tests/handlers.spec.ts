/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';
import {
    REFRESH_TOKEN_PLACEHOLDER,
    clientId,
    endSession,
    exchangeCode,
    handshake,
    refreshToken,
} from '../handlers';
import { decrypt, encrypt } from '../crypto';

const env = {
    OAUTH_CLIENT_ID: 'client-123.apps.googleusercontent.com',
    OAUTH_CLIENT_SECRET: 'secret',
    AUTH_SESSION_SECRET: 'session-secret',
};

/** Fake Google token endpoint that records the form it receives. */
function fakeGoogle(response: Record<string, unknown>, ok = true) {
    const calls: { url: string; form: URLSearchParams }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), form: new URLSearchParams(String(init?.body)) });
        return new Response(JSON.stringify(response), { status: ok ? 200 : 400 });
    });
    return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

/** Cookie value set by a response, by name. */
function setCookie(response: Response, name: string): string | undefined {
    const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${name}=`));
    return header
        ? decodeURIComponent(header.split(';')[0].split('=').slice(1).join('='))
        : undefined;
}

/** A request from a browser that completed the handshake. */
function request(
    path: string,
    method: string,
    token: string,
    cookies: Record<string, string>,
    body?: unknown,
) {
    const cookie = Object.entries(cookies)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('; ');
    return new Request(`https://xrp.example${path}`, {
        method,
        headers: { 'X-Handshake-Token': token, cookie, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
}

describe('Google auth endpoints', () => {
    it('returns the client ID', async () => {
        expect(await clientId(env).json()).toEqual({ client_id: env.OAUTH_CLIENT_ID });
        expect(clientId({}).status).toBe(500);
    });

    it('starts a session with a token in the body and an HttpOnly cookie', async () => {
        const response = handshake();
        const { handshake_token } = (await response.json()) as { handshake_token: string };
        expect(handshake_token).toBeTruthy();
        expect(setCookie(response, 'xrp_handshake')).toBe(handshake_token);
        const header = response.headers.getSetCookie()[0];
        expect(header).toContain('HttpOnly');
        expect(header).toContain('SameSite=Strict');
    });

    it('exchanges the code, keeps the refresh token encrypted in a cookie and hides it', async () => {
        const google = fakeGoogle({
            access_token: 'access',
            expires_in: 3599,
            refresh_token: 'refresh',
        });
        const response = await exchangeCode(
            request(
                '/api/google-auth/exchange-code',
                'POST',
                'hs',
                { xrp_handshake: 'hs' },
                { code: 'abc' },
            ),
            env,
            google.fetchImpl,
        );
        expect(await response.json()).toEqual({
            access_token: 'access',
            expires_in: 3599,
            refresh_token: REFRESH_TOKEN_PLACEHOLDER,
        });
        expect(google.calls[0].form.get('code')).toBe('abc');
        expect(google.calls[0].form.get('redirect_uri')).toBe('postmessage');
        expect(google.calls[0].form.get('client_secret')).toBe('secret');
        const stored = setCookie(response, 'xrp_refresh')!;
        expect(stored).not.toContain('refresh');
        expect(await decrypt(stored, env.AUTH_SESSION_SECRET)).toBe('refresh');
    });

    it('rejects calls without the matching handshake cookie', async () => {
        const google = fakeGoogle({ access_token: 'access' });
        const response = await exchangeCode(
            request(
                '/api/google-auth/exchange-code',
                'POST',
                'hs',
                { xrp_handshake: 'other' },
                { code: 'abc' },
            ),
            env,
            google.fetchImpl,
        );
        expect(response.status).toBe(401);
        expect(google.calls).toHaveLength(0);
    });

    it('reports a rejected code and missing configuration', async () => {
        const rejected = await exchangeCode(
            request(
                '/api/google-auth/exchange-code',
                'POST',
                'hs',
                { xrp_handshake: 'hs' },
                { code: 'bad' },
            ),
            env,
            fakeGoogle({ error: 'invalid_grant' }, false).fetchImpl,
        );
        expect(rejected.status).toBe(401);
        const unconfigured = await exchangeCode(
            request(
                '/api/google-auth/exchange-code',
                'POST',
                'hs',
                { xrp_handshake: 'hs' },
                { code: 'abc' },
            ),
            {},
        );
        expect(unconfigured.status).toBe(500);
    });

    it('refreshes the access token from the stored refresh token', async () => {
        const stored = await encrypt('refresh', env.AUTH_SESSION_SECRET);
        const google = fakeGoogle({ access_token: 'new-access', expires_in: 3599 });
        const response = await refreshToken(
            request(
                '/api/google-auth/refresh-token',
                'POST',
                'hs',
                { xrp_handshake: 'hs', xrp_refresh: stored },
                { session_id: 'hs' },
            ),
            env,
            google.fetchImpl,
        );
        expect(await response.json()).toEqual({ access_token: 'new-access', expires_in: 3599 });
        expect(google.calls[0].form.get('refresh_token')).toBe('refresh');
        expect(google.calls[0].form.get('grant_type')).toBe('refresh_token');
    });

    it('refuses to refresh without a valid stored token', async () => {
        const response = await refreshToken(
            request('/api/google-auth/refresh-token', 'POST', 'hs', {
                xrp_handshake: 'hs',
                xrp_refresh: 'tampered.value',
            }),
            env,
            fakeGoogle({}).fetchImpl,
        );
        expect(response.status).toBe(401);
    });

    it('signs out: revokes the refresh token and clears both cookies', async () => {
        const stored = await encrypt('refresh', env.AUTH_SESSION_SECRET);
        const google = fakeGoogle({});
        const response = await endSession(
            request('/api/google-auth/session/hs', 'DELETE', 'hs', {
                xrp_handshake: 'hs',
                xrp_refresh: stored,
            }),
            env,
            google.fetchImpl,
        );
        expect(response.status).toBe(200);
        expect(google.calls[0].url).toContain('/revoke');
        expect(google.calls[0].form.get('token')).toBe('refresh');
        expect(
            response.headers.getSetCookie().every((cookie) => cookie.includes('Max-Age=0')),
        ).toBe(true);
    });
});
