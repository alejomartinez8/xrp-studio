import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlug, FaTrash, FaPen, FaCheck, FaPaperPlane } from 'react-icons/fa';
import AppMgr, { EventType } from '@/managers/appmgr';
import { CustomVarMeta, NetworkTable } from '@/managers/tablemgr';
import { useGridStackWidget } from '../hooks/useGridStackWidget';
import { sendVariableUpdate, varTypeName } from '../utils/xppUtils';
import SensorCard from './SensorCard';

interface CustomVariableWidgetProps {
  /** Optional initial variable name (from saved layout) */
  initialVarName?: string;
}

/**
 * A bidirectional custom variable widget for XPP puppet protocol variables.
 */
const CustomVariableWidget: React.FC<CustomVariableWidgetProps> = ({
  initialVarName = '',
}) => {
  const { handleDelete } = useGridStackWidget();

  // Variable name the user is targeting
  const [varName, setVarName] = useState(initialVarName);
  const [isEditingName, setIsEditingName] = useState(!initialVarName);
  const [nameInput, setNameInput] = useState(initialVarName);

  // Live data from XRP
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [varMeta, setVarMeta] = useState<CustomVarMeta | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

  // User input for sending back
  const [editValue, setEditValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  // Available custom variable names (for suggestions)
  const [availableVars, setAvailableVars] = useState<string[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Listen to NetworkTable updates
  useEffect(() => {
    const handleData = (data: string) => {
      try {
        const table: NetworkTable = JSON.parse(data);
        const meta = table.__customVarMeta as Record<string, CustomVarMeta> | undefined;

        // Update available variables list
        if (meta) {
          setAvailableVars(Object.keys(meta));
        }

        // If we have a target variable name, check if it exists
        if (varName && meta && meta[varName]) {
          setVarMeta(meta[varName]);
          const value = table[varName];
          if (typeof value === 'number') {
            setCurrentValue(value);
            setLastUpdated(new Date().toISOString());
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    AppMgr.getInstance().on(EventType.EVENT_DASHBOARD_DATA, handleData);
    return () => {
    };
  }, [varName]);

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  const confirmName = useCallback(() => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setVarName(trimmed);
      setIsEditingName(false);
      setCurrentValue(null);
      setVarMeta(null);
      setSendStatus('idle');
    }
  }, [nameInput]);

  const handleSendValue = useCallback(async () => {
    if (!varMeta || editValue === '') return;

    const numValue = Number(editValue);
    if (isNaN(numValue)) return;

    setIsSending(true);
    setSendStatus('idle');

    const ok = await sendVariableUpdate(varMeta, numValue);
    setSendStatus(ok ? 'ok' : 'err');
    setIsSending(false);

    if (ok) {
      setEditValue('');
      // Clear status after a moment
      setTimeout(() => setSendStatus('idle'), 1500);
    }
  }, [varMeta, editValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendValue();
    }
  }, [handleSendValue]);

  const isConnected = varMeta !== null;
  const typeLabel = varMeta ? varTypeName(varMeta.type) : '';

  return (
    <SensorCard
      title={varName || 'Custom Variable'}
      icon={<FaPlug size={12} />}
      onStart={() => { }}
      onStop={() => { }}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
    >
      <div className="absolute top-1 right-2">
        <button
          onClick={handleDelete}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm transition-colors duration-200"
          title="Delete widget"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col justify-center gap-1 px-1">
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              placeholder="variable_name"
              list="custom-var-suggestions"
              className="min-w-0 flex-1 rounded-sm border border-mountain-mist-300 bg-mountain-mist-50 px-2 py-1 font-mono text-sm text-shark-900 focus:outline-hidden focus:ring-2 focus:ring-curious-blue-400 dark:border-shark-600 dark:bg-shark-800 dark:text-shark-50"
            />
            <datalist id="custom-var-suggestions">
              {availableVars.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <button
              onClick={confirmName}
              className="rounded-sm p-1.5 text-chateau-green-700 hover:bg-chateau-green-50"
              title="Confirm"
            >
              <FaCheck size={12} />
            </button>
          </div>
        ) : null}
        {!varName ? (
          <div className="flex flex-1 items-center justify-center text-xs text-mountain-mist-600 dark:text-mountain-mist-300">
            Enter a variable name above
          </div>
        ) : !isConnected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <div className="text-center text-xs text-mountain-mist-600 dark:text-mountain-mist-300">
              Waiting for <code className="rounded-sm bg-mountain-mist-200 px-1 font-mono dark:bg-shark-700">{varName}</code>
            </div>
            {availableVars.length > 0 && (
              <div className="text-center text-xs text-mountain-mist-600 dark:text-mountain-mist-300">
                {availableVars.map((v, i) => (
                  <button
                    key={v}
                    onClick={() => { setVarName(v); setNameInput(v); setIsEditingName(false); }}
                    className="mx-0.5 font-mono text-curious-blue-600 hover:underline"
                  >
                    {v}{i < availableVars.length - 1 ? ',' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-lg font-bold text-shark-900 dark:text-shark-50">
                {currentValue !== null ? currentValue.toFixed(
                  varMeta.type === 2 ? 4 : 0
                ) : '—'}
              </span>
              {typeLabel && (
                <span className="rounded-sm bg-mountain-mist-200 px-1.5 py-0.5 text-xs text-mountain-mist-700 dark:bg-shark-700 dark:text-mountain-mist-200">
                  {typeLabel}
                </span>
              )}
              <button
                onClick={() => { setIsEditingName(true); setNameInput(varName); }}
                className="rounded-sm p-1 text-mountain-mist-500 hover:bg-mountain-mist-200 hover:text-shark-700 dark:text-mountain-mist-300 dark:hover:bg-shark-700 dark:hover:text-shark-50"
                title="Change variable name"
              >
                <FaPen size={10} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Send ${typeLabel}`}
                step={varMeta.type === 2 ? 'any' : '1'}
                className="min-w-0 flex-1 rounded-sm border border-mountain-mist-300 bg-mountain-mist-50 px-2 py-1 font-mono text-xs text-shark-900 focus:outline-hidden focus:ring-2 focus:ring-curious-blue-400 dark:border-shark-600 dark:bg-shark-800 dark:text-shark-50"
              />
              <button
                onClick={handleSendValue}
                disabled={isSending || editValue === ''}
                className={`rounded p-1.5 transition-colors duration-200 ${sendStatus === 'ok'
                  ? 'text-chateau-green-600'
                  : sendStatus === 'err'
                    ? 'text-cinnabar-600'
                    : 'text-curious-blue-600 hover:text-curious-blue-800'
                  } disabled:opacity-40`}
                title="Send to XRP"
              >
                {sendStatus === 'ok' ? <FaCheck size={12} /> : <FaPaperPlane size={12} />}
              </button>
            </div>
          </>
        )}
      </div>
    </SensorCard>
  );
};

export default CustomVariableWidget;