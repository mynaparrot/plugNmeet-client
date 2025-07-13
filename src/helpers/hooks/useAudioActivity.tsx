import { useEffect, useState } from 'react';
import {
  AudioActivity,
  audioActivityManager,
} from '../libs/AudioActivityManager';

/**
 * A React hook that analyzes a LiveKit audio track for real-time activity
 * by subscribing to a central, performance-optimized audio manager.
 *
 * It provides speaking status and volume level without creating redundant
 * audio processing pipelines, making it efficient for many participants.
 */
export function useAudioActivity() {
  const [audioActivity, setAudioActivity] = useState<AudioActivity | undefined>(
    undefined,
  );
  const [mediaStream, setMediaStreamForActivityDetection] = useState<
    MediaStream | undefined
  >(undefined);

  useEffect(() => {
    if (!mediaStream) {
      // If there's no track, ensure the state is reset.
      setAudioActivity(undefined);
      return;
    }

    // The callback function that the manager will call with updates.
    // We pass our state setter directly to the manager.
    const onActivityUpdate = (activity: AudioActivity) => {
      setAudioActivity(activity);
    };

    // Subscribe the track to the central manager.
    audioActivityManager.addStream(mediaStream, onActivityUpdate);

    // The cleanup function is returned from useEffect.
    // It's called when the `track` dependency changes or the component unmounts.
    return () => {
      audioActivityManager.removeStream(mediaStream.id);
      // Reset the state when the track is removed to clear the UI.
      setAudioActivity(undefined);
    };
  }, [mediaStream]);

  return { audioActivity, setMediaStreamForActivityDetection };
}
