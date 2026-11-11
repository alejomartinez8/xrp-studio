import { afterEach, describe, expect, it } from 'vitest';
import { swapStylesheet } from '@/utils/swap-stylesheet';

/** Adds the starting `<link id="theme-css" href="/style/light.css">` to the document head. */
function addCurrent(): HTMLLinkElement {
    const link = document.createElement('link');
    link.id = 'theme-css';
    link.rel = 'stylesheet';
    link.href = '/style/light.css';
    document.head.appendChild(link);
    return link;
}

/** All stylesheet links in the head, as their paths. */
function links(): string[] {
    return Array.from(document.head.querySelectorAll('link')).map((l) => new URL(l.href).pathname);
}

describe('swapStylesheet', () => {
    afterEach(() => {
        document.head.innerHTML = '';
    });

    it('keeps the current stylesheet until the new one has loaded', () => {
        const current = addCurrent();
        swapStylesheet(current, '/style/dark.css');

        expect(links()).toEqual(['/style/light.css', '/style/dark.css']);
        expect(document.getElementById('theme-css')).toBe(current);

        document.head.querySelector('link[data-replaces]')!.dispatchEvent(new Event('load'));

        expect(links()).toEqual(['/style/dark.css']);
        const next = document.getElementById('theme-css') as HTMLLinkElement;
        expect(new URL(next.href).pathname).toBe('/style/dark.css');
        expect(next.dataset.replaces).toBeUndefined();
    });

    it('still swaps when the new stylesheet fails to load', () => {
        const current = addCurrent();
        swapStylesheet(current, '/style/dark.css');
        document.head.querySelector('link[data-replaces]')!.dispatchEvent(new Event('error'));

        expect(links()).toEqual(['/style/dark.css']);
    });

    it('cancels a pending swap when going back to the current stylesheet', () => {
        const current = addCurrent();
        swapStylesheet(current, '/style/dark.css');
        const pending = document.head.querySelector('link[data-replaces]')!;
        swapStylesheet(current, '/style/light.css');
        pending.dispatchEvent(new Event('load'));

        expect(links()).toEqual(['/style/light.css']);
        expect(document.getElementById('theme-css')).toBe(current);
    });
});
