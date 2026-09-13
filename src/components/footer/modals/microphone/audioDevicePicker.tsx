import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { CheckMarkIcon } from '../../../../assets/Icons/CheckMarkIcon';
import { Microphone } from '../../../../assets/Icons/Microphone';
import { getInputMediaDevices } from '../../../../helpers/utils';
import {
  DeviceSessionStorageKeys,
  IMediaDevice,
} from '../../../../store/slices/interfaces/roomSettings';
import MicrophoneLevel from './microphoneLevel';
import SpeakerTest from './speakerTest';
import { useMicrophonePreview } from './useMicrophonePreview';
import {
  getStoredAudioDeviceId,
  isLikelyVirtualOrLoopback,
  resolveInitialDeviceId,
  sortAudioDevices,
} from './deviceUtils';

export interface AudioDevicePickerValue {
  deviceId: string;
  devices: IMediaDevice[];
}

interface AudioDevicePickerProps {
  value: string;
  onChange: (deviceId: string) => void;
  onDevices?: (devices: IMediaDevice[]) => void;
  /** Pre-enumerated list (e.g. landing already asked permission) — avoids a second getUserMedia. */
  initialDevices?: IMediaDevice[];
  previewEnabled?: boolean;
  id?: string;
}

const AudioDevicePicker = ({
  value,
  onChange,
  onDevices,
  initialDevices,
  previewEnabled = true,
  id = 'microphone',
}: AudioDevicePickerProps) => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<IMediaDevice[]>(() =>
    initialDevices ? sortAudioDevices(initialDevices) : [],
  );
  const [loading, setLoading] = useState(!initialDevices);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Retry key: forces the preview hook to tear down + re-open the stream
  // for the currently selected mic (e.g. after a failure).
  const [previewRetryKey, setPreviewRetryKey] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onDevicesRef = useRef(onDevices);
  onDevicesRef.current = onDevices;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const applyDevices = useCallback((list: IMediaDevice[]) => {
    const sorted = sortAudioDevices(list);
    setDevices(sorted);
    onDevicesRef.current?.(sorted);

    const current = valueRef.current;
    if (!current) {
      let stored: string | null = null;
      try {
        stored =
          sessionStorage.getItem(DeviceSessionStorageKeys.AUDIO_DEVICE) ??
          getStoredAudioDeviceId();
      } catch {
        stored = getStoredAudioDeviceId();
      }
      const initial = resolveInitialDeviceId(sorted, stored);
      if (initial) {
        onChangeRef.current(initial);
      }
    } else if (!sorted.some((d) => d.id === current)) {
      // previously stored mic unplugged: force explicit re-pick,
      // never silently fall back to [0]
      onChangeRef.current('');
    }
  }, []);

  const initialDevicesRef = useRef(initialDevices);
  useEffect(() => {
    // Use pre-enumerated devices on first open only (no extra getUserMedia).
    // Refresh button re-enumerates from hardware. Effect is intentionally
    // refreshKey-only so parent onDevices updates don't re-trigger it.
    const seed = refreshKey === 0 ? initialDevicesRef.current : undefined;
    if (seed && seed.length) {
      applyDevices(seed);
      setLoading(false);
      return;
    }
    let disposed = false;
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const input = await getInputMediaDevices('audio');
        if (disposed) {
          return;
        }
        applyDevices(input.audio);
      } catch (e) {
        console.warn('failed to load microphones', e);
        if (!disposed) {
          setLoadError(true);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      disposed = true;
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // The meter tests ONLY the selected mic: selecting a row opens its
  // stream. Hover/focus never touches hardware.
  const previewId = value;
  const previewKey = `${previewId}::${previewRetryKey}`;

  const { level, active, error } = useMicrophonePreview(
    previewEnabled ? previewId : '',
    previewEnabled && !!previewId,
    previewKey,
  );
  const retryPreview = useCallback(() => {
    setPreviewRetryKey((k) => k + 1);
  }, []);

  const labelled = useMemo(
    () =>
      devices.map((d) => ({
        ...d,
        virtual: isLikelyVirtualOrLoopback(d.label),
        display: d.label || t('footer.modal.mic-unknown-label'),
      })),
    [devices, t],
  );

  // Refresh keeps prior list on screen + shows inline spinner in the
  // refresh button (no skeleton swap = no layout jump).
  const refreshing = loading && devices.length > 0;

  if (loading && devices.length === 0) {
    return (
      <div className="grid gap-3" aria-live="polite">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-Gray-100 dark:bg-Gray-800" />
          <div className="h-4 w-20 animate-pulse rounded bg-Gray-100 dark:bg-Gray-800" />
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[52px] animate-pulse rounded-xl bg-Gray-100 dark:bg-Gray-800"
          />
        ))}
        <p className="text-xs text-Gray-500 dark:text-Gray-400">
          {t('footer.modal.mic-loading')}
        </p>
      </div>
    );
  }

  if (loadError || devices.length === 0) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-Red-500" role="alert">
          {t('footer.modal.mic-not-found')}
        </p>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="h-9 w-max rounded-[10px] border border-Gray-300 dark:border-Gray-700 px-3 text-xs font-semibold text-Gray-800 dark:text-white hover:bg-Gray-50 dark:hover:bg-Gray-700 focus-ring cursor-pointer"
        >
          {t('footer.modal.mic-retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3" id={id}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-Gray-500 dark:text-Gray-400">
          {t('footer.modal.select-microphone')}
        </span>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold text-Blue2-600 dark:text-Blue2-400 hover:underline focus-ring rounded cursor-pointer disabled:cursor-wait disabled:opacity-70"
        >
          {refreshing && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-Blue2-400 border-t-transparent"
              aria-hidden="true"
            />
          )}
          {t('footer.modal.mic-refresh')}
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label={t('footer.modal.select-microphone')}
        className="grid max-h-56 gap-1.5 overflow-auto scrollBar pe-0.5"
      >
        {labelled.map((d) => {
          const selected = value === d.id;
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(d.id)}
              title={d.display}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-start transition-all duration-150 focus-ring ${
                selected
                  ? 'border-Blue2-500 dark:border-Blue2-400 bg-Blue2-50 dark:bg-dark-secondary2'
                  : 'border-Gray-200 dark:border-Gray-700 bg-white dark:bg-transparent hover:border-Gray-300 dark:hover:border-Gray-600 hover:bg-Gray-50 dark:hover:bg-dark-secondary2'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected
                    ? 'border-Blue2-600 dark:border-Blue2-400'
                    : 'border-Gray-300 dark:border-Gray-600'
                }`}
                aria-hidden="true"
              >
                {selected && (
                  <span className="h-2 w-2 rounded-full bg-Blue2-600 dark:bg-Blue2-400" />
                )}
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-Gray-100 dark:bg-Gray-800 text-Gray-600 dark:text-Gray-300">
                <Microphone classes="h-3.5 w-auto" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  dir="ltr"
                  className="block truncate text-sm font-medium text-Gray-900 dark:text-white"
                >
                  {d.display}
                </span>
                {d.virtual && (
                  <span className="block text-[11px] font-medium text-Amber-600 dark:text-Amber-400">
                    {t('footer.modal.mic-virtual-hint')}
                  </span>
                )}
              </span>
              {selected && (
                <span className="shrink-0 text-Blue2-600 dark:text-Blue2-400">
                  <CheckMarkIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!value && (
        <p className="text-xs text-Gray-500 dark:text-Gray-400" role="note">
          {t('footer.modal.mic-choose-prompt')}
        </p>
      )}

      {/* One shared meter: tests ONLY the selected mic. */}
      <MicrophoneLevel
        level={level}
        active={active}
        failed={!!error && !!previewId}
        hasSelection={!!previewId}
        onRetry={error ? retryPreview : undefined}
      />

      {/* Output check lives in its own separated section. */}
      <SpeakerTest />
    </div>
  );
};

export default AudioDevicePicker;
