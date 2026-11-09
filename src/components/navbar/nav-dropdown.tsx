import { ReactNode, useEffect, useRef, useState } from 'react';

type NavDropdownProps = {
    id: string;
    label: string;
    icon: ReactNode;
    children: (close: () => void) => ReactNode;
};

/**
 * NavDropdown - round icon button in the top bar that opens a menu below it. Closes on outside
 * click or Escape. `children` receives a `close` callback for menu items.
 */
function NavDropdown({ id, label, icon, children }: NavDropdownProps) {
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
        <div ref={ref} className="relative">
            <button
                id={id}
                type="button"
                title={label}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpen(!isOpen)}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-matisse-100 hover:bg-matisse-400 dark:hover:bg-shark-500 ${isOpen ? 'bg-matisse-500 dark:bg-shark-600' : ''}`}
            >
                {icon}
            </button>
            {isOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-12 z-100 flex w-max min-w-56 flex-col bg-curious-blue-700 py-2 shadow-md dark:bg-mountain-mist-950"
                >
                    {children(close)}
                </div>
            )}
        </div>
    );
}

export default NavDropdown;
