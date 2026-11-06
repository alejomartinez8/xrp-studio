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
                title: 'account.deviceTitle',
                message: 'account.deviceMessage',
                values: { name: 'Ana' },
                choices: [
                    { value: 'own', label: 'account.deviceOwn', primary: true },
                    { value: 'shared', label: 'account.deviceShared' },
                ],
            });
            second = ask({
                title: 'account.unsyncedTitle',
                message: 'account.unsyncedMessage',
                choices: [{ value: 'stay', label: 'account.unsyncedStay' }],
            });
        });

        expect(screen.getByRole('alertdialog')).toHaveTextContent('Is this device yours?');
        expect(screen.getByRole('alertdialog')).toHaveTextContent('Ana, is this computer');
        fireEvent.click(screen.getByRole('button', { name: "It's shared" }));
        expect(await first).toBe('shared');

        expect(screen.getByRole('alertdialog')).toHaveTextContent('Changes not saved');
        fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
        expect(await second).toBe('stay');
        expect(screen.queryByTestId('ask-dialog')).toBeNull();
    });
});
