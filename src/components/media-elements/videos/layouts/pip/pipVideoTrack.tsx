import { useEffect, useRef, useState } from 'react';
import { TrackEvent, VideoTrack } from 'livekit-client';
import { generateAvatarInitial } from '../../../../../helpers/utils';

interface IPipVideoTrackProps {
  videoTrack?: VideoTrack;
  name: string;
}

const PipVideoTrack = ({ videoTrack, name }: IPipVideoTrackProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraMuted, setIsCameraMuted] = useState(
    () => videoTrack?.isMuted ?? true,
  );

  useEffect(() => {
    if (!videoTrack) {
      setIsCameraMuted(true);
      return;
    }

    setIsCameraMuted(videoTrack.isMuted);

    const handleMuted = () => setIsCameraMuted(true);
    const handleUnmuted = () => setIsCameraMuted(false);

    videoTrack.on(TrackEvent.Muted, handleMuted);
    videoTrack.on(TrackEvent.Unmuted, handleUnmuted);

    return () => {
      videoTrack.off(TrackEvent.Muted, handleMuted);
      videoTrack.off(TrackEvent.Unmuted, handleUnmuted);
    };
  }, [videoTrack]);

  useEffect(() => {
    const videoElm = videoRef.current;

    if (!videoElm || !videoTrack || isCameraMuted) return;

    videoTrack.attach(videoElm);

    return () => {
      videoTrack.detach(videoElm);
    };
  }, [videoTrack, isCameraMuted]);

  if (!videoTrack || isCameraMuted) {
    return (
      <div className="pip-video-fallback">
        <span>{generateAvatarInitial(name || '')}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      title={name}
      className="pip-video-item"
      autoPlay
      playsInline
      muted
    />
  );
};

export default PipVideoTrack;
