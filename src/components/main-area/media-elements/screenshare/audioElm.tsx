import React, { useEffect, useRef } from 'react';
import { RemoteTrackPublication } from 'livekit-client';

interface IAudioElmProps {
  track: RemoteTrackPublication;
}
const AudioElm = ({ track }: IAudioElmProps) => {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      track.audioTrack?.attach(el);
    }

    return () => {
      if (el) {
        track.audioTrack?.detach(el);
      }
    };
  }, [track]);

  return (
    <div style={{ display: 'none' }}>
      <audio autoPlay ref={ref} />
    </div>
  );
};

export default AudioElm;
