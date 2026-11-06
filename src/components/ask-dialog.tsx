import { useTranslation } from 'react-i18next';
import { answer, useQuestion } from '@/utils/ask';

/**
 * AskDialog - shows the question asked with `ask()` (spec 005) as a modal card: title, message
 * and one button per answer. There is no close button: every question needs an answer.
 */
function AskDialog() {
    const { t } = useTranslation();
    const question = useQuestion();

    if (!question) {
        return null;
    }
    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-mountain-mist-500/40 p-4">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="ask-title"
                aria-describedby="ask-message"
                data-testid="ask-dialog"
                className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-mountain-mist-300 bg-mountain-mist-50 p-6 shadow-lg dark:border-shark-600 dark:bg-shark-950"
            >
                <h1
                    id="ask-title"
                    className="text-lg font-bold text-mountain-mist-800 dark:text-mountain-mist-200"
                >
                    {t(question.title, question.values)}
                </h1>
                <p id="ask-message" className="text-mountain-mist-900 dark:text-mountain-mist-300">
                    {t(question.message, question.values)}
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                    {question.choices.map((choice) => (
                        <button
                            key={choice.value}
                            type="button"
                            onClick={() => answer(choice.value)}
                            className={
                                choice.primary
                                    ? 'rounded-md bg-curious-blue-600 px-4 py-2 font-semibold text-shark-50 hover:bg-curious-blue-500'
                                    : 'rounded-md border border-mountain-mist-400 px-4 py-2 text-mountain-mist-800 hover:bg-mountain-mist-100 dark:border-shark-500 dark:text-mountain-mist-200 dark:hover:bg-shark-800'
                            }
                        >
                            {t(choice.label)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AskDialog;
