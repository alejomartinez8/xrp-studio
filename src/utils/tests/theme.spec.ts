import { afterEach, describe, expect, it } from 'vitest';
import AppMgr, { Themes } from '@/managers/appmgr';
import { applyTheme, currentTheme } from '@/utils/theme';
import { StorageKeys } from '@/utils/localstorage';

describe('theme', () => {
    afterEach(() => applyTheme(Themes.LIGHT));

    it('switches the class, stores the choice and notifies the app', () => {
        applyTheme(Themes.DARK);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
        expect(localStorage.getItem(StorageKeys.THEME)).toBe(JSON.stringify(Themes.DARK));
        expect(AppMgr.getInstance().getTheme()).toBe(Themes.DARK);
        expect(currentTheme()).toBe(Themes.DARK);
    });
});
