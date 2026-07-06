import { useEffect, useRef } from 'react';
import { VideoTrack } from 'livekit-client';

interface IPipVideoTrackProps {
  videoTrack?: VideoTrack;
  name: string;
  isCameraMuted?: boolean;
}

const PipVideoTrack = ({
  videoTrack,
  name,
  isCameraMuted,
}: IPipVideoTrackProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        <span>{name || 'Participant'}</span>
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
