import { useEffect } from 'react';
import MobileDetect from 'mobile-detect';

const getBrowser = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const md = new MobileDetect(window.navigator.userAgent);
  const os = md.os();
  // This is to detect iPad on iPadOS 13+
  if (
    os === 'iOS' ||
    os === 'iPadOS' ||
    (/Macintosh/i.test(navigator.userAgent) &&
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 1)
  ) {
    return 'iOS';
  }

  return;
};

const getEmptyAudioStreamTrack = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const destination = ctx.createMediaStreamDestination();
  oscillator.connect(destination);
  oscillator.start();
  const track = destination.stream.getAudioTracks()[0];
  // we need to disable it, otherwise it will be mixed with other audio streams.
  track.enabled = false;
  return track;
};

/**
 * This component is a workaround for iOS audio autoplay restrictions.
 * It creates and plays a silent audio track, which "tricks" the browser
 * into allowing programmatic playback of remote audio streams from other
 * participants. Without this, users on iOS devices may not hear anyone
 * in the room. It renders nothing and has no effect on non-iOS browsers.
 */
const DummyAudio = () => {
  useEffect(() => {
    const browser = getBrowser();
    if (browser !== 'iOS') {
      return;
    }

    const audioId = 'plugnmeet-dummy-audio-el';
    let dummyAudioEl = document.getElementById(
      audioId,
    ) as HTMLAudioElement | null;
    if (dummyAudioEl) {
      return;
    }

    dummyAudioEl = document.createElement('audio');
    dummyAudioEl.id = audioId;
    dummyAudioEl.autoplay = true;
    dummyAudioEl.hidden = true;

    const emptyTrack = getEmptyAudioStreamTrack();

    const stream = new MediaStream([emptyTrack]);
    dummyAudioEl.srcObject = stream;

    const onVisibilityChange = () => {
      if (!dummyAudioEl) return;
      // set the srcObject to null on page hide to prevent lock screen controls from showing up
      dummyAudioEl.srcObject = document.hidden ? null : stream;
      if (!document.hidden) {
        // play to resume playback
        dummyAudioEl
          .play()
          .catch((e) => console.error('dummy audio play failed', e));
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.body.append(dummyAudioEl);

    // cleanup
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      dummyAudioEl?.remove();
      emptyTrack.stop();
    };
  }, []);

  return null;
};

export default DummyAudio;
