import { useEffect, useRef } from 'react';
import './App.css';
import Navbar from '@components/navbar';
import XRPLayout from '@components/xrplayout';
import AppMgr from '@/managers/appmgr';
import { prefetchPythonEditor } from '@components/python/prefetch-python-editor';
import StatusBar from '@components/status-bar';
import AskDialog from '@components/ask-dialog';

function App() {
    const xrpLayoutRef = useRef(undefined);
    const appMgrRef = useRef<AppMgr>(undefined);

    /**
     * Initialize AppMgr instance and its dependencies
     */
    useEffect(() => {
        if (!appMgrRef.current) {
            appMgrRef.current = AppMgr.getInstance();
            appMgrRef.current.start();
        }
    }, []);

    /**
     * Download the Python editor in the background once the app is idle (spec 001).
     */
    useEffect(() => prefetchPythonEditor(), []);

    return (
        <>
            <header className="sticky top-0 z-50 bg-curious-blue-700 dark:bg-[var(--app-frame)]">
                <Navbar layoutref={xrpLayoutRef} />
            </header>
            <main className="app-main relative">
                <XRPLayout forwardedref={xrpLayoutRef} />
            </main>
            <StatusBar />
            <AskDialog />
        </>
    );
}

export default App;
