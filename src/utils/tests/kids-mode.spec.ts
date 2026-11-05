import { afterEach, describe, expect, it } from 'vitest';
import { isKidsMode, setKidsMode } from '@/utils/kids-mode';
import { StorageKeys } from '@/utils/localstorage';

describe('kids mode preference', () => {
    afterEach(() => localStorage.removeItem(StorageKeys.KIDS_MODE));

    it('is off by default', () => {
        expect(isKidsMode()).toBe(false);
    });

    it('remembers the choice', () => {
        setKidsMode(true);
        expect(isKidsMode()).toBe(true);
        setKidsMode(false);
        expect(isKidsMode()).toBe(false);
    });
});
