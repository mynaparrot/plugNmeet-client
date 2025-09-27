import { useCallback, useState } from 'react';
import { IMediaDevice } from '../../../store/slices/interfaces/roomSettings';
import {
  getInputMediaDevices,
  inputMediaDeviceKind,
} from '../../../helpers/utils';

export const useMediaDevices = () => {
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
        }
      }
      if (
        inputDevices.video.length > 0 &&
        (kind === 'both' || kind === 'video')
      ) {
        setVideoDevices(inputDevices.video);
        if (!selectedVideoDevice) {
          setSelectedVideoDevice(inputDevices.video[0].id);
        }
      }
    },
    [selectedAudioDevice, selectedVideoDevice],
  );

  const disableWebcam = useCallback(() => {
    setVideoDevices([]);
    setSelectedVideoDevice('');
  }, []);

  const disableMic = useCallback(() => {
    setAudioDevices([]);
    setSelectedAudioDevice('');
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
