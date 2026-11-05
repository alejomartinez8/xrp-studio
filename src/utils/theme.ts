import AppMgr, { Themes } from '@/managers/appmgr';
import { StorageKeys } from '@/utils/localstorage';

/**
 * Apply the light or dark app theme: update the Tailwind `dark`/`light` class, persist the choice
 * (JSON, as `useLocalStorage` stores it) and notify listeners such as flexlayout and Blockly.
 */
export function applyTheme(theme: Themes): void {
    const other = theme === Themes.DARK ? Themes.LIGHT : Themes.DARK;
    document.documentElement.classList.add(theme);
    document.documentElement.classList.remove(other);
    try {
        localStorage.setItem(StorageKeys.THEME, JSON.stringify(theme));
    } catch {
        return;
    } finally {
        AppMgr.getInstance().setTheme(theme);
    }
}

/** Current app theme. */
export function currentTheme(): Themes {
    return document.documentElement.classList.contains(Themes.DARK) ? Themes.DARK : Themes.LIGHT;
}
