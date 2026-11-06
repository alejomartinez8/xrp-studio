import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorType } from '@/utils/types';

const sessions = new Map<string, Record<string, unknown>>();
const markSessionSaved = vi.fn();
const auth = { isLogin: true };
const upsert = vi.fn();

vi.mock('@/managers/editormgr', () => ({
    default: {
        getInstance: () => ({
            getEditorSession: (id: string) => sessions.get(id),
            markSessionSaved,
        }),
    },
}));

vi.mock('@/managers/appmgr', () => ({
    default: {
        getInstance: () => ({
            authService: auth,
            driveService: { upsertFileToGoogleDrive: upsert },
        }),
    },
}));

import {
    AUTOSAVE_DELAY_MS,
    AUTOSAVE_RETRY_MS,
    flushAutosave,
    resetAutosave,
    saveToDrive,
    scheduleAutosave,
    startAutosave,
} from '@/utils/autosave';

/** Put an open file in the fake editor manager. */
function openFile(id: string, content: string, gpath: string | null = `g-${id}`) {
    sessions.set(id, {
        id,
        name: id,
        path: `/XRPCode/${id}.py`,
        gpath: gpath ?? undefined,
        type: EditorType.PYTHON,
        content,
    });
}

/** Change the content of an open file and report it, as the editors do. */
function edit(id: string, content: string) {
    (sessions.get(id) as Record<string, unknown>).content = content;
    scheduleAutosave(id);
}

describe('autosave', () => {
    const save = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        sessions.clear();
        markSessionSaved.mockClear();
        save.mockReset().mockResolvedValue(undefined);
        auth.isLogin = true;
        resetAutosave();
        startAutosave(save);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('groups quick changes into one save after a quiet moment', async () => {
        openFile('a', '1');
        edit('a', '12');
        edit('a', '123');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 100);
        expect(save).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(200);
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0][0]).toMatchObject({
            gpath: 'g-a',
            name: 'a.py',
            mimeType: 'text/x-python',
            content: '123',
        });
        expect(markSessionSaved).toHaveBeenCalledWith('a');
    });

    it('saves at once when flushed', async () => {
        openFile('a', '1');
        edit('a', 'x');
        await flushAutosave();
        expect(save).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('writes a change made during a save right after it', async () => {
        let finish: () => void = () => {};
        save.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
        openFile('a', '1');
        edit('a', 'first');
        const first = flushAutosave('a');
        edit('a', 'second');
        const second = flushAutosave('a');
        expect(save).toHaveBeenCalledTimes(1);
        finish();
        await first;
        await second;
        expect(save).toHaveBeenCalledTimes(2);
        expect(save.mock.calls[1][0].content).toBe('second');
    });

    it('keeps a failed change and tries again later and when back online', async () => {
        save.mockRejectedValueOnce(new Error('offline'));
        openFile('a', '1');
        edit('a', 'x');
        await flushAutosave();
        expect(markSessionSaved).not.toHaveBeenCalled();
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(0);
        expect(save).toHaveBeenCalledTimes(2);
        expect(markSessionSaved).toHaveBeenCalledWith('a');

        save.mockRejectedValueOnce(new Error('offline'));
        edit('a', 'y');
        await flushAutosave();
        await vi.advanceTimersByTimeAsync(AUTOSAVE_RETRY_MS);
        expect(save).toHaveBeenCalledTimes(4);
        expect(save.mock.calls[3][0].content).toBe('y');
    });

    it('does not save files on the robot or without a projects session', async () => {
        openFile('robot', '1', null);
        edit('robot', '2');
        openFile('a', '1');
        auth.isLogin = false;
        edit('a', '2');
        await flushAutosave();
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);
        expect(save).not.toHaveBeenCalled();
    });

    it('treats a write Drive refused as a failure', async () => {
        const snapshot = { gpath: 'g-a', name: 'a.py', mimeType: 'text/plain', content: 'x' };
        upsert.mockResolvedValueOnce({ id: 'g-a' });
        await expect(saveToDrive(snapshot)).resolves.toBeUndefined();
        upsert.mockResolvedValueOnce(null);
        await expect(saveToDrive(snapshot)).rejects.toThrow('a.py');
    });
});
