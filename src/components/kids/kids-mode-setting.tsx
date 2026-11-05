import { useTranslation } from 'react-i18next';

type KidsModeSettingProps = {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
};

/**
 * KidsModeSetting - Settings panel with an on/off switch for kids mode and a short explanation.
 * The change applies after saving, when the app reloads.
 */
function KidsModeSetting({ enabled, onChange }: KidsModeSettingProps) {
    const { t } = useTranslation();

    return (
        <div className="mt-2 flex w-full flex-col gap-3">
            <p className="text-sm text-mountain-mist-700 dark:text-mountain-mist-300">
                {t('kidsMode.description')}
            </p>
            <label className="flex cursor-pointer items-center gap-3">
                <input
                    id="kidsModeSwitch"
                    type="checkbox"
                    role="switch"
                    className="peer sr-only"
                    checked={enabled}
                    onChange={(event) => onChange(event.target.checked)}
                />
                <span className="after:bg-white relative h-8 w-14 rounded-full bg-shark-300 transition-colors after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:transition-transform peer-checked:bg-chateau-green-500 peer-checked:after:translate-x-6 peer-focus-visible:ring-4 peer-focus-visible:ring-curious-blue-400 dark:bg-shark-600" />
                <span className="text-mountain-mist-900 dark:text-mountain-mist-200">
                    {enabled ? t('kidsMode.on') : t('kidsMode.off')}
                </span>
            </label>
            <p className="text-xs text-mountain-mist-600 dark:text-mountain-mist-400">
                {t('kidsMode.reloadNote')}
            </p>
        </div>
    );
}

export default KidsModeSetting;
