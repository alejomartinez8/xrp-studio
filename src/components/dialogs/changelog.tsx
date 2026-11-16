import { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { useTranslation } from 'react-i18next';
import {
    APP_UPSTREAM_VERSION,
    APP_VERSION_TEXT,
    changelogUrl as forkChangelogUrl,
} from '@/utils/version';

type changelogProps = {
    /**
     * A function to close the dialog.
     */
    closeDialog: () => void;
    /**
     * Optional URL of the changelog file to fetch. Defaults to the fork's own Change Log in the
     * current language; XRPWeb's CHANGELOG.md stays in the site, unused.
     */
    changelogUrl?: string;
};

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
});

/**
 * ChangeLogDlg - A component that displays the changelog of the application.
 * @returns ChangeLogDlg
 */
function ChangeLogDlg({ closeDialog, changelogUrl }: changelogProps) {
    const { t, i18n } = useTranslation();
    const url = changelogUrl ?? forkChangelogUrl(i18n.language);
    const [markdown, setMarkdown] = useState<string>('');

    useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch(url);
            if (!response.ok) {
                console.error('Failed to fetch changelog:', response.statusText);
                return;
            }
            const text = await response.text();
            // Convert the text to HTML using markdown-it
            const html = md.render(text);
            setMarkdown(html);
        };
        fetchMarkdown();
    }, [url]);

    return (
        <>
            <div
                id="default-modal"
                className="h-[calc(100%-1rem)] max-h-full w-full items-center justify-center overflow-hidden md:inset-0"
            >
                <div className="relative max-h-full w-full max-w-2xl">
                    <div className="relative rounded-lg bg-white shadow-xs dark:bg-gray-700">
                        {/* Modal header */}
                        <div className="flex items-center justify-between rounded-t border-b border-gray-200 md:p-4 dark:border-gray-600">
                            <h3 className="text-2xl font-semibold text-gray-400 dark:text-white">
                                {t('changeLog')}
                            </h3>
                            <button
                                type="button"
                                onClick={closeDialog}
                                className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
                            >
                                <svg
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 14 14"
                                >
                                    <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                                    />
                                </svg>
                            </button>
                        </div>
                        <p
                            data-testid="about-version"
                            className="px-4 pt-2 text-sm text-gray-500 dark:text-gray-300"
                        >
                            {APP_VERSION_TEXT}
                            {APP_UPSTREAM_VERSION &&
                                ` · ${t('version.basedOn', { version: APP_UPSTREAM_VERSION })}`}
                        </p>
                        {/* Modal body */}
                        <div className="max-h-[85vh] overflow-x-hidden overflow-y-auto p-4">
                            <div className="prose prose-lg max-[767px]:prose dark:prose-invert prose-headings:font-semibold prose-h1:text-curious-blue-600 prose-h2:text-curious-blue-700 prose-h3:text-curious-blue-800 prose-p:leading-relaxed prose-p:text-mountain-mist-800 prose-a:text-curious-blue-600 prose-a:hover:text-curious-blue-700 prose-strong:text-mountain-mist-900 prose-code:bg-curious-blue-50 prose-code:text-curious-blue-700 prose-ol:my-4 prose-ul:my-4 prose-li:text-mountain-mist-800 dark:prose-li:text-mountain-mist-300">
                                <div dangerouslySetInnerHTML={{ __html: markdown }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default ChangeLogDlg;
