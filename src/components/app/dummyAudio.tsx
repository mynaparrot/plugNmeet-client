import { useEffect } from 'react';
import MobileDetect from 'mobile-detect';

const DUMMY_AUDIO_ID = 'plugnmeet-dummy-audio-el';

const isIOSBrowser = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const { userAgent, maxTouchPoints } = window.navigator;
  const md = new MobileDetect(userAgent);
  const os = md.os();

  const isIpadOS13Plus = /Macintosh/i.test(userAgent) && maxTouchPoints > 1;

  return os === 'iOS' || os === 'iPadOS' || isIpadOS13Plus;
};

const createEmptyAudioTrack = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const destination = audioContext.createMediaStreamDestination();

  oscillator.connect(destination);
  oscillator.start();

  const track = destination.stream.getAudioTracks()[0];

  // Disable it so it does not mix with other audio streams.
  track.enabled = false;

  const cleanup = () => {
    oscillator.stop();
    oscillator.disconnect();
    track.stop();

    void audioContext.close().catch((error) => {
      console.error('dummy audio context close failed', error);
    });
  };

  return {
    track,
    cleanup,
  };
};

/**
 * This component is a workaround for iOS audio autoplay restrictions.
 * It creates and plays a silent audio track, which helps allow programmatic
 * playback of remote audio streams from other participants.
 *
 * Without this, users on iOS devices may not hear anyone in the room.
 * It renders nothing and has no effect on non-iOS browsers.
 */
const DummyAudio = () => {
  useEffect(() => {
    if (!isIOSBrowser()) {
      return;
    }

    const existingAudioEl = document.getElementById(DUMMY_AUDIO_ID);

    if (existingAudioEl) {
      return;
    }

    const dummyAudioEl = document.createElement('audio');
    dummyAudioEl.id = DUMMY_AUDIO_ID;
    dummyAudioEl.autoplay = true;
    dummyAudioEl.hidden = true;
    dummyAudioEl.setAttribute('playsinline', 'true');
    dummyAudioEl.setAttribute('webkit-playsinline', 'true');

    const { track, cleanup } = createEmptyAudioTrack();
    const stream = new MediaStream([track]);

    dummyAudioEl.srcObject = stream;

    const playDummyAudio = () => {
      void dummyAudioEl.play().catch((error) => {
        console.error('dummy audio play failed', error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Prevent lock screen controls from showing up.
        dummyAudioEl.srcObject = null;
        return;
      }

      dummyAudioEl.srcObject = stream;
      playDummyAudio();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.body.append(dummyAudioEl);

    playDummyAudio();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      dummyAudioEl.pause();
      dummyAudioEl.srcObject = null;
      dummyAudioEl.remove();

      cleanup();
    };
  }, []);

  return null;
};

export default DummyAudio;
