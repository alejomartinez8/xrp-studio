import { useEffect } from 'react';
import AppMgr from '@/managers/appmgr';
import { UserProfile } from '@/services/google-auth';
import { Constants } from '@/utils/constants';
import LocalDriveService from '@/services/local-drive';

const LOCAL_PROFILE: UserProfile = {
    id: 'local',
    email: 'local@xrp-studio',
    name: 'XRP Studio',
    picture: '',
};

type LocalSessionProps = {
    onSuccess: (data: UserProfile) => void;
};

/**
 * LocalSession - offline replacement for the Google sign-in button. Renders nothing; on mount it
 * "signs in" to the browser-backed drive (see LocalDriveService) so the file tree, open, save and
 * run all work without an account or a network, like MakeCode's local projects.
 */
function LocalSession({ onSuccess }: LocalSessionProps) {
    useEffect(() => {
        const appMgr = AppMgr.getInstance();
        const start = async () => {
            await (appMgr.driveService as LocalDriveService).ensureRootFolder(Constants.XRPCODE);
            appMgr.authService.userProfile = LOCAL_PROFILE;
            appMgr.authService.isLogin = true;
            onSuccess(LOCAL_PROFILE);
        };
        void start();
        // run once per mount; onSuccess identity changes on every parent render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

export default LocalSession;
