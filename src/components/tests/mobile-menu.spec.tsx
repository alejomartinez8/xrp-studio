import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import MobileMenu from '@components/navbar/mobile-menu';

describe('MobileMenu', () => {
    it('opens with the button, closes from an entry and keeps the footer mounted', () => {
        render(
            <MobileMenu footer={<span data-testid="account">account</span>}>
                {(close) => (
                    <button type="button" onClick={close}>
                        entry
                    </button>
                )}
            </MobileMenu>,
        );
        const toggle = screen.getByRole('button', { name: 'Menu' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByTestId('account')).toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(screen.getByText('entry'));
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByTestId('account')).toBeInTheDocument();
    });

    it('closes on Escape', () => {
        render(<MobileMenu footer={null}>{() => <span>entry</span>}</MobileMenu>);
        const toggle = screen.getByRole('button', { name: 'Menu' });
        fireEvent.click(toggle);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
});
