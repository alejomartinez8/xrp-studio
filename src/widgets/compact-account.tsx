import { useTranslation } from 'react-i18next';
import { UserProfile } from '@/services/google-auth';
import NavDropdown from '@components/navbar/nav-dropdown';
import GoogleLogo from '@assets/images/google-logo.svg';

type CompactAccountProps = {
    isLogin: boolean;
    isSigningIn: boolean;
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
 * CompactAccount - Google account control for the top bar, like most apps: an avatar that opens a
 * menu with the account and Sign out when signed in, and a small Sign in button otherwise.
 */
function CompactAccount({
    isLogin,
    isSigningIn,
    profile,
    picture,
    onPictureError,
    onSignIn,
    onSignOut,
}: CompactAccountProps) {
    const { t } = useTranslation();

    if (!isLogin) {
        return (
            <button
                id="signInBtn"
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                title={t('googleLoginTooltip')}
                className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-shark-200 px-4 text-matisse-900 hover:bg-curious-blue-300 disabled:opacity-60 dark:bg-shark-600 dark:text-shark-100 dark:hover:bg-shark-500"
            >
                <img src={GoogleLogo} alt="" className="h-5 w-5" />
                <span>{isSigningIn ? t('googleSigningIn') : t('gooSignIn')}</span>
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
        <span className="text-white flex h-9 w-9 items-center justify-center rounded-full bg-curious-blue-600 text-sm font-semibold">
            {initials(profile)}
        </span>
    );

    return (
        <NavDropdown id="accountBtn" label={profile.email} icon={avatar}>
            {(close) => (
                <div className="text-neutral-200 flex flex-col gap-2 px-4 py-2">
                    <div className="flex flex-col">
                        <span className="font-semibold">{profile.name}</span>
                        <span className="text-sm opacity-80">{profile.email}</span>
                    </div>
                    <button
                        type="button"
                        role="menuitem"
                        className="rounded-md py-1 text-left hover:bg-matisse-400 dark:hover:bg-shark-500"
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
