import { useState } from 'react';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FaChartLine, FaHashtag, FaCog, FaTrash } from 'react-icons/fa';
import { FlowBiteConstants } from '@/utils/constants';
import { useTranslation } from 'react-i18next';
import SensorCard from './SensorCard';
import { useGridStackWidget } from '../hooks/useGridStackWidget';
import { useSensorHistory } from '../hooks/useSensorHistory';
import { SensorConfig, SensorChannel } from './types';

interface SensorWidgetProps<TData, THistoryEntry> {
  config: SensorConfig<TData, THistoryEntry>;
  /** Initial display mode; defaults to data view for new widgets. */
  initialViewMode?: 'data' | 'graph';
}

export type DashboardViewMode = 'data' | 'graph';

/**
 * Default number view: renders a responsive grid of channel values.
 * Used when a sensor config doesn't provide a custom renderNumberView.
 */
function DefaultNumberView<TData>({
  data,
  channels,
}: {
  data: TData;
  channels: SensorChannel[];
}) {
  const cols = channels.length <= 3 ? channels.length : Math.min(4, channels.length);
  return (
    <div
      className="grid gap-1 text-center px-1 py-0 leading-tight"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {channels.map((ch) => {
        const value = (data as Record<string, number>)[ch.key];
        return (
          <div key={ch.key} className="flex flex-col items-center justify-center">
            <span className="text-xs font-medium" style={{ color: ch.color }}>
              {ch.label}
            </span>
            <span className="font-mono text-base text-shark-900 dark:text-shark-50">
              {typeof value === 'number' ? value.toFixed(ch.decimals ?? 2) : value}
            </span>
            {ch.unit && (
              <span className="text-xs text-mountain-mist-600 dark:text-mountain-mist-300">{ch.unit}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Generic sensor widget that handles all shared UI logic:
 */
function SensorWidget<TData, THistoryEntry>({
  config,
  initialViewMode = 'data',
}: SensorWidgetProps<TData, THistoryEntry>) {
  const { t } = useTranslation();
  const { handleDelete } = useGridStackWidget();
  const [viewMode, setViewMode] = useState<DashboardViewMode>(initialViewMode);

  const {
    currentData,
    lastUpdated,
    history,
    handleStart,
    handleStop,
    requestSensors,
  } = useSensorHistory<TData, THistoryEntry>(
    config.sensorName,
    config.toHistoryEntry
  );

  const handleViewChange = (mode: DashboardViewMode) => {
    setViewMode(mode);
    requestSensors([config.sensorName]);
  };

  // Always show either data or graph — never a blank content area. Graph mode
  // requires history; until then, fall back to the data view.
  const displayMode: DashboardViewMode =
    viewMode === 'graph' && history.length > 0 ? 'graph' : 'data';

  const tooltipFormatter = config.tooltipFormatter
    ?? ((value: number) => value.toFixed(2));

  const sensorCardProps = {
    title: t(config.titleKey),
    icon: config.icon,
    onStart: handleStart,
    onStop: handleStop,
    isConnected: true,
    lastUpdated,
  };

  return (
    <SensorCard {...sensorCardProps}>
      <div className="absolute top-1 right-2 flex items-center space-x-1">
        <Dropdown
          label={<FaCog size={12} />}
          inline
          theme={{
            ...FlowBiteConstants.DropdownTheme,
            inlineWrapper:
              'inline-flex items-center rounded-sm border border-mountain-mist-300 bg-mountain-mist-100 p-1 text-shark-700 dark:border-shark-600 dark:bg-shark-800 dark:text-shark-100',
          }}
        >
          <DropdownItem onClick={() => handleViewChange('graph')}>
            <div className="flex items-center space-x-2">
              <FaChartLine size={12} />
              <span>{t('graph')}</span>
            </div>
          </DropdownItem>
          <DropdownItem onClick={() => handleViewChange('data')}>
            <div className="flex items-center space-x-2">
              <FaHashtag size={12} />
              <span>{t('data')}</span>
            </div>
          </DropdownItem>
        </Dropdown>

        <button
          onClick={handleDelete}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm transition-colors duration-200"
          title="Delete widget"
        >
          <FaTrash size={12} />
        </button>
      </div>

      {/* Content */}
      {!currentData ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-mountain-mist-600 dark:text-mountain-mist-300">
            {t('no-data-available')}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col justify-center">
          {displayMode === 'graph' ? (
            <div className="mt-4 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(history as Record<string, unknown>[]).slice(-50)}>
                    <XAxis dataKey="timestamp" tick={false} label={t('time')} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value as number).toLocaleTimeString()
                      }
                      formatter={(value) =>
                        typeof value === 'number' ? tooltipFormatter(value) : value
                      }
                    />
                    {config.channels.map((ch) => (
                      <Line
                        key={ch.key}
                        type="monotone"
                        dataKey={ch.key}
                        stroke={ch.color}
                        dot={false}
                        name={ch.label}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 text-center text-xs text-mountain-mist-600 dark:text-mountain-mist-300">
                  {history.length} {t('readings-stored')}
                </div>
              </div>
          ) : config.renderNumberView ? (
            config.renderNumberView(currentData, config.channels)
          ) : (
            <DefaultNumberView data={currentData} channels={config.channels} />
          )}
        </div>
      )}
    </SensorCard>
  );
}

export default SensorWidget;
