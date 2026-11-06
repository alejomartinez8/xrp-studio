import { useCallback, useEffect, useRef, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Button from './button';
import AppMgr from '@/managers/appmgr';
import logger from '@/utils/logger';
import { UserProfile } from '@/services/google-auth';
import { useTranslation } from 'react-i18next';
import { Constants } from '@/utils/constants';
import { useGoogleClientId } from '@/utils/google-client-id';
import GoogleLogo from '@assets/images/google-logo.svg';
import { isLocalProjectsEnabled } from '@/utils/offline';
import LocalSession from './local-session';
import CompactAccount, { AccountPlaceholder } from './compact-account';

type LoginProps = {
    logoutCallback: () => void;
    onSuccess: (data: UserProfile) => void;
    /** Top bar version: an avatar menu when signed in, a small sign-in button otherwise. */
    compact?: boolean;
};

const EMPTY_PROFILE: UserProfile = {
    id: '',
    email: '',
    name: '',
    picture: '',
};

type DriveAboutResponse = {
    user?: {
        permissionId?: string;
        emailAddress?: string;
        displayName?: string;
        photoLink?: string;
    };
};

function profileInitials(profile: UserProfile): string {
    const source = profile.name || profile.email;
    if (!source) {
        return '?';
    }
    const parts = source.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

function mapDriveAboutUser(data: DriveAboutResponse): UserProfile | null {
    if (!data.user?.emailAddress) {
        return null;
    }
    return {
        id: data.user.permissionId || data.user.emailAddress,
        email: data.user.emailAddress,
        name: data.user.displayName || '',
        picture: data.user.photoLink || '',
        verified_email: true,
    };
}

function GoogleLoginButton({ logoutCallback, onSuccess, compact }: LoginProps) {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState<boolean>(false);
    const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);
    const [pictureLoadFailed, setPictureLoadFailed] = useState(false);
    const [tooltip, setTooltip] = useState<string>('');
    const restoreStarted = useRef(false);
    const authService = AppMgr.getInstance().authService;
    const [isRestoring, setIsRestoring] = useState<boolean>(
        () => !authService.isLogin && authService.hasSavedSession,
    );
    const driveService = AppMgr.getInstance().driveService;
    const loginLogger = logger.child({ module: 'login' });

    const SCOPE = 'https://www.googleapis.com/auth/drive.file';

    const fetchDriveUserProfile = useCallback(
        async (accessToken: string): Promise<UserProfile | null> => {
            try {
                const res = await fetch(
                    'https://www.googleapis.com/drive/v3/about?fields=user',
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/json',
                        },
                    },
                );
                if (!res.ok) {
                    loginLogger.error(
                        `Drive about API failed: ${res.status} ${res.statusText}`,
                    );
                    return null;
                }
                const data = (await res.json()) as DriveAboutResponse;
                return mapDriveAboutUser(data);
            } catch (err) {
                loginLogger.error(
                    `Error fetching user profile: ${err instanceof Error ? err.message : String(err)}`,
                );
                return null;
            }
        },
        [loginLogger],
    );

    const ensureXrpCodeFolder = useCallback(async () => {
        try {
            const folder = await driveService.findFolderByName(Constants.XRPCODE);
            if (!folder) {
                await driveService.createFolder(Constants.XRPCODE);
            }
        } catch (error) {
            if (error instanceof Error) {
                loginLogger.error(
                    `Error checking or creating XRPCode folder: ${error.stack ?? error.message}`,
                );
            } else {
                loginLogger.error(
                    `Error checking or creating XRPCode folder: ${String(error)}`,
                );
            }
        }
    }, [driveService, loginLogger]);

    const finalizeLogin = useCallback(
        async (profile: UserProfile, accessToken: string) => {
            setUserProfile(profile);
            setPictureLoadFailed(false);
            authService.userProfile = profile;
            authService.isLogin = true;
            setIsLogin(true);
            setIsSigningIn(false);
            driveService.setAccessToken(accessToken);
            authService.onAccessToken = (token) => driveService.setAccessToken(token);
            await ensureXrpCodeFolder();
            onSuccess(profile);
        },
        [authService, driveService, ensureXrpCodeFolder, onSuccess],
    );

    const completeSignIn = useCallback(
        async (code: string) => {
            setIsSigningIn(true);
            try {
                authService.setCode(code);
                const token = await authService.getRefreshToken();
                const profile = await fetchDriveUserProfile(token.access_token);
                if (!profile) {
                    throw new Error('Failed to load user profile');
                }
                await finalizeLogin(profile, token.access_token);
            } catch (error) {
                authService.isLogin = false;
                setIsLogin(false);
                setIsSigningIn(false);
                if (error instanceof Error) {
                    loginLogger.error(
                        `Error during Google sign-in: ${error.stack ?? error.message}`,
                    );
                } else {
                    loginLogger.error(`Error during Google sign-in: ${String(error)}`);
                }
            }
        },
        [authService, fetchDriveUserProfile, finalizeLogin, loginLogger],
    );

    const googleSignIn = useGoogleLogin({
        scope: SCOPE,
        flow: 'auth-code',
        onSuccess: (codeResponse) => {
            void completeSignIn(codeResponse.code);
        },
        onError: (error) => {
            setIsSigningIn(false);
            if (error instanceof Error) {
                loginLogger.error(`Login Failed:' ${error.stack ?? error.message}`);
            } else {
                loginLogger.error(`Login Failed: ${String(error)}`);
            }
        },
    });

    const googleLogout = () => {
        authService.logOut().then(() => {
            setIsLogin(false);
            authService.userProfile = EMPTY_PROFILE;
        });
        setUserProfile(EMPTY_PROFILE);
        setPictureLoadFailed(false);
        setIsSigningIn(false);
        logoutCallback();
    };

    const refreshMissingPicture = useCallback(
        async (accessToken: string) => {
            const profile = await fetchDriveUserProfile(accessToken);
            if (profile?.picture) {
                setUserProfile(profile);
                authService.userProfile = profile;
                setPictureLoadFailed(false);
            }
        },
        [authService, fetchDriveUserProfile],
    );

    useEffect(() => {
        if (!authService.isLogin) {
            setIsLogin(false);
            setTooltip('googleLoginTooltip');
            return;
        }

        setTooltip('googlogoutTooltip');
        const storedProfile = authService.userProfile;
        const accessToken = authService.userInfo.access_token;

        if (storedProfile.email) {
            setIsLogin(true);
            setUserProfile(storedProfile);
            if (accessToken && !storedProfile.picture) {
                void refreshMissingPicture(accessToken);
            }
            return;
        }

        if (accessToken) {
            setIsSigningIn(true);
            void fetchDriveUserProfile(accessToken).then(async (profile) => {
                if (profile) {
                    await finalizeLogin(profile, accessToken);
                } else {
                    authService.isLogin = false;
                    setIsSigningIn(false);
                }
            });
        }
    }, [
        authService.isLogin,
        fetchDriveUserProfile,
        finalizeLogin,
        refreshMissingPicture,
    ]);

    useEffect(() => {
        if (restoreStarted.current || authService.isLogin) {
            return;
        }
        restoreStarted.current = true;
        void authService.restoreSession().then(async (accessToken) => {
            const profile = accessToken ? await fetchDriveUserProfile(accessToken) : null;
            if (accessToken && profile) {
                await finalizeLogin(profile, accessToken);
            }
            setIsRestoring(false);
        });
    }, [authService, fetchDriveUserProfile, finalizeLogin]);

    const showProfileImage = Boolean(userProfile.picture) && !pictureLoadFailed;

    if (compact) {
        return (
            <CompactAccount
                isLogin={isLogin}
                isSigningIn={isSigningIn}
                isRestoring={isRestoring}
                profile={userProfile}
                picture={showProfileImage ? userProfile.picture : undefined}
                onPictureError={() => setPictureLoadFailed(true)}
                onSignIn={googleSignIn}
                onSignOut={googleLogout}
            />
        );
    }

    return (
        <>
            {isLogin && (
                <div className="flex flex-col">
                    <div className="border-1 flex flex-row items-center gap-1 rounded-md bg-mountain-mist-100 p-1 dark:bg-shark-500">
                        {showProfileImage ? (
                            <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={userProfile.picture}
                                alt="User Profile"
                                referrerPolicy="no-referrer"
                                onError={() => setPictureLoadFailed(true)}
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-curious-blue-600 text-sm font-semibold text-white dark:bg-curious-blue-700">
                                {profileInitials(userProfile)}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-mountain-mist-700 dark:text-mountain-mist-100">
                                {userProfile.name}
                            </span>
                            <span className="text-mountain-mist-700 dark:text-mountain-mist-100">
                                {userProfile.email}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col items-end gap-1">
                <Button
                    onClicked={isLogin ? googleLogout : googleSignIn}
                    tooltip={t(tooltip)}
                    disabled={isSigningIn}
                >
                    <img src={GoogleLogo} className="h-8 w-8" />
                    {isSigningIn
                        ? t('googleSigningIn')
                        : isLogin
                          ? t('gooSignOut')
                          : t('gooSignIn')}
                </Button>
            </div>
        </>
    );
}

/**
 * Google sign-in button. Held back until the OAuth client ID has been fetched -
 * useGoogleLogin throws on an empty ID, which would take down the file tree
 * that hosts this widget. In the top bar, a saved session shows the avatar placeholder during
 * that wait, so the bar does not shift when the widget appears.
 */
function Login(props: LoginProps) {
    const clientId = useGoogleClientId();

    if (isLocalProjectsEnabled) {
        return <LocalSession onSuccess={props.onSuccess} />;
    }
    if (clientId) {
        return <GoogleLoginButton {...props} />;
    }
    return props.compact && AppMgr.getInstance().authService.hasSavedSession ? (
        <AccountPlaceholder />
    ) : null;
}

export default Login;
