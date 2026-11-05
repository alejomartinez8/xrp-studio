import { describe, expect, it, vi } from 'vitest';
import EditorMgr, { EditorSession } from '@/managers/editormgr';
import { storeLoadedContent } from '@/utils/loaded-content';

/** Make the editor manager return these sessions. */
function withSessions(sessions: Partial<EditorSession>[]) {
    vi.spyOn(EditorMgr.getInstance(), 'getAllEditorSessions').mockReturnValue(
        new Map(sessions.map((session, index) => [String(index), session as EditorSession])),
    );
}

describe('storeLoadedContent', () => {
    it('stores the content in the matching session only', () => {
        const python: Partial<EditorSession> = { name: 'zigzag.py', path: '/XRPCode/zigzag.py' };
        const other: Partial<EditorSession> = { name: 'zigzag.py', path: '/other/zigzag.py' };
        withSessions([python, other]);
        storeLoadedContent('zigzag.py', '/XRPCode/zigzag.py', 'print("hola")');
        expect(python.content).toBe('print("hola")');
        expect(other.content).toBeUndefined();
    });

    it('keeps content the session already has, and ignores empty content', () => {
        const session: Partial<EditorSession> = { name: 'a.py', path: '/a.py', content: 'edited' };
        const empty: Partial<EditorSession> = { name: 'b.py', path: '/b.py' };
        withSessions([session, empty]);
        storeLoadedContent('a.py', '/a.py', 'from storage');
        storeLoadedContent('b.py', '/b.py', null);
        expect(session.content).toBe('edited');
        expect(empty.content).toBeUndefined();
    });
});
