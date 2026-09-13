import { useCallback, useEffect, useState } from 'react';
import {
  DeviceSessionStorageKeys,
  IMediaDevice,
} from '../../../store/slices/interfaces/roomSettings';
import {
  getInputMediaDevices,
  inputMediaDeviceKind,
} from '../../../helpers/utils';
import { useAppDispatch } from '../../../store';
import { updateVirtualBackground } from '../../../store/slices/roomSettingsSlice';
import { BackgroundConfig } from '../../../helpers/libs/TrackProcessor';
import {
  getFirstRealVideoDeviceId,
  getStoredAudioDeviceId,
  getStoredVideoDeviceId,
  resolveInitialDeviceId,
  resolveStoredOrFirstRealAudio,
  resolveStoredOrFirstRealVideo,
  sortAudioDevices,
  sortVideoDevices,
} from '../../footer/modals/microphone/deviceUtils';

export const useMediaDevices = () => {
  const dispatch = useAppDispatch();
  const [audioDevices, setAudioDevices] = useState<IMediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<IMediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');

  const enableMediaDevices = useCallback(
    async (
      kind: inputMediaDeviceKind = 'both',
      opts?: { quickEnable?: boolean },
    ) => {
      const inputDevices = await getInputMediaDevices(kind);
      const quickEnable = opts?.quickEnable ?? false;

      if (
        inputDevices.audio.length > 0 &&
        (kind === 'both' || kind === 'audio')
      ) {
        const sorted = sortAudioDevices(inputDevices.audio);
        setAudioDevices(sorted);
        if (!selectedAudioDevice) {
          const stored = getStoredAudioDeviceId();
          if (quickEnable) {
            // "Enable mic+cam" quick path: stored id or first real mic, no popup.
            setSelectedAudioDevice(
              resolveStoredOrFirstRealAudio(sorted, stored),
            );
          } else {
            // Never auto-pick sorted[0]: it is often a monitor/loopback.
            // Only restore an explicitly stored id; else force manual choice.
            const initial = resolveInitialDeviceId(sorted, stored);
            if (initial) {
              setSelectedAudioDevice(initial);
            }
          }
        } else if (
          !sorted.some((device) => device.id === selectedAudioDevice)
        ) {
          // remembered mic unplugged: clear so user must explicitly re-pick
          setSelectedAudioDevice('');
        }
      }
      if (
        inputDevices.video.length > 0 &&
        (kind === 'both' || kind === 'video')
      ) {
        const sorted = sortVideoDevices(inputDevices.video);
        setVideoDevices(sorted);
        if (!selectedVideoDevice) {
          const stored = getStoredVideoDeviceId();
          if (quickEnable) {
            // "Enable mic+cam" quick path: stored id or first real cam, no popup.
            setSelectedVideoDevice(
              resolveStoredOrFirstRealVideo(sorted, stored),
            );
          } else if (stored && sorted.some((device) => device.id === stored)) {
            setSelectedVideoDevice(stored);
          } else if (sorted.length > 0) {
            setSelectedVideoDevice(sorted[0].id);
          }
        } else if (
          !sorted.some((device) => device.id === selectedVideoDevice)
        ) {
          // remembered device is no longer available; fall back to the first real one
          setSelectedVideoDevice(getFirstRealVideoDeviceId(sorted));
        }
      }
    },
    [selectedAudioDevice, selectedVideoDevice],
  );

  useEffect(() => {
    const audioDevice = sessionStorage.getItem(
      DeviceSessionStorageKeys.AUDIO_DEVICE,
    );
    if (audioDevice) {
      setSelectedAudioDevice(audioDevice);
      void enableMediaDevices('audio');
    }

    const videoDevice = sessionStorage.getItem(
      DeviceSessionStorageKeys.VIDEO_DEVICE,
    );
    if (videoDevice) {
      setSelectedVideoDevice(videoDevice);
      void enableMediaDevices('video');

      try {
        const stored = sessionStorage.getItem(
          DeviceSessionStorageKeys.VIRTUAL_BACKGROUND,
        );
        if (stored) {
          const parsed = JSON.parse(stored) as BackgroundConfig;
          if (parsed?.type && parsed.type !== 'none') {
            dispatch(updateVirtualBackground(parsed));
          }
        }
      } catch {}
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disableWebcam = useCallback(() => {
    setVideoDevices([]);
    setSelectedVideoDevice('');
    sessionStorage.removeItem(DeviceSessionStorageKeys.VIDEO_DEVICE);
  }, []);

  const disableMic = useCallback(() => {
    setAudioDevices([]);
    setSelectedAudioDevice('');
    sessionStorage.removeItem(DeviceSessionStorageKeys.AUDIO_DEVICE);
  }, []);

  return {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setAudioDevices,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    enableMediaDevices,
    disableWebcam,
    disableMic,
  };
};
