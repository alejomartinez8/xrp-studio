import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import SnippetPanel from '@components/python/snippet-panel';
import { SNIPPET_MIME } from '@components/python/snippets';

/** Tests for the code snippet panel of the Python editor. */

/** Make the window phone-sized (below Tailwind's `md`) or not. */
function setPhone(phone: boolean) {
    vi.stubGlobal(
        'matchMedia',
        (query: string) => ({ matches: phone, media: query }) as MediaQueryList,
    );
}

describe('SnippetPanel', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('lists the categories with the first one open and inserts a clicked snippet', () => {
        setPhone(false);
        const onInsert = vi.fn();
        render(<SnippetPanel onInsert={onInsert} />);
        expect(screen.getByRole('button', { name: 'DriveTrain' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getByText(/Drives straight for 20 cm/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('snippet-xrp_straight_effort'));
        expect(onInsert).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'differentialDrive.straight(20, 0.5)' }),
        );
        expect(screen.getByTestId('snippet-panel')).toBeInTheDocument();
    });

    it('opens one category at a time', () => {
        setPhone(false);
        render(<SnippetPanel onInsert={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Loops' }));
        expect(screen.getByRole('button', { name: 'Loops' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getByRole('button', { name: 'DriveTrain' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(screen.getByTestId('snippet-whileTrue')).toBeInTheDocument();
    });

    it('drags a snippet with its id', () => {
        setPhone(false);
        render(<SnippetPanel onInsert={vi.fn()} />);
        const setData = vi.fn();
        fireEvent.dragStart(screen.getByTestId('snippet-xrp_turn_effort'), {
            dataTransfer: { setData, effectAllowed: '' },
        });
        expect(setData).toHaveBeenCalledWith(SNIPPET_MIME, 'xrp_turn_effort');
    });

    it('hides and shows again', () => {
        setPhone(false);
        render(<SnippetPanel onInsert={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Hide code snippets' }));
        expect(screen.queryByTestId('snippet-panel')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Show code snippets' }));
        expect(screen.getByTestId('snippet-panel')).toBeInTheDocument();
    });

    it('starts closed on phones and closes after inserting', () => {
        setPhone(true);
        render(<SnippetPanel onInsert={vi.fn()} />);
        expect(screen.queryByTestId('snippet-panel')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('snippet-panel-open'));
        fireEvent.click(screen.getByTestId('snippet-xrp_stop_motors'));
        expect(screen.queryByTestId('snippet-panel')).not.toBeInTheDocument();
    });
});
