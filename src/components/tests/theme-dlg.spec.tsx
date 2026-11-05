import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import ThemeDialog from '@components/dialogs/theme-dlg';
import { APP_THEMES } from '@/theme/app-themes';
import { Themes } from '@/managers/appmgr';
import { applyTheme, currentTheme } from '@/utils/theme';

describe('ThemeDialog', () => {
    afterEach(() => applyTheme(Themes.LIGHT));

    it('shows one card per theme and marks the current one', () => {
        applyTheme(Themes.LIGHT);
        render(<ThemeDialog toggleDialog={() => {}} />);
        expect(screen.getAllByRole('button', { pressed: false }).length).toBe(
            APP_THEMES.length - 1,
        );
        expect(screen.getByRole('button', { pressed: true }).id).toBe(`theme-${Themes.LIGHT}`);
    });

    it('applies the chosen theme and closes', () => {
        const toggleDialog = vi.fn();
        const { container } = render(<ThemeDialog toggleDialog={toggleDialog} />);
        fireEvent.click(container.querySelector(`#theme-${Themes.DARK}`)!);
        expect(currentTheme()).toBe(Themes.DARK);
        expect(toggleDialog).toHaveBeenCalled();
    });
});
