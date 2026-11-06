import { useSyncExternalStore } from 'react';
import AppMgr from '@/managers/appmgr';
import EditorMgr from '@/managers/editormgr';
import { EditorType } from '@/utils/types';

/** What the save indicator shows: nothing yet, a save running or waiting, all saved, or a failure. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** The file to write: what was in the editor when the change was made. */
type Snapshot = {
    gpath: string;
    name: string;
    mimeType: string;
    content: string;
};

/** Writes one file to the project store (My projects or Google Drive). */
export type SaveFile = (snapshot: Snapshot) => Promise<void>;

/** Quiet time after the last change before saving. */
export const AUTOSAVE_DELAY_MS = 1500;

/** Wait before trying a failed save again, when no change or reconnection comes first. */
export const AUTOSAVE_RETRY_MS = 15000;

const pending = new Map<string, Snapshot>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const running = new Map<string, Promise<void>>();
const failed = new Set<string>();
const listeners = new Set<() => void>();
let status: AutosaveStatus = 'idle';
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** Default writer: the same upsert the Save menu used, through the active drive service. */
const saveToDrive: SaveFile = async ({ gpath, name, mimeType, content }) => {
    const blob = new Blob([content], { type: mimeType });
    await AppMgr.getInstance().driveService.upsertFileToGoogleDrive(blob, name, mimeType, gpath);
};

let saveFile: SaveFile = saveToDrive;

/** Work out the indicator state from the pending, running and failed saves. */
function updateStatus(): void {
    const next: AutosaveStatus =
        failed.size > 0
            ? 'error'
            : pending.size > 0 || running.size > 0
              ? 'saving'
              : status === 'idle'
                ? 'idle'
                : 'saved';
    if (next !== status) {
        status = next;
        listeners.forEach((listener) => listener());
    }
}

/** Try the failed saves again after a while. */
function scheduleRetry(): void {
    if (retryTimer) {
        return;
    }
    retryTimer = setTimeout(() => {
        retryTimer = null;
        void flushAutosave();
    }, AUTOSAVE_RETRY_MS);
}

/** True when a tab's file lives in the project store and saves on its own (spec 019). */
export function isAutosaved(id: string): boolean {
    const session = EditorMgr.getInstance().getEditorSession(id);
    return Boolean(session?.gpath) && AppMgr.getInstance().authService.isLogin;
}

/**
 * Remember an editor change and save it after {@link AUTOSAVE_DELAY_MS} without more changes.
 * Reads the content the editor last stored in its session (`SaveToLocalStorage`). Only files of
 * My projects or Google Drive, while that session is active; files on the robot are saved by
 * hand.
 */
export function scheduleAutosave(id: string): void {
    const session = EditorMgr.getInstance().getEditorSession(id);
    if (!session?.gpath || session.content === undefined || !isAutosaved(id)) {
        return;
    }
    pending.set(id, {
        gpath: session.gpath,
        name: session.path.split('/').pop() ?? session.name,
        mimeType: session.type === EditorType.PYTHON ? 'text/x-python' : 'application/json',
        content: session.content,
    });
    const timer = timers.get(id);
    if (timer) {
        clearTimeout(timer);
    }
    timers.set(
        id,
        setTimeout(() => void flushAutosave(id), AUTOSAVE_DELAY_MS),
    );
    updateStatus();
}

/**
 * Write one tab's latest change now. One write per file at a time: a change made while it runs
 * is written right after it. A failed write keeps the change and is tried again later.
 */
async function saveTab(id: string): Promise<void> {
    const timer = timers.get(id);
    if (timer) {
        clearTimeout(timer);
        timers.delete(id);
    }
    const inFlight = running.get(id);
    if (inFlight) {
        await inFlight;
    }
    const snapshot = pending.get(id);
    if (!snapshot) {
        return;
    }
    pending.delete(id);
    const write = saveFile(snapshot)
        .then(() => {
            failed.delete(id);
            if (!pending.has(id)) {
                EditorMgr.getInstance().markSessionSaved(id);
            }
        })
        .catch((error) => {
            console.warn('Autosave failed:', snapshot.name, error);
            if (!pending.has(id)) {
                pending.set(id, snapshot);
            }
            failed.add(id);
            scheduleRetry();
        })
        .finally(() => {
            running.delete(id);
            updateStatus();
        });
    running.set(id, write);
    updateStatus();
    await write;
}

/**
 * Write the waiting changes now, for one tab or for all of them. Used by Save, Run, closing a
 * tab and leaving the page.
 */
export async function flushAutosave(id?: string): Promise<void> {
    const ids = id ? [id] : [...new Set([...pending.keys(), ...running.keys()])];
    await Promise.all(ids.map((tab) => saveTab(tab)));
}

/**
 * Save when the page is hidden or closed, and retry failed saves when the network comes back.
 * Takes another writer in tests.
 */
export function startAutosave(writer: SaveFile = saveToDrive): void {
    saveFile = writer;
    const flushAll = () => void flushAutosave();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushAll();
        }
    });
    window.addEventListener('pagehide', flushAll);
    window.addEventListener('online', flushAll);
}

/** Forget every pending save and the indicator state (tests). */
export function resetAutosave(): void {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    pending.clear();
    running.clear();
    failed.clear();
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
    status = 'idle';
    listeners.forEach((listener) => listener());
}

/** Current save state, for the indicator. */
export function useAutosaveStatus(): AutosaveStatus {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => status,
    );
}
