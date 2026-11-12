import { VscClose } from 'react-icons/vsc';

type ClosePanelButtonProps = {
    /** Tooltip and accessible name. */
    label: string;
    /** Hides the panel. */
    onClick: () => void;
};

/**
 * The X at the right end of the Terminal panel header, after flexlayout's maximize button, like a
 * code editor's panel. It is larger on touch screens so a finger can hit it.
 */
export function ClosePanelButton({ label, onClick }: ClosePanelButtonProps) {
    return (
        <button
            type="button"
            className="order-last flex h-7 w-7 items-center justify-center rounded text-shark-700 hover:bg-shark-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current pointer-coarse:h-11 pointer-coarse:w-11 dark:text-shark-200 dark:hover:bg-shark-700"
            title={label}
            aria-label={label}
            data-testid="close-panel"
            onClick={onClick}
        >
            <VscClose size={18} aria-hidden="true" />
        </button>
    );
}
