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

export const useMediaDevices = () => {
  const dispatch = useAppDispatch();
  const [audioDevices, setAudioDevices] = useState<IMediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<IMediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');

  const enableMediaDevices = useCallback(
    async (kind: inputMediaDeviceKind = 'both') => {
      const inputDevices = await getInputMediaDevices(kind);

      if (
        inputDevices.audio.length > 0 &&
        (kind === 'both' || kind === 'audio')
      ) {
        setAudioDevices(inputDevices.audio);
        if (!selectedAudioDevice) {
          setSelectedAudioDevice(inputDevices.audio[0].id);
        } else if (
          !inputDevices.audio.some(
            (device) => device.id === selectedAudioDevice,
          )
        ) {
          // remembered device is no longer available; fall back to the first one
          setSelectedAudioDevice(inputDevices.audio[0].id);
        }
      }
      if (
        inputDevices.video.length > 0 &&
        (kind === 'both' || kind === 'video')
      ) {
        setVideoDevices(inputDevices.video);
        if (!selectedVideoDevice) {
          setSelectedVideoDevice(inputDevices.video[0].id);
        } else if (
          !inputDevices.video.some(
            (device) => device.id === selectedVideoDevice,
          )
        ) {
          // remembered device is no longer available; fall back to the first one
          setSelectedVideoDevice(inputDevices.video[0].id);
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
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    enableMediaDevices,
    disableWebcam,
    disableMic,
  };
};
