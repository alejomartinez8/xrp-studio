import { ComponentProps, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

const MonacoEditor = lazy(() => import('@components/MonacoEditor'));

/**
 * The Python editor (Monaco, Pyright and the VS Code services, about 13 MB) loaded on demand.
 * Importing `MonacoEditor` directly put it in the first download of every visit, even for children
 * who only use blocks; this wrapper downloads it the first time a Python tab or the Python view
 * opens, and shows a short message meanwhile.
 */
function LazyMonacoEditor(props: ComponentProps<typeof MonacoEditor>) {
    const { t } = useTranslation();
    return (
        <Suspense
            fallback={
                <div className="flex h-full w-full items-center justify-center text-shark-600 dark:text-mountain-mist-300">
                    {t('pythonEditorLoading')}
                </div>
            }
        >
            <MonacoEditor {...props} />
        </Suspense>
    );
}

export default LazyMonacoEditor;
