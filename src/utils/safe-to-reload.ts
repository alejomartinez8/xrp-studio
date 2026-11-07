import AppMgr, { EventType } from '@/managers/appmgr';
import EditorMgr from '@/managers/editormgr';

let isRunning = false;
let isListening = false;

/** Starts following the "program running" events (once), so the state is known when needed. */
export function watchProgramRunning(): void {
    if (isListening) {
        return;
    }
    isListening = true;
    AppMgr.getInstance().on(EventType.EVENT_ISRUNNING, (running: string) => {
        isRunning = running === 'running';
    });
}

/**
 * Whether reloading the page loses nothing (spec 001): no robot is connected, no program is
 * running and no open file has changes that are not saved. Used to apply a new version of the
 * app by itself.
 */
export function isSafeToReload(): boolean {
    watchProgramRunning();
    const connected = AppMgr.getInstance().getConnection()?.isConnected() ?? false;
    const unsaved = [...EditorMgr.getInstance().getAllEditorSessions().values()].some(
        (session) => session.isModified === true,
    );
    return !connected && !isRunning && !unsaved;
}
