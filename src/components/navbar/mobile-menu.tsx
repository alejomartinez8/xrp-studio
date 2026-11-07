import { ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TbMenu2, TbX } from 'react-icons/tb';

type MobileMenuProps = {
    /** The menu entries; receives `close` so an entry can close the menu after its action. */
    children: (close: () => void) => ReactNode;
    /** Shown at the bottom of the menu on narrow screens, and inline in the bar on wide ones. */
    footer: ReactNode;
};

/**
 * MobileMenu - the hamburger menu of the top bar on narrow screens (spec 003). One button at the
 * right opens a panel with every entry of the bar (File, View, Help, settings) and, at the
 * bottom, the account. On wide screens the button and the entries are hidden and the footer is
 * laid out inline in the bar, so the account widget is mounted once in both cases (its session
 * logic must not start twice) and stays mounted while the panel is closed.
 */
function MobileMenu({ children, footer }: MobileMenuProps) {
    const { t } = useTranslation();
    const [isOpen, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const close = () => setOpen(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const onPointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={ref} className="relative md:contents">
            <button
                id="mobileMenuBtn"
                type="button"
                title={t('menu')}
                aria-label={t('menu')}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpen(!isOpen)}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-matisse-100 hover:bg-matisse-400 dark:hover:bg-shark-500 md:hidden ${isOpen ? 'bg-matisse-500 dark:bg-shark-600' : ''}`}
            >
                {isOpen ? <TbX size={26} /> : <TbMenu2 size={26} />}
            </button>
            <div
                role="menu"
                className={`absolute right-0 top-12 z-[100] max-h-[calc(100dvh-4.5rem)] w-[min(88vw,20rem)] flex-col overflow-y-auto bg-curious-blue-700 py-2 shadow-md dark:bg-mountain-mist-950 md:static md:contents ${isOpen ? 'flex' : 'hidden'}`}
            >
                <div className="flex flex-col md:hidden">{children(close)}</div>
                <div className="mt-2 flex items-center justify-center border-t border-matisse-400 px-4 pt-3 dark:border-shark-600 md:mt-0 md:border-0 md:p-0">
                    {footer}
                </div>
            </div>
        </div>
    );
}

export default MobileMenu;
