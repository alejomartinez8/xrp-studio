import { describe, expect, it, vi } from 'vitest';
import {
    forgetEditorView,
    getEditorView,
    onEditorViewChange,
    pythonCopyPath,
    setEditorView,
} from '@/utils/editor-view';

describe('editor view', () => {
    it('shows the blocks until Python is chosen, per tab', () => {
        expect(getEditorView('tab-a')).toBe('blocks');
        setEditorView('tab-a', 'python');
        expect(getEditorView('tab-a')).toBe('python');
        expect(getEditorView('tab-b')).toBe('blocks');
        forgetEditorView('tab-a');
        expect(getEditorView('tab-a')).toBe('blocks');
    });

    it('tells the listeners about real changes only, until they stop', () => {
        const listener = vi.fn();
        const stop = onEditorViewChange(listener);
        setEditorView('tab-c', 'python');
        setEditorView('tab-c', 'python');
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith('tab-c', 'python');
        stop();
        setEditorView('tab-c', 'blocks');
        expect(listener).toHaveBeenCalledTimes(1);
        forgetEditorView('tab-c');
    });
});

describe('pythonCopyPath', () => {
    it('puts the copy next to the blocks file with the same name', () => {
        expect(pythonCopyPath('/gusers/kid/robot.blocks', () => false)).toBe(
            '/gusers/kid/robot.py',
        );
    });

    it('numbers the copy when the name is taken', () => {
        const taken = new Set(['/robot.py', '/robot 2.py']);
        expect(pythonCopyPath('/robot.blocks', (path) => taken.has(path))).toBe('/robot 3.py');
    });
});
