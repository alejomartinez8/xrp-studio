import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import SnippetToolbox from '@components/python/snippet-toolbox';

/** Tests for the code toolbox of the Python editor: categories, flyout, search, drag, keyboard. */

/** Make the window phone-sized (below Tailwind's `md`) or not. */
function setPhone(phone: boolean) {
    vi.stubGlobal(
        'matchMedia',
        (query: string) => ({ matches: phone, media: query }) as MediaQueryList,
    );
}

/** Render the toolbox with spy callbacks. */
function setUp(phone = false) {
    setPhone(phone);
    const handlers = { onInsert: vi.fn(), onDragMove: vi.fn(), onDrop: vi.fn() };
    render(<SnippetToolbox {...handlers} />);
    return handlers;
}

/** Open a category by its name. */
function open(name: string) {
    fireEvent.click(screen.getByRole('button', { name }));
}

/** jsdom has no PointerEvent: a mouse event that also carries the pointer type. */
class FakePointerEvent extends MouseEvent {
    pointerType: string;

    constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
        super(type, { bubbles: true, cancelable: true, ...init });
        this.pointerType = init.pointerType ?? 'mouse';
    }
}

describe('SnippetToolbox', () => {
    beforeEach(() => vi.stubGlobal('PointerEvent', FakePointerEvent));
    afterEach(() => vi.unstubAllGlobals());

    it('lists the categories and Search, with no flyout until one is chosen', () => {
        setUp();
        for (const name of ['DriveTrain', 'Sensors', 'Control Board', 'Loops', 'Search']) {
            expect(screen.getByRole('button', { name })).toBeInTheDocument();
        }
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
    });

    it('opens a category as chips and expands one on click, with the Add button', () => {
        const { onInsert } = setUp();
        open('DriveTrain');
        expect(screen.getByTestId('snippet-flyout')).toBeInTheDocument();
        expect(screen.getByText('Drive straight')).toBeInTheDocument();
        expect(screen.queryByTestId('snippet-add-xrp_straight_effort')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('snippet-xrp_straight_effort'));
        expect(screen.getByText(/Drives straight for 20 cm/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('snippet-add-xrp_straight_effort'));
        expect(onInsert).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'differentialDrive.straight(20, 0.5)' }),
        );
        expect(screen.getByTestId('snippet-flyout')).toBeInTheDocument();
    });

    it('closes the flyout with the same category, Escape or a press outside', () => {
        setUp();
        open('Loops');
        open('Loops');
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
        open('Loops');
        fireEvent.keyDown(screen.getByTestId('snippet-whileTrue'), { key: 'Escape' });
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
        open('Loops');
        fireEvent.pointerDown(document.body);
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
    });

    it('searches across categories', () => {
        setUp();
        open('Search');
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'repeat' } });
        expect(screen.getByTestId('snippet-whileTrue')).toBeInTheDocument();
        expect(screen.getByTestId('snippet-forRange')).toBeInTheDocument();
        expect(screen.queryByTestId('snippet-xrp_sleep')).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } });
        expect(screen.getByText('No snippets found.')).toBeInTheDocument();
    });

    it('drags a chip with the pointer and drops it', () => {
        const { onDragMove, onDrop } = setUp();
        open('DriveTrain');
        const chip = screen.getByTestId('snippet-xrp_turn_effort');
        fireEvent.pointerDown(chip, { pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 12, clientY: 11 });
        expect(screen.queryByTestId('snippet-ghost')).not.toBeInTheDocument();
        fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 200, clientY: 80 });
        expect(screen.getByTestId('snippet-ghost')).toHaveTextContent('Turn');
        expect(onDragMove).toHaveBeenLastCalledWith(200, 80);
        act(() => {
            fireEvent.pointerUp(document, { pointerType: 'mouse', clientX: 300, clientY: 90 });
        });
        expect(onDrop).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'xrp_turn_effort' }),
            300,
            90,
        );
        expect(screen.queryByTestId('snippet-ghost')).not.toBeInTheDocument();
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
    });

    it('lets a finger scroll the list: vertical moves do not start a drag', () => {
        const { onDrop } = setUp();
        open('DriveTrain');
        const chip = screen.getByTestId('snippet-xrp_turn_effort');
        fireEvent.pointerDown(chip, { pointerType: 'touch', clientX: 10, clientY: 10 });
        fireEvent.pointerMove(document, { pointerType: 'touch', clientX: 12, clientY: 80 });
        expect(screen.queryByTestId('snippet-ghost')).not.toBeInTheDocument();
        fireEvent.pointerUp(document, { pointerType: 'touch', clientX: 12, clientY: 80 });
        expect(onDrop).not.toHaveBeenCalled();
    });

    it('works with the keyboard', () => {
        const { onInsert } = setUp();
        const sensors = screen.getByRole('button', { name: 'Sensors' });
        fireEvent.keyDown(screen.getByRole('button', { name: 'DriveTrain' }), { key: 'ArrowDown' });
        expect(screen.getByRole('button', { name: 'Individual Motors' })).toHaveFocus();
        fireEvent.keyDown(sensors, { key: 'Enter' });
        const first = screen.getByTestId('snippet-xrp_getsonardist');
        expect(first).toHaveFocus();
        fireEvent.keyDown(first, { key: 'ArrowDown' });
        expect(screen.getByTestId('snippet-xrp_l_refl')).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('snippet-xrp_l_refl'), { key: 'Enter' });
        expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'xrp_l_refl' }));
        fireEvent.keyDown(screen.getByTestId('snippet-xrp_l_refl'), { key: 'ArrowLeft' });
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
        expect(sensors).toHaveFocus();
    });

    it('closes the flyout after adding on phones', () => {
        const { onInsert } = setUp(true);
        open('DriveTrain');
        fireEvent.click(screen.getByTestId('snippet-xrp_stop_motors'));
        fireEvent.click(screen.getByTestId('snippet-add-xrp_stop_motors'));
        expect(onInsert).toHaveBeenCalled();
        expect(screen.queryByTestId('snippet-flyout')).not.toBeInTheDocument();
    });
});
