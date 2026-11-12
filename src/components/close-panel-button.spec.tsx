import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClosePanelButton } from '@/components/close-panel-button';

describe('ClosePanelButton', () => {
    it('is a button named by its tooltip that hides the panel', () => {
        const onClick = vi.fn();
        render(<ClosePanelButton label="Close panel" onClick={onClick} />);
        const button = screen.getByRole('button', { name: 'Close panel' });
        expect(button.getAttribute('title')).toBe('Close panel');
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledOnce();
    });
});
