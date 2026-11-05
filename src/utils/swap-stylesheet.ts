/**
 * Replace a stylesheet `<link>` without a flash of unstyled content. The new link is added next
 * to the current one, and the current one is removed only after the new stylesheet has loaded (or
 * failed to load), so the page is never left without styles while the file downloads. The new
 * link takes over the current link's `id` once the swap completes.
 *
 * A swap that is still loading is cancelled when another swap of the same link starts, so fast
 * toggling ends on the last requested stylesheet. Asking for the stylesheet that is already
 * applied only cancels the pending swap.
 */
export function swapStylesheet(current: HTMLLinkElement, href: string): void {
    document
        .querySelectorAll(`link[data-replaces="${current.id}"]`)
        .forEach((pending) => pending.remove());

    const next = document.createElement('link');
    next.rel = 'stylesheet';
    next.href = href;
    if (next.href === current.href) {
        return;
    }
    next.dataset.replaces = current.id;

    const finish = () => {
        if (!next.isConnected) {
            return;
        }
        delete next.dataset.replaces;
        current.remove();
        next.id = current.id;
    };
    next.addEventListener('load', finish, { once: true });
    next.addEventListener('error', finish, { once: true });
    current.after(next);
}
