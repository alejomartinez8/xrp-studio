import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
    clientId,
    endSession,
    exchangeCode,
    handshake,
    refreshToken,
    type AuthEnv,
} from './handlers';

/**
 * Serves the Google auth endpoints (`/api/google-auth/*`) from `npm run dev`, with the same handlers
 * the Vercel functions in `api/google-auth/` use. Only active in dev when `OAUTH_CLIENT_ID`,
 * `OAUTH_CLIENT_SECRET` and `AUTH_SESSION_SECRET` are set, so local sign-in can be tested without the
 * Vercel CLI. Registered before Vite's `/api` proxy.
 */
export function googleAuthDevPlugin(env: AuthEnv): Plugin {
    return {
        name: 'google-auth-dev',
        apply: 'serve',
        configureServer(server) {
            if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET || !env.AUTH_SESSION_SECRET) {
                return;
            }
            server.middlewares.use('/api/google-auth', handle(env));
        },
    };
}

/** Connect middleware that adapts Node requests to the Web `Request`/`Response` handlers. */
function handle(env: AuthEnv): Connect.NextHandleFunction {
    return (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        void (async () => {
            const path = (req.url ?? '').split('?')[0];
            const body = await readBody(req);
            const request = new Request(`http://localhost/api/google-auth${path}`, {
                method: req.method,
                headers: req.headers as Record<string, string>,
                body: body.length > 0 ? body : undefined,
            });
            let response: Response | undefined;
            if (req.method === 'GET' && path === '/client-id') response = clientId(env);
            else if (req.method === 'GET' && path === '/handshake') response = handshake();
            else if (req.method === 'POST' && path === '/exchange-code')
                response = await exchangeCode(request, env);
            else if (req.method === 'POST' && path === '/refresh-token')
                response = await refreshToken(request, env);
            else if (req.method === 'DELETE' && path.startsWith('/session/'))
                response = await endSession(request, env);
            if (!response) {
                next();
                return;
            }
            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
                if (key !== 'set-cookie') res.setHeader(key, value);
            });
            res.setHeader('Set-Cookie', response.headers.getSetCookie());
            res.end(await response.text());
        })().catch(next);
    };
}

/** Read the raw request body. */
function readBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}
