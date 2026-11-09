/**
 * Screen-width breakpoints shared by code that cannot use Tailwind classes (Blockly, media
 * listeners). Names follow Tailwind's: `max-md` is everything below the `md` breakpoint (768 px),
 * the phone layout. Keep in step with Tailwind's default `screens` and with the
 * `@media (max-width: 767px)` rules in CSS files.
 */

/** Media query for Tailwind's `max-md` (below 768 px): phones. */
export const MAX_MD_QUERY = '(max-width: 767px)';

/** Whether the screen is below Tailwind's `md` breakpoint (the phone layout). */
export function isMaxMd(): boolean {
    return window.matchMedia?.(MAX_MD_QUERY).matches ?? false;
}
