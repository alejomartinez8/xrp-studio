import EditorMgr from '@/managers/editormgr';

/**
 * Keep a file's content in its editor session when the load event is sent. An editor that is not
 * mounted yet (the Python editor while its code downloads, a tab restored at startup) misses the
 * event, and reads the content from the session when it mounts instead. Content the session
 * already has is kept.
 */
export function storeLoadedContent(name: string, path: string, content: string | null | undefined) {
    if (!content) {
        return;
    }
    const session = Array.from(EditorMgr.getInstance().getAllEditorSessions().values()).find(
        (editorSession) => editorSession.name === name && editorSession.path === path,
    );
    if (session && !session.content) {
        session.content = content;
    }
}
