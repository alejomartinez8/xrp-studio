import { useEffect, useRef } from 'react';
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
 * run all work without an account or a network.
 */
function LocalSession({ onSuccess }: LocalSessionProps) {
    const onSuccessRef = useRef(onSuccess);

    useEffect(() => {
        const appMgr = AppMgr.getInstance();
        const start = async () => {
            await (appMgr.driveService as LocalDriveService).ensureRootFolder(Constants.XRPCODE);
            appMgr.authService.userProfile = LOCAL_PROFILE;
            appMgr.authService.isLogin = true;
            onSuccessRef.current(LOCAL_PROFILE);
        };
        void start();
    }, []);

    return null;
}

export default LocalSession;
