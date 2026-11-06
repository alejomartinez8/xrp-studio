import { useEffect, useRef } from 'react';
import './App.css';
import Navbar from '@components/navbar';
import XRPLayout from '@components/xrplayout';
import AppMgr from '@/managers/appmgr';
import { prefetchPythonEditor } from '@components/python/prefetch-python-editor';

function App() {
    const xrpLayoutRef = useRef();
    const appMgrRef = useRef<AppMgr>();

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
     * Download the Python editor in the background once the app is idle (spec 014).
     */
    useEffect(() => prefetchPythonEditor(), []);

    return (
        <>
            <header className="bg-curious-blue-700 dark:bg-mountain-mist-950">
                <Navbar layoutref={xrpLayoutRef} />
            </header>
            <main className="relative h-[calc(100vh-56px)]">
                <XRPLayout forwardedref={xrpLayoutRef} />
            </main>
        </>
    );
}

export default App;
