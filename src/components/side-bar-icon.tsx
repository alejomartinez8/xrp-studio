import type { IconType } from 'react-icons';

type SideBarIconProps = {
    /** The icon to show. */
    icon: IconType;
    /** Tooltip and accessible name. */
    label: string;
    /** Whether the panel it controls is shown; highlights the icon. */
    selected?: boolean;
    /** Makes it a button (for toggles that are not border tabs). */
    onClick?: () => void;
    /** `data-testid` for tests. */
    testId?: string;
};

/**
 * An icon in the left side bar, like an editor's activity bar (XRP Studio). The
 * Without `onClick` it is the content of a border tab (the Explorer), which flexlayout makes
 * clickable; the left border rotates its tabs by -90 degrees, so that icon is turned back upright.
 * With it, a toggle button of its own (the Terminal), which flexlayout 0.9+ renders outside the
 * rotated tabs, so it stays as drawn.
 */
export function SideBarIcon({ icon: Icon, label, selected, onClick, testId }: SideBarIconProps) {
    if (!onClick) {
        return (
            <span
                className="side-bar-icon flex items-center justify-center"
                title={label}
                aria-label={label}
                data-testid={testId}
            >
                <Icon size={22} className="rotate-90" aria-hidden="true" />
            </span>
        );
    }
    return (
        <button
            type="button"
            className={`side-bar-icon side-bar-toggle flex items-center justify-center ${selected ? 'side-bar-icon--selected' : ''}`}
            title={label}
            aria-label={label}
            aria-pressed={!!selected}
            data-testid={testId}
            onClick={onClick}
        >
            <Icon size={22} aria-hidden="true" />
        </button>
    );
}
