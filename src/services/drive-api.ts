import GoogleDriveService from '@/services/google-drive';
import { FOLDER_MIME_TYPE } from '@/services/local-drive';

/** A file or folder as Drive sync sees it. */
export type RemoteItem = {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    modifiedTime: string;
    /** Put in the Drive trash itself (not just inside a trashed folder). */
    explicitlyTrashed?: boolean;
    trashedTime?: string;
    /** The app's own properties; {@link ARCHIVED_PROPERTY} marks an archived project. */
    appProperties?: Record<string, string>;
};

/** App property set to `'true'` on archived projects. */
export const ARCHIVED_PROPERTY = 'xrpArchived';

/** Whether a Drive item is an archived project. */
export function isArchived(item: RemoteItem): boolean {
    return item.appProperties?.[ARCHIVED_PROPERTY] === 'true';
}

/** A Drive request that failed; `status` is 0 when the network could not be reached. */
export class DriveApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FIELDS = 'id,name,mimeType,parents,modifiedTime,explicitlyTrashed,trashedTime,appProperties';

type Fetch = typeof fetch;

/**
 * DriveApi - the requests Drive sync needs, on top of XRPWeb's GoogleDriveService
 * (still used by the sign-in widget to create the XRPCode folder). Unlike that service, every
 * method throws a {@link DriveApiError} when Drive refuses or cannot be reached, so sync keeps
 * the change and tries again.
 */
class DriveApi extends GoogleDriveService {
    private _token = '';
    private _fetch: Fetch;

    /** @param fetchImpl fetch to use (tests) */
    constructor(fetchImpl?: Fetch) {
        super();
        this._fetch = fetchImpl ?? ((input, init) => fetch(input, init));
    }

    setAccessToken(token: string): void {
        super.setAccessToken(token);
        this._token = token;
    }

    /** Whether a token is set (a Google account is signed in). */
    get hasToken(): boolean {
        return this._token !== '';
    }

    /** Forget the token (sign-out). */
    clearToken(): void {
        this.setAccessToken('');
    }

    private async request(url: string, init: RequestInit = {}): Promise<Response> {
        let response: Response;
        try {
            response = await this._fetch(url, {
                ...init,
                headers: { Authorization: `Bearer ${this._token}`, ...(init.headers ?? {}) },
            });
        } catch (error) {
            throw new DriveApiError(String(error), 0);
        }
        if (!response.ok) {
            throw new DriveApiError(`Drive answered ${response.status}`, response.status);
        }
        return response;
    }

    /** Files and folders directly inside a folder, trashed ones included, all pages. */
    async listFolder(folderId: string): Promise<RemoteItem[]> {
        const items: RemoteItem[] = [];
        let pageToken = '';
        do {
            const url = new URL(FILES_URL);
            url.searchParams.set('q', `'${folderId}' in parents`);
            url.searchParams.set('fields', `nextPageToken,files(${FIELDS})`);
            url.searchParams.set('pageSize', '1000');
            if (pageToken) {
                url.searchParams.set('pageToken', pageToken);
            }
            const data = (await (await this.request(url.toString())).json()) as {
                files?: RemoteItem[];
                nextPageToken?: string;
            };
            items.push(...(data.files ?? []));
            pageToken = data.nextPageToken ?? '';
        } while (pageToken);
        return items;
    }

    /** The account's top-level folder with this name, created when missing. */
    async ensureRoot(name: string): Promise<RemoteItem> {
        const url = new URL(FILES_URL);
        url.searchParams.set(
            'q',
            `name = '${name}' and mimeType = '${FOLDER_MIME_TYPE}' and 'root' in parents and trashed = false`,
        );
        url.searchParams.set('fields', `files(${FIELDS})`);
        const data = (await (await this.request(url.toString())).json()) as {
            files?: RemoteItem[];
        };
        if (data.files?.length) {
            return data.files[0];
        }
        return this.create(name, FOLDER_MIME_TYPE);
    }

    /** Create a folder, or a file with its content; `archived` marks it as an archived project. */
    async create(
        name: string,
        mimeType: string,
        parentId?: string,
        content?: string,
        archived?: boolean,
    ): Promise<RemoteItem> {
        const metadata = {
            name,
            mimeType,
            ...(parentId ? { parents: [parentId] } : {}),
            ...(archived ? { appProperties: { [ARCHIVED_PROPERTY]: 'true' } } : {}),
        };
        if (mimeType === FOLDER_MIME_TYPE) {
            const response = await this.request(`${FILES_URL}?fields=${FIELDS}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata),
            });
            return (await response.json()) as RemoteItem;
        }
        const response = await this.request(`${UPLOAD_URL}?uploadType=multipart&fields=${FIELDS}`, {
            method: 'POST',
            body: multipart(metadata, content ?? '', mimeType),
        });
        return (await response.json()) as RemoteItem;
    }

    /**
     * Change a file's name, content (files only), folder and, when given, its place in the trash
     * and whether it is archived.
     */
    async update(
        id: string,
        change: {
            name: string;
            mimeType: string;
            content?: string;
            addParent?: string;
            removeParent?: string;
            trashed?: boolean;
            archived?: boolean;
        },
    ): Promise<RemoteItem> {
        const params = new URLSearchParams({ fields: FIELDS });
        if (change.addParent && change.removeParent) {
            params.set('addParents', change.addParent);
            params.set('removeParents', change.removeParent);
        }
        const metadata = {
            name: change.name,
            ...(change.trashed !== undefined ? { trashed: change.trashed } : {}),
            ...(change.archived !== undefined
                ? { appProperties: { [ARCHIVED_PROPERTY]: change.archived ? 'true' : null } }
                : {}),
        };
        if (change.mimeType === FOLDER_MIME_TYPE || change.content === undefined) {
            const response = await this.request(`${FILES_URL}/${id}?${params}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata),
            });
            return (await response.json()) as RemoteItem;
        }
        params.set('uploadType', 'multipart');
        const response = await this.request(`${UPLOAD_URL}/${id}?${params}`, {
            method: 'PATCH',
            body: multipart(metadata, change.content, change.mimeType),
        });
        return (await response.json()) as RemoteItem;
    }

    /** Move to the Drive trash (kept there 30 days). A file already gone counts as done. */
    async trash(id: string): Promise<void> {
        try {
            await this.request(`${FILES_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trashed: true }),
            });
        } catch (error) {
            if (!(error instanceof DriveApiError && error.status === 404)) {
                throw error;
            }
        }
    }

    /** Delete for good, skipping the Drive trash. A file already gone counts as done. */
    async remove(id: string): Promise<void> {
        try {
            await this.request(`${FILES_URL}/${id}`, { method: 'DELETE' });
        } catch (error) {
            if (!(error instanceof DriveApiError && error.status === 404)) {
                throw error;
            }
        }
    }

    /** A file's content as text. */
    async download(id: string): Promise<string> {
        return (await this.request(`${FILES_URL}/${id}?alt=media`)).text();
    }
}

/** Multipart body with the metadata and the content, as Drive's upload API expects. */
function multipart(metadata: object, content: string, mimeType: string): FormData {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: mimeType }));
    return form;
}

export default DriveApi;
