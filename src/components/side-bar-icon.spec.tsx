import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VscFiles, VscTerminal } from 'react-icons/vsc';
import { SideBarIcon } from '@/components/side-bar-icon';

describe('SideBarIcon', () => {
    it('shows only an icon, named by its tooltip', () => {
        render(<SideBarIcon icon={VscFiles} label="Explorer" />);
        const icon = screen.getByLabelText('Explorer');
        expect(icon.getAttribute('title')).toBe('Explorer');
        expect(icon.textContent).toBe('');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('is a pressed toggle button when it has a click handler', () => {
        const onClick = vi.fn();
        render(<SideBarIcon icon={VscTerminal} label="Terminal" selected onClick={onClick} />);
        const button = screen.getByRole('button', { name: 'Terminal' });
        expect(button.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledOnce();
    });
});
