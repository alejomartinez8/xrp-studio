import { useTranslation } from 'react-i18next';
import { UserProfile } from '@/services/google-auth';
import NavDropdown from '@components/navbar/nav-dropdown';
import GoogleLogo from '@assets/images/google-logo.svg';

type CompactAccountProps = {
    isLogin: boolean;
    isSigningIn: boolean;
    /** A saved session is being restored: shows an avatar-sized placeholder, so nothing jumps. */
    isRestoring?: boolean;
    profile: UserProfile;
    picture?: string;
    onPictureError: () => void;
    onSignIn: () => void;
    onSignOut: () => void;
};

/** Up to two initials from the profile name, or its email. */
function initials(profile: UserProfile): string {
    const source = (profile.name || profile.email).trim();
    if (!source) {
        return '?';
    }
    const parts = source.split(/\s+/);
    return (
        parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)
    ).toUpperCase();
}

/**
 * Avatar-sized placeholder shown while a saved Google session is being restored, so the top bar
 * keeps its layout until the avatar appears.
 */
export function AccountPlaceholder() {
    const { t } = useTranslation();
    return (
        <span
            role="status"
            aria-label={t('googleSigningIn')}
            title={t('googleSigningIn')}
            className="flex h-11 w-11 items-center justify-center"
        >
            <span className="bg-shark-200 dark:bg-shark-600 h-9 w-9 animate-pulse rounded-full" />
        </span>
    );
}

/**
 * CompactAccount - Google account control for the top bar, like most apps: an avatar that opens a
 * menu with the account and Sign out when signed in, and a small Sign in button otherwise. While
 * a saved session is being restored after a reload, an avatar-sized placeholder keeps the top bar
 * from jumping between states.
 */
function CompactAccount({
    isLogin,
    isSigningIn,
    isRestoring = false,
    profile,
    picture,
    onPictureError,
    onSignIn,
    onSignOut,
}: CompactAccountProps) {
    const { t } = useTranslation();

    if (!isLogin && isRestoring) {
        return <AccountPlaceholder />;
    }

    if (!isLogin) {
        return (
            <button
                id="signInBtn"
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                title={t('googleLoginTooltip')}
                className="bg-shark-200 text-matisse-900 hover:bg-curious-blue-300 dark:bg-shark-600 dark:text-shark-100 dark:hover:bg-shark-500 md:bg-shark-100 md:hover:bg-shark-300 md:dark:bg-shark-100 md:dark:hover:bg-shark-300 flex h-11 items-center gap-2 rounded-full px-4 whitespace-nowrap disabled:opacity-60 md:h-8 md:w-8 md:justify-center md:p-0"
            >
                <img src={GoogleLogo} alt="" className="h-5 w-5" />
                <span className="md:sr-only">
                    {isSigningIn ? t('googleSigningIn') : t('gooSignIn')}
                </span>
            </button>
        );
    }

    const avatar = picture ? (
        <img
            className="h-9 w-9 rounded-full object-cover"
            src={picture}
            alt=""
            referrerPolicy="no-referrer"
            onError={onPictureError}
        />
    ) : (
        <span className="bg-curious-blue-600 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white">
            {initials(profile)}
        </span>
    );

    return (
        <NavDropdown id="accountBtn" label={profile.email} icon={avatar}>
            {(close) => (
                <div className="flex flex-col gap-2 px-4 py-2 text-neutral-200">
                    <div className="flex flex-col">
                        <span className="font-semibold">{profile.name}</span>
                        <span className="text-sm opacity-80">{profile.email}</span>
                    </div>
                    <button
                        type="button"
                        role="menuitem"
                        className="hover:bg-matisse-400 dark:hover:bg-shark-500 rounded-md py-1 text-left"
                        onClick={() => {
                            close();
                            onSignOut();
                        }}
                    >
                        {t('gooSignOut')}
                    </button>
                </div>
            )}
        </NavDropdown>
    );
}

export default CompactAccount;
