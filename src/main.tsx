import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import '@/theme/github/app.css';
import '@/utils/i18n';
import { applyBlocklyLocale } from '@/utils/blockly-locales';
import i18n from '@/utils/i18n';
import '@/utils/blockly-global'; // Expose Blockly globally for external plugins
import { initAiBuddyAccess } from '@/utils/aiBuddyAccess';
import App from '@/App.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleClientIdContext } from '@/utils/google-client-id';
import { ThemeInit } from '../.flowbite-react/init';
import { isOfflineBuild } from '@/utils/offline';
import { startPwa } from '@/utils/pwa';
import { isSafeToReload, watchProgramRunning } from '@/utils/safe-to-reload';
import { startAutosave } from '@/utils/autosave';
import { startAccounts } from '@/utils/accounts';

initAiBuddyAccess();
watchProgramRunning();
startPwa(undefined, isSafeToReload);
startAutosave();
startAccounts();
applyBlocklyLocale(i18n.language);

function Root() {
    const [googleClientId, setGoogleClientId] = useState<string>('');
    const googleAuthBackendUrl = import.meta.env.GOOGLE_AUTH_URL;

    useEffect(() => {
        // debug mode via environment to turn on debug-screens class
        if (import.meta.env.DEV) {
            document.body.classList.add('debug-screens');
        }

        if (isOfflineBuild) {
            return;
        }
        if (!googleAuthBackendUrl) {
            console.warn('GOOGLE_AUTH_URL is not set - Google sign-in is disabled.');
            return;
        }
        const fetchClientId = async () => {
            try {
                const response = await fetch(`${googleAuthBackendUrl}/google-auth/client-id`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch client ID: ${response.statusText}`);
                }
                const data = await response.json();
                setGoogleClientId(data.client_id ?? '');
            } catch (error) {
                // The IDE stays usable without Google - only Drive sign-in is lost.
                console.error('Error fetching Google Client ID:', error);
            }
        };
        fetchClientId();
    }, [googleAuthBackendUrl]);

    return (
        <StrictMode>
            <ThemeInit />
            <GoogleClientIdContext.Provider value={googleClientId}>
                {isOfflineBuild ? (
                    <App />
                ) : (
                    <GoogleOAuthProvider clientId={googleClientId}>
                        <App />
                    </GoogleOAuthProvider>
                )}
            </GoogleClientIdContext.Provider>
        </StrictMode>
    );
}

createRoot(document.getElementById('root')!).render(<Root />);
