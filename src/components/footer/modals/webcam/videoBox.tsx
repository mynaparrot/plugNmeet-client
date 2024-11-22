import React, { useRef, useEffect, SyntheticEvent } from 'react';
import { SourcePlayback } from '../../../virtual-background/helpers/sourceHelper';

interface IVideoBoxProps {
  deviceId: string;
  onSourcePlayback: (sourcePlayback: SourcePlayback) => void;
  onMediaStream: (mediaStream: MediaStream) => void;
}
const VideoBox = ({
  deviceId,
  onSourcePlayback,
  onMediaStream,
}: IVideoBoxProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId,
      },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
      if (el) {
        onMediaStream(mediaStream);
        el.srcObject = mediaStream;
      }
    });
    return () => {
      if (el) {
        el.pause();
        el.removeAttribute('src'); // empty source
      }
    };
    // eslint-disable-next-line
  }, [deviceId]);

  const handleVideoLoad = (event: SyntheticEvent) => {
    const video = event.target as HTMLVideoElement;
    onSourcePlayback({
      htmlElement: video,
      width: video.videoWidth ?? 330,
      height: video.videoHeight ?? 200,
    });
  };

  return (
    <div className="preview-camera-webcam flex h-full w-full">
      <video
        className="w-full h-full object-cover"
        ref={ref}
        autoPlay
        height="50"
        onLoadedData={handleVideoLoad}
      />
    </div>
  );
};

export default VideoBox;
