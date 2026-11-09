/**
 * Date stamp written above the `##XRPBLOCKS` line of a blocks file.
 *
 * Upstream builds it with moment's pattern `YYYY-MM-DD HH:MM:SS`. In that pattern `MM` is the
 * month (not the minutes) and `SS` is hundredths of a second (not the seconds), so a program saved
 * on 9 November 2026 at 14:07:23.456 gets `2026-11-09 14:11:45`. This module produces exactly
 * the same string with the native `Date`, in local time, so files stay identical to upstream's.
 */

/** Pads a number with leading zeros to two digits. */
function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * Formats a date as moment's `YYYY-MM-DD HH:MM:SS`: year, month, day, hours, month again and
 * hundredths of a second, in local time.
 */
export function formatBlocksDate(date: Date = new Date()): string {
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hours = pad2(date.getHours());
    const hundredths = pad2(Math.floor(date.getMilliseconds() / 10));
    return `${year}-${month}-${day} ${hours}:${month}:${hundredths}`;
}
