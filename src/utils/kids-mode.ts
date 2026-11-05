import { StorageKeys } from '@/utils/localstorage';

/**
 * Kids mode preference. Off by default; turned on from Settings. The layout is built when the app
 * loads, so changing it takes effect after a reload.
 */

/** Whether kids mode is on. Falls back to off when storage is unavailable. */
export function isKidsMode(): boolean {
    try {
        return localStorage.getItem(StorageKeys.KIDS_MODE) === 'true';
    } catch {
        return false;
    }
}

/** Save the kids mode preference; it is not kept when storage is unavailable. */
export function setKidsMode(enabled: boolean): void {
    try {
        localStorage.setItem(StorageKeys.KIDS_MODE, String(enabled));
    } catch {
        return;
    }
}
