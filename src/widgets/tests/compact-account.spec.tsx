import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CompactAccount from '@/widgets/compact-account';

const profile = { id: '1', email: 'ada@example.com', name: 'Ada Lovelace', picture: '' };

describe('CompactAccount', () => {
    it('shows a sign-in button when signed out', () => {
        const onSignIn = vi.fn();
        render(
            <CompactAccount
                isLogin={false}
                isSigningIn={false}
                profile={profile}
                onPictureError={() => {}}
                onSignIn={onSignIn}
                onSignOut={() => {}}
            />,
        );
        fireEvent.click(screen.getByRole('button'));
        expect(onSignIn).toHaveBeenCalled();
    });

    it('shows a placeholder instead of the sign-in button while restoring a session', () => {
        render(
            <CompactAccount
                isLogin={false}
                isSigningIn={false}
                isRestoring={true}
                profile={profile}
                onPictureError={() => {}}
                onSignIn={() => {}}
                onSignOut={() => {}}
            />,
        );
        expect(screen.getByRole('status')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('shows initials and signs out from the account menu', () => {
        const onSignOut = vi.fn();
        render(
            <CompactAccount
                isLogin={true}
                isSigningIn={false}
                profile={profile}
                onPictureError={() => {}}
                onSignIn={() => {}}
                onSignOut={onSignOut}
            />,
        );
        const avatar = screen.getByRole('button', { name: 'ada@example.com' });
        expect(avatar.textContent).toBe('AL');
        fireEvent.click(avatar);
        expect(screen.getByText('Ada Lovelace')).toBeTruthy();
        fireEvent.click(screen.getByRole('menuitem'));
        expect(onSignOut).toHaveBeenCalled();
    });
});
