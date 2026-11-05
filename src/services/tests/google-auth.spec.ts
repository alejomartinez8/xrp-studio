import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GoogleAuthService from '@/services/google-auth';
import { StorageKeys } from '@/utils/localstorage';

vi.mock('@react-oauth/google', () => ({ googleLogout: vi.fn() }));

/** Fake auth backend: handshake always works, refresh-token answers with `refreshStatus`. */
function fakeBackend(refreshStatus: number) {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
        const path = String(url);
        if (path.endsWith('/google-auth/handshake')) {
            return new Response(JSON.stringify({ handshake_token: 'hs' }));
        }
        if (path.endsWith('/google-auth/refresh-token')) {
            return new Response(JSON.stringify({ access_token: 'restored', expires_in: 3599 }), {
                status: refreshStatus,
            });
        }
        return new Response('{}');
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

/** Calls made to the refresh-token endpoint. */
function refreshCalls(fetchMock: ReturnType<typeof fakeBackend>) {
    return fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/refresh-token'));
}

describe('GoogleAuthService.restoreSession', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers({ toFake: ['setTimeout'] });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('does nothing when the last session ended or never started', async () => {
        const fetchMock = fakeBackend(200);
        const service = new GoogleAuthService();
        expect(await service.restoreSession()).toBeNull();
        expect(refreshCalls(fetchMock)).toHaveLength(0);
    });

    it('returns a new access token from the stored session, once', async () => {
        localStorage.setItem(StorageKeys.GOOGLE_SESSION, 'true');
        const fetchMock = fakeBackend(200);
        const service = new GoogleAuthService();
        const [first, second] = await Promise.all([
            service.restoreSession(),
            service.restoreSession(),
        ]);
        expect(first).toBe('restored');
        expect(second).toBe('restored');
        expect(service.userInfo.access_token).toBe('restored');
        expect(refreshCalls(fetchMock)).toHaveLength(1);
    });

    it('forgets the session when the backend cannot restore it', async () => {
        localStorage.setItem(StorageKeys.GOOGLE_SESSION, 'true');
        fakeBackend(401);
        const service = new GoogleAuthService();
        expect(await service.restoreSession()).toBeNull();
        expect(localStorage.getItem(StorageKeys.GOOGLE_SESSION)).toBeNull();
    });

    it('forgets the session on sign out', async () => {
        localStorage.setItem(StorageKeys.GOOGLE_SESSION, 'true');
        fakeBackend(200);
        await new GoogleAuthService().logOut();
        expect(localStorage.getItem(StorageKeys.GOOGLE_SESSION)).toBeNull();
    });
});
