import { useEffect, useRef } from 'react';
import { UserProfile } from '@/services/google-auth';
import { startMyProjects } from '@/utils/local-projects';

type LocalSessionProps = {
    onSuccess: (data: UserProfile) => void;
};

/**
 * LocalSession - replaces the Google sign-in button when My projects is enabled. Renders nothing;
 * on mount it opens the My projects session (projects kept in this browser, see LocalDriveService)
 * so the file tree, open, save and run all work without an account or a network.
 */
function LocalSession({ onSuccess }: LocalSessionProps) {
    const onSuccessRef = useRef(onSuccess);

    useEffect(() => {
        void startMyProjects().then((profile) => onSuccessRef.current(profile));
    }, []);

    return null;
}

export default LocalSession;
