import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/utils/i18n';
import LanguageDialog from '@components/dialogs/language-dlg';
import { SUPPORTED_LANGUAGES, findLanguage } from '@/utils/i18n/languages';

describe('LanguageDialog', () => {
    afterEach(() => i18n.changeLanguage('en'));

    it('shows one card per supported language and marks the current one', async () => {
        await i18n.changeLanguage('en');
        render(<LanguageDialog toggleDialog={() => {}} />);
        expect(screen.getAllByRole('button', { pressed: false }).length).toBe(
            SUPPORTED_LANGUAGES.length - 1,
        );
        expect(screen.getByRole('button', { pressed: true }).textContent).toContain('English');
    });

    it('switches the language and closes', () => {
        const toggleDialog = vi.fn();
        render(<LanguageDialog toggleDialog={toggleDialog} />);
        fireEvent.click(screen.getByText('Español'));
        expect(i18n.language).toBe('es');
        expect(toggleDialog).toHaveBeenCalled();
    });

    it('finds regional codes by their base language', () => {
        expect(findLanguage('es-419')?.code).toBe('es');
        expect(findLanguage('fr')).toBeUndefined();
    });
});
