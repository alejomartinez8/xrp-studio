import { isOfflineBuild } from '@/utils/offline';

/** Set when ?aibuddy=1 is present on initial page load (cleared on full reload). */
let aiBuddyMenuEnabled = false;

/**
 * Demo / release backdoor for AI Buddy. Call once before the app renders.
 *
 * URL param on page load:
 *   ?aibuddy=1 — show AI Buddy in the More menu until the tab is reloaded
 *   ?aibuddy=0 — hide AI Buddy (useful to reset after testing ?aibuddy=1)
 *
 * Build flag: VITE_ENABLE_AI_BUDDY=true always shows the menu item.
 */
export function initAiBuddyAccess(): void {
    // Remove legacy session flag from earlier builds
    sessionStorage.removeItem('xrp-ai-buddy-enabled');

    const params = new URLSearchParams(window.location.search);
    const value = params.get('aibuddy')?.toLowerCase();

    if (value === '1' || value === 'true') {
        aiBuddyMenuEnabled = true;
    } else if (value === '0' || value === 'false') {
        aiBuddyMenuEnabled = false;
    }

    if (value) {
        params.delete('aibuddy');
        const query = params.toString();
        const cleanUrl = query
            ? `${window.location.pathname}?${query}${window.location.hash}`
            : `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
    }
}

export function isAiBuddyMenuEnabled(): boolean {
    if (isOfflineBuild) {
        return false;
    }
    if (import.meta.env.VITE_ENABLE_AI_BUDDY === 'true') {
        return true;
    }
    return aiBuddyMenuEnabled;
}
