import { prefetchWhenIdle } from '@/utils/idle-prefetch';

/**
 * Download the Python editor (the same chunk `lazy-monaco-editor.tsx` loads) in the background
 * once the app has loaded and is idle, so it is usually ready when a child opens Python, without
 * making the first load heavier. Skipped on slow or metered connections. Returns a function that
 * cancels it if it has not started.
 */
export function prefetchPythonEditor(): () => void {
    return prefetchWhenIdle(() => import('@components/MonacoEditor'));
}
