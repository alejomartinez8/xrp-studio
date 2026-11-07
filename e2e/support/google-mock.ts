import type { BrowserContext, Route } from '@playwright/test';

/**
 * Fake Google for the end-to-end tests (spec 005, part "Testing accounts and sync without
 * Google"). It answers, inside one browser context and without touching the network:
 *
 * - the Google Identity script (`accounts.google.com/gsi/client`): the sign-in "popup" returns an
 *   authorization code at once, as if the account had been picked;
 * - the auth backend endpoints under `/api/google-auth/` (client ID, handshake, code exchange,
 *   token refresh, sign-out), with the session kept here the way the real backend keeps it in its
 *   cookie;
 * - the Drive REST API used by the app (`about`, `files` list, create, update, trash, download and
 *   multipart upload), over an in-memory folder tree.
 *
 * Nothing here is part of the app: it only exists in the test run, so no production build can
 * contain it. It does not replace a manual test with a real Google account.
 */

export const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** The fake account that signs in. */
export type MockAccount = { id: string; email: string; name: string };

/** A file or folder in the fake Drive. */
export type MockFile = {
    id: string;
    name: string;
    mimeType: string;
    parents: string[];
    modifiedTime: string;
    trashed: boolean;
    content: string;
};

/** A request the fake received, for assertions. */
export type MockRequest = { method: string; path: string };

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

const GSI_SCRIPT = `
(function () {
    var client = function (config) {
        return {
            requestCode: function () {
                setTimeout(function () { config.callback({ code: 'mock-auth-code' }); }, 0);
            },
            requestAccessToken: function () {
                setTimeout(function () { config.callback({ access_token: 'mock-access-0' }); }, 0);
            },
        };
    };
    window.google = {
        accounts: {
            oauth2: { initCodeClient: client, initTokenClient: client, revoke: function () {} },
            id: { initialize: function () {}, prompt: function () {}, cancel: function () {},
                  disableAutoSelect: function () {}, renderButton: function () {} },
        },
    };
})();
`;

/** Parts of a `multipart/related` or `multipart/form-data` body, by field name or order. */
function parseMultipart(contentType: string, body: Buffer): { metadata: string; file: string } {
    const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
    if (!boundary) {
        return { metadata: '{}', file: '' };
    }
    const delimiter = `--${boundary[1] ?? boundary[2]}`;
    const parts = body
        .toString('utf8')
        .split(delimiter)
        .slice(1)
        .filter((part) => !part.startsWith('--'))
        .map((part) => {
            const split = part.indexOf('\r\n\r\n');
            const head = part.slice(0, split);
            const content = part.slice(split + 4).replace(/\r\n$/, '');
            return { head, content };
        });
    const named = (name: string) =>
        parts.find((part) => part.head.includes(`name="${name}"`))?.content;
    return { metadata: named('metadata') ?? parts[0]?.content ?? '{}', file: named('file') ?? '' };
}

/**
 * MockGoogle - install it on a browser context with {@link MockGoogle.install}, then read and
 * change its state from the test (`files`, `addRemoteFile`, `setReachable`, `sessionActive`).
 */
export class MockGoogle {
    account: MockAccount;
    files = new Map<string, MockFile>();
    requests: MockRequest[] = [];
    /** Whether the backend still has the signed-in session (the real one keeps it in a cookie). */
    sessionActive = false;
    /** Sign-ins that reached the code exchange. */
    signIns = 0;
    private reachable = true;
    private clock = Date.parse('2026-01-01T00:00:00Z');
    private nextId = 1;
    private tokens = 0;
    private issuedTokens = new Set<string>();

    /** @param account the account the fake sign-in picks */
    constructor(account?: Partial<MockAccount>) {
        this.account = {
            id: 'mock-user-1',
            email: 'ana.mock@example.com',
            name: 'Ana Mock',
            ...account,
        };
    }

    /** Answer Google's hosts and the auth endpoints for every page of the context. */
    async install(context: BrowserContext): Promise<void> {
        await context.route('https://accounts.google.com/gsi/client', (route) =>
            route.fulfill({ contentType: 'text/javascript', body: GSI_SCRIPT }),
        );
        await context.route('**/api/google-auth/**', (route) => this.handleAuth(route));
        await context.route('https://www.googleapis.com/**', (route) => this.handleDrive(route));
    }

    /** Make Google's servers answer again (true) or fail like a lost connection (false). */
    setReachable(reachable: boolean): void {
        this.reachable = reachable;
    }

    /** Files and folders that are not in the trash. */
    liveFiles(): MockFile[] {
        return [...this.files.values()].filter((file) => !file.trashed);
    }

    /** A live file or folder by name. */
    find(name: string): MockFile | undefined {
        return this.liveFiles().find((file) => file.name === name);
    }

    /** The account's XRPCode folder, created when missing. */
    root(): MockFile {
        return (
            this.liveFiles().find((f) => f.name === 'XRPCode' && f.parents.includes('root')) ??
            this.put('XRPCode', FOLDER_MIME, ['root'], '')
        );
    }

    /** Put a file in the account's XRPCode folder, as if another device had saved it. */
    addRemoteFile(name: string, content: string, folder: MockFile = this.root()): MockFile {
        return this.put(name, 'text/x-python', [folder.id], content);
    }

    /** Change the content of a file, as if another device had saved it. */
    changeRemoteFile(name: string, content: string): void {
        const file = this.find(name);
        if (!file) {
            throw new Error(`No file named ${name} in the fake Drive`);
        }
        file.content = content;
        file.modifiedTime = this.tick();
    }

    /** Requests received, optionally only those whose path contains `part`. */
    received(part = ''): MockRequest[] {
        return this.requests.filter((request) => request.path.includes(part));
    }

    private tick(): string {
        this.clock += 1000;
        return new Date(this.clock).toISOString();
    }

    private put(name: string, mimeType: string, parents: string[], content: string): MockFile {
        const file: MockFile = {
            id: `mock-file-${this.nextId++}`,
            name,
            mimeType,
            parents,
            modifiedTime: this.tick(),
            trashed: false,
            content,
        };
        this.files.set(file.id, file);
        return file;
    }

    private view(file: MockFile) {
        const { id, name, mimeType, parents, modifiedTime } = file;
        return { kind: 'drive#file', id, name, mimeType, parents, modifiedTime };
    }

    private json(route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) {
        return route.fulfill({
            status,
            contentType: 'application/json',
            headers: { ...CORS, ...headers },
            body: JSON.stringify(body),
        });
    }

    private async handleAuth(route: Route): Promise<void> {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace(/^.*\/google-auth/, '');
        this.requests.push({ method: request.method(), path: `/google-auth${path}` });
        if (!this.reachable) {
            return route.abort('internetdisconnected');
        }
        if (path === '/client-id') {
            return this.json(route, { client_id: 'mock-client-id.apps.googleusercontent.com' });
        }
        if (path === '/handshake') {
            return this.json(route, { handshake_token: 'mock-handshake' });
        }
        if (path === '/exchange-code') {
            this.sessionActive = true;
            this.signIns++;
            return this.json(route, {
                access_token: this.newToken(),
                refresh_token: 'stored-in-secure-cookie',
                expires_in: 3600,
            });
        }
        if (path === '/refresh-token') {
            if (!this.sessionActive) {
                return this.json(route, { error: { message: 'No session' } }, 401);
            }
            return this.json(route, { access_token: this.newToken(), expires_in: 3600 });
        }
        if (path.startsWith('/session/')) {
            this.sessionActive = false;
            return this.json(route, { ok: true });
        }
        return route.fallback();
    }

    private newToken(): string {
        const token = `mock-access-${++this.tokens}`;
        this.issuedTokens.add(token);
        return token;
    }

    private async handleDrive(route: Route): Promise<void> {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() === 'OPTIONS') {
            return route.fulfill({ status: 204, headers: CORS });
        }
        this.requests.push({ method: request.method(), path: `${url.pathname}${url.search}` });
        if (!this.reachable) {
            return route.abort('internetdisconnected');
        }
        const bearer = /^Bearer (.*)$/.exec(request.headers()['authorization'] ?? '')?.[1];
        if (!bearer || !this.issuedTokens.has(bearer)) {
            return this.json(route, { error: { message: 'Invalid credentials' } }, 401);
        }
        const method = request.method();
        const upload = url.pathname.startsWith('/upload/');
        const id = /\/files\/([^/]+)$/.exec(url.pathname)?.[1];

        if (url.pathname === '/drive/v3/about') {
            return this.json(route, {
                user: {
                    permissionId: this.account.id,
                    emailAddress: this.account.email,
                    displayName: this.account.name,
                },
            });
        }
        if (method === 'GET' && !id) {
            return this.json(route, { files: this.query(url.searchParams.get('q') ?? '') });
        }
        if (method === 'GET' && id) {
            const file = this.files.get(id);
            if (!file) {
                return this.json(route, { error: { message: 'Not found' } }, 404);
            }
            if (url.searchParams.get('alt') === 'media') {
                return route.fulfill({
                    status: 200,
                    contentType: 'text/plain',
                    headers: CORS,
                    body: file.content,
                });
            }
            return this.json(route, this.view(file));
        }
        if (method === 'POST') {
            const { metadata, file } = this.body(request, upload);
            const meta = JSON.parse(metadata) as Partial<MockFile>;
            const created = this.put(
                meta.name ?? 'Untitled',
                meta.mimeType ?? 'application/octet-stream',
                meta.parents ?? ['root'],
                file,
            );
            return this.json(route, this.view(created));
        }
        if (method === 'PATCH' && id) {
            const file = this.files.get(id);
            if (!file) {
                return this.json(route, { error: { message: 'Not found' } }, 404);
            }
            const { metadata, file: content } = this.body(request, upload);
            const meta = JSON.parse(metadata) as Partial<MockFile>;
            if (meta.name !== undefined) file.name = meta.name;
            if (meta.trashed !== undefined) file.trashed = meta.trashed;
            if (upload) file.content = content;
            const add = url.searchParams.get('addParents');
            const remove = url.searchParams.get('removeParents');
            if (add && remove) {
                file.parents = file.parents.filter((p) => p !== remove).concat(add);
            }
            file.modifiedTime = this.tick();
            return this.json(route, this.view(file));
        }
        return this.json(route, { error: { message: 'Not implemented by the mock' } }, 501);
    }

    private body(request: ReturnType<Route['request']>, upload: boolean) {
        if (!upload) {
            return { metadata: request.postData() || '{}', file: '' };
        }
        return parseMultipart(
            request.headers()['content-type'] ?? '',
            request.postDataBuffer() ?? Buffer.alloc(0),
        );
    }

    private query(q: string): ReturnType<MockGoogle['view']>[] {
        const parent = /'([^']+)' in parents/.exec(q)?.[1];
        const name = /name = '([^']+)'/.exec(q)?.[1];
        const mime = /mimeType = '([^']+)'/.exec(q)?.[1];
        return this.liveFiles()
            .filter((file) => !parent || file.parents.includes(parent))
            .filter((file) => !name || file.name === name)
            .filter((file) => !mime || file.mimeType === mime)
            .map((file) => this.view(file));
    }
}
