import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import EditorSwitch from '@components/editor-switch';
import { forgetEditorView, getEditorView, setEditorView } from '@/utils/editor-view';

describe('EditorSwitch', () => {
    afterEach(() => forgetEditorView('tab-1'));

    it('switches a blocks file between its blocks and its Python', () => {
        render(<EditorSwitch tabId="tab-1" isBlocks />);
        const blocks = screen.getByRole('radio', { name: 'Blocks' });
        const python = screen.getByRole('radio', { name: 'Python' });
        expect(blocks).toHaveAttribute('aria-checked', 'true');
        expect(python).toHaveAttribute('aria-checked', 'false');

        fireEvent.click(python);
        expect(getEditorView('tab-1')).toBe('python');
        expect(python).toHaveAttribute('aria-checked', 'true');

        act(() => setEditorView('tab-1', 'blocks'));
        expect(blocks).toHaveAttribute('aria-checked', 'true');
    });

    it('only says Python for a Python file', () => {
        render(<EditorSwitch tabId="tab-1" isBlocks={false} />);
        expect(screen.queryByRole('radio')).toBeNull();
        expect(screen.getByTestId('editor-switch')).toHaveTextContent('Python');
    });
});
