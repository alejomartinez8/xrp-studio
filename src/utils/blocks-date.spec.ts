import { describe, expect, it } from 'vitest';
import { formatBlocksDate } from '@/utils/blocks-date';

/** Local dates and the string moment's `YYYY-MM-DD HH:MM:SS` gave for each before it was removed. */
const CASES: [Date, string][] = [
    [new Date(2026, 10, 9, 14, 7, 23, 456), '2026-11-09 14:11:45'],
    [new Date(2026, 0, 1, 0, 0, 0, 0), '2026-01-01 00:01:00'],
    [new Date(2025, 11, 31, 23, 59, 59, 999), '2025-12-31 23:12:99'],
    [new Date(2024, 1, 29, 9, 5, 3, 7), '2024-02-29 09:02:00'],
    [new Date(2030, 5, 15, 12, 30, 45, 10), '2030-06-15 12:06:01'],
];

describe('formatBlocksDate', () => {
    it.each(CASES)('formats %s as moment did', (date, expected) => {
        expect(formatBlocksDate(date)).toBe(expected);
    });

    it('uses the current time by default', () => {
        expect(formatBlocksDate()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
});
