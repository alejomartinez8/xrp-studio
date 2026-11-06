import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@/utils/i18n';
import AskDialog from '@components/ask-dialog';
import { ask } from '@/utils/ask';

describe('AskDialog', () => {
    it('shows each question in turn and resolves it with the chosen answer', async () => {
        render(<AskDialog />);
        expect(screen.queryByTestId('ask-dialog')).toBeNull();

        let first!: Promise<string>;
        let second!: Promise<string>;
        act(() => {
            first = ask({
                title: 'account.moveTitle',
                message: 'account.moveMessage',
                values: { count: 3 },
                choices: [
                    { value: 'move', label: 'account.moveYes', primary: true },
                    { value: 'leave', label: 'account.moveNo' },
                ],
            });
            second = ask({
                title: 'account.unsyncedTitle',
                message: 'account.unsyncedMessage',
                choices: [{ value: 'stay', label: 'account.unsyncedStay' }],
            });
        });

        expect(screen.getByRole('alertdialog')).toHaveTextContent('Projects on this device');
        expect(screen.getByRole('alertdialog')).toHaveTextContent('There are 3 projects');
        fireEvent.click(screen.getByRole('button', { name: 'Leave them here' }));
        expect(await first).toBe('leave');

        expect(screen.getByRole('alertdialog')).toHaveTextContent('Changes not saved');
        fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
        expect(await second).toBe('stay');
        expect(screen.queryByTestId('ask-dialog')).toBeNull();
    });
});
